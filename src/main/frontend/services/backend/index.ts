import { BackendAdapter, BackendConfig, BackendType } from './types';
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
    timeoutMs: 180000 // 3 minutes for upload and dual-model AI indexing
  },
  springBootDirect: {
    type: 'spring-boot',
    name: 'Direct Java Spring Boot (http://localhost:8080/api/v1)',
    baseUrl: 'http://localhost:8080/api/v1',
    timeoutMs: 180000
  },
  mock: {
    type: 'mock',
    name: 'Local Standalone Engine (Offline / In-Memory)',
    baseUrl: 'local://offline',
    timeoutMs: 10000
  }
};

const STORAGE_KEY = 'personal_library_backend_config';

export function loadSavedBackendConfig(): BackendConfig {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Ensure timeoutMs is at least 180,000ms (3 minutes) for uploads and LLM operations
      if (!parsed.timeoutMs || parsed.timeoutMs < 180000) {
        parsed.timeoutMs = 180000;
      }
      return parsed;
    } catch (_) {
      // ignore
    }
  }
  return BACKEND_PRESETS.integrated;
}

export function saveBackendConfig(config: BackendConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export function createBackendAdapter(config: BackendConfig): BackendAdapter {
  if (config.type === 'mock') {
    return new MockBackendAdapter(config);
  }
  return new RestBackendAdapter(config);
}
