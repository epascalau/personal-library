/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vanilla replacement for `context/BackendContext.tsx`.
 *
 * The store owns the adapter *configuration*; it never invokes the adapter
 * directly. All traffic goes through the typed `backendBus` via
 * `BackendGateway`, so the store only has to publish requests and react to the
 * correlated result events.
 */

import { Store } from '../core/store';
import {
  BackendConfig,
  BackendGateway,
  BackendHealthResult,
  BACKEND_PRESETS,
  backendBus,
  createBackendAdapter,
  loadSavedBackendConfig,
  requestBackend,
  saveBackendConfig
} from '../services/backend';
import type { BackendAdapter } from '../services/backend';

const HEALTH_POLL_INTERVAL_MS = 30000;

export interface BackendState {
  config: BackendConfig;
  adapter: BackendAdapter;
  healthStatus: BackendHealthResult | null;
  isTestingHealth: boolean;
}

class BackendStore extends Store<BackendState> {
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  /** Guards against a slow in-flight probe overwriting a newer adapter's status. */
  private healthToken = 0;

  private readonly gateway: BackendGateway;

  constructor() {
    const config = loadSavedBackendConfig();
    super({
      config,
      adapter: createBackendAdapter(config),
      healthStatus: null,
      isTestingHealth: false
    });

    // The gateway resolves the adapter lazily, so switching presets takes
    // effect for the very next request without re-wiring any subscription.
    this.gateway = new BackendGateway(() => this.state.adapter);
  }

  get adapter(): BackendAdapter {
    return this.state.adapter;
  }

  get config(): BackendConfig {
    return this.state.config;
  }

  /** Starts the gateway, the initial probe and the recurring 30s health poll. */
  start(): void {
    this.gateway.start();
    if (this.pollTimer !== null) {
      return;
    }
    void this.testConnection();
    this.pollTimer = setInterval(() => {
      void this.testConnection();
    }, HEALTH_POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.gateway.stop();
  }

  updateConfig(newConfig: BackendConfig): void {
    saveBackendConfig(newConfig);
    // A new adapter invalidates any probe that is still in flight.
    this.healthToken += 1;
    this.setState({
      config: newConfig,
      adapter: createBackendAdapter(newConfig),
      healthStatus: null,
      isTestingHealth: false
    });
    backendBus.publish('backend:adapter:changed', { config: newConfig });
    void this.testConnection();
  }

  switchPreset(presetKey: keyof typeof BACKEND_PRESETS): void {
    const preset = BACKEND_PRESETS[presetKey];
    if (preset) {
      this.updateConfig(preset);
    }
  }

  async testConnection(): Promise<BackendHealthResult> {
    const token = (this.healthToken += 1);
    this.setState({ isTestingHealth: true });

    let health: BackendHealthResult;
    try {
      health = await requestBackend('testHealth', {});
    } catch (err: any) {
      health = {
        ok: false,
        latencyMs: 0,
        message: err?.message || 'Unknown network error'
      };
    }

    if (token === this.healthToken) {
      this.setState({ healthStatus: health, isTestingHealth: false });
      backendBus.publish('backend:health:changed', { health });
    }
    return health;
  }
}

export const backendStore = new BackendStore();
