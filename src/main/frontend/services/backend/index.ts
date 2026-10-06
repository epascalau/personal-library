/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Backend adapter factory, configuration persistence, and preset definitions.
 * Provides initialization logic for swappable REST, Spring Boot, and local Mock adapters.
 */

import { BackendAdapter, BackendConfig, BackendType, LLM_TIMEOUT_MS } from './types';
import { RestBackendAdapter } from './RestBackendAdapter';
import { MockBackendAdapter } from './MockBackendAdapter';

export * from './types';
export * from './events';
export * from './BackendGateway';
export { RestBackendAdapter } from './RestBackendAdapter';
export { MockBackendAdapter } from './MockBackendAdapter';

export const BACKEND_PRESETS: Record<string, BackendConfig> = {
  integrated: {
    type: 'rest',
    name: 'Integrated Gateway (/api/v1)',
    baseUrl: '/api/v1',
    timeoutMs: LLM_TIMEOUT_MS // 10 minutes for upload and dual-model AI indexing on local Ollama
  },
  springBootDirect: {
    type: 'spring-boot',
    name: 'Direct Java Spring Boot (http://localhost:8080/api/v1)',
    baseUrl: 'http://localhost:8080/api/v1',
    timeoutMs: LLM_TIMEOUT_MS
  },
  mock: {
    type: 'mock',
    name: 'Local Standalone Engine (Offline / In-Memory)',
    baseUrl: 'local://offline',
    timeoutMs: 10000
  }
};

const STORAGE_KEY = 'personal_library_backend_config';

/**
 * Loads the persisted backend adapter configuration from browser localStorage.
 *
 * WHAT:
 * Reads `STORAGE_KEY` from localStorage, parses JSON, enforces a minimum `LLM_TIMEOUT_MS` timeout
 * for long-running LLM and RAG indexing tasks, and falls back to `BACKEND_PRESETS.springBootDirect`.
 *
 * WHY:
 * 1. Continuity: Retains user preference across browser refreshes (e.g. developing directly against `:8080`).
 * 2. Fault tolerance: Enforcing a generous minimum timeout prevents client-side aborts while local,
 * CPU-bound Ollama inference performs heavy document chunking and dual-model summarization.
 *
 * @returns Configured BackendConfig object.
 */
export function loadSavedBackendConfig(): BackendConfig {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Ensure timeoutMs is at least LLM_TIMEOUT_MS for uploads and LLM operations
      if (!parsed.timeoutMs || parsed.timeoutMs < LLM_TIMEOUT_MS) {
        parsed.timeoutMs = LLM_TIMEOUT_MS;
      }
      return parsed;
    } catch (_) {
      // ignore
    }
  }
  return BACKEND_PRESETS.springBootDirect;
}

/**
 * Persists the chosen backend adapter configuration to browser localStorage.
 *
 * WHAT: Serializes `config` as JSON and writes to `STORAGE_KEY`.
 * WHY: Ensures user-customized API endpoints, authentication bearer tokens, and timeout values
 * persist across page navigation and app reloads.
 *
 * @param config Backend configuration to save.
 */
export function saveBackendConfig(config: BackendConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/**
 * Factory function creating a concrete `BackendAdapter` implementation for the specified configuration.
 *
 * WHAT:
 * Returns an instance of `MockBackendAdapter` if `config.type === 'mock'`, otherwise returns `RestBackendAdapter`.
 *
 * WHY:
 * The Adapter design pattern cleanly decouples the UI layer from the network implementation.
 * Views and stores invoke standard adapter methods without needing to know whether the target
 * is an in-memory browser store, a local proxy, or an enterprise Kubernetes cluster.
 *
 * @param config Backend configuration.
 * @returns Instantiated BackendAdapter.
 */
export function createBackendAdapter(config: BackendConfig): BackendAdapter {
  if (config.type === 'mock') {
    return new MockBackendAdapter(config);
  }
  return new RestBackendAdapter(config);
}
