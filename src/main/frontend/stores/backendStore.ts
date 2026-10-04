/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
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

  /**
   * Initializes the backend store by loading persisted configuration and constructing the initial adapter.
   *
   * WHAT: Reads configuration from `localStorage` (defaulting to the integrated `/api/v1` gateway),
   * instantiates the corresponding `BackendAdapter`, and attaches the event-driven `BackendGateway`.
   * WHY: Passing a lazy adapter getter `() => this.state.adapter` to `BackendGateway` decouples
   * request dispatching from adapter lifecycles; when the user switches to a remote Spring Boot
   * instance, the gateway immediately routes subsequent requests through the new adapter without
   * requiring subscription re-wiring.
   */
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

  /**
   * Accessor for the active backend adapter instance.
   *
   * WHAT: Returns the currently instantiated adapter (RestBackendAdapter or MockBackendAdapter).
   * WHY: Enables components that need direct adapter inspection (e.g. settings modals) to query capabilities.
   */
  get adapter(): BackendAdapter {
    return this.state.adapter;
  }

  /**
   * Accessor for the current backend configuration.
   *
   * WHAT: Returns the active `BackendConfig` record.
   * WHY: Provides read access to active endpoint URL, adapter type, and custom headers.
   */
  get config(): BackendConfig {
    return this.state.config;
  }

  /**
   * Activates the gateway dispatcher, runs an immediate health probe, and starts recurring 30s polling.
   *
   * WHAT: Starts `this.gateway`, fires `testConnection()`, and sets up an interval timer.
   * WHY: Continuous health probing detects backend disconnections or Ollama model availability issues
   * early, ensuring the UI status pill reflects live server health.
   */
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

  /**
   * Stops the health polling timer and tears down the backend gateway event listeners.
   *
   * WHAT: Clears `this.pollTimer` and invokes `this.gateway.stop()`.
   * WHY: Ensures clean application shutdown and prevents timer leaks during test teardowns.
   */
  stop(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.gateway.stop();
  }

  /**
   * Updates the backend runtime configuration and re-instantiates the adapter.
   *
   * WHAT:
   * 1. Persists the new configuration to `localStorage`.
   * 2. Increments `healthToken` to invalidate any in-flight probes from the previous adapter.
   * 3. Instantiates the new adapter and updates state.
   * 4. Publishes `backend:adapter:changed` on the event bus to notify catalog views.
   * 5. Runs an immediate connection probe against the new endpoint.
   *
   * WHY: Centralizing adapter swaps guarantees atomic transition; all in-flight probes
   * for the previous endpoint are ignored, and consumers immediately receive the new adapter.
   *
   * @param newConfig Updated configuration record.
   */
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

  /**
   * Applies one of the standard pre-configured backend presets (Integrated Gateway, Spring Boot, or Mock).
   *
   * WHAT: Looks up preset by key and passes it to `updateConfig`.
   * WHY: Provides convenient one-click environment switching for enterprise developers.
   *
   * @param presetKey Identifier of the preset to activate.
   */
  switchPreset(presetKey: keyof typeof BACKEND_PRESETS): void {
    const preset = BACKEND_PRESETS[presetKey];
    if (preset) {
      this.updateConfig(preset);
    }
  }

  /**
   * Executes a health probe against the current backend adapter and measures latency.
   *
   * WHAT: Dispatches `testHealth` via `requestBackend`, catches any network errors, and updates `healthStatus`.
   * WHY: Uses a monotonic `healthToken` concurrency guard. If the user rapidly switches from
   * a slow remote server to a fast local mock, late-arriving timeout errors from the previous
   * probe cannot overwrite the healthy status of the newly selected mock adapter.
   *
   * @returns Promise resolving to the measured health result.
   */
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
