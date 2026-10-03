/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Typed event contract for all communication with the backend.
 *
 * Every adapter operation is declared once in {@link BackendOperations}; the
 * request / success / failure event names and their payload types are then
 * derived from it. Adding a backend operation therefore only requires one new
 * entry here plus its invoker in `BackendGateway`.
 */

import { createEventBus } from '../../core/eventBus';
import {
  BibTeXMetadata,
  DocumentRecord,
  FilterState,
  SummaryRecord,
  UserProfile
} from '../../types';
import {
  BackendConfig,
  BackendHealthResult,
  ChatResponseResult,
  DocumentListResult
} from './types';

/**
 * Maps each backend operation to its request and response payload types.
 * These mirror the `BackendAdapter` contract exactly.
 */
export interface BackendOperations {
  getDocuments: {
    request: {
      page: number;
      pageSize: number;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
      filters: FilterState;
    };
    response: DocumentListResult;
  };

  getDocument: {
    request: { guid: string };
    response: DocumentRecord;
  };

  uploadDocument: {
    request: {
      file: File;
      fileName: string;
      fileFormat: string;
      fileSize: number;
      fileContent?: string;
      fileData?: string;
      mimeType?: string;
      bibtex: BibTeXMetadata;
    };
    response: DocumentRecord;
  };

  overwriteVersion: {
    request: {
      guid: string;
      file?: File | null;
      fileName?: string;
      fileFormat?: string;
      fileSize?: number;
      fileContent?: string;
      fileData?: string;
      mimeType?: string;
      bibtex?: BibTeXMetadata;
    };
    response: DocumentRecord;
  };

  deleteDocument: {
    request: { guid: string };
    response: { success: boolean; message: string };
  };

  regenerateSummary: {
    request: { guid: string; modelKey: 'llama' | 'mistral' };
    response: SummaryRecord;
  };

  chatWithDocument: {
    request: {
      guid: string;
      question: string;
      chatHistory?: { role: string; text: string }[];
    };
    response: ChatResponseResult;
  };

  extractMetadata: {
    request: {
      fileName: string;
      sampleContent?: string;
      fileData?: string;
      mimeType?: string;
    };
    response: BibTeXMetadata & { extractedText?: string };
  };

  login: {
    request: { username: string; password?: string; realm?: string };
    response: { accessToken: string; user: UserProfile };
  };

  logout: {
    request: Record<string, never>;
    response: void;
  };

  getOpenApiSpec: {
    request: Record<string, never>;
    response: string;
  };

  testHealth: {
    request: Record<string, never>;
    response: BackendHealthResult;
  };
}

export type BackendOperationName = keyof BackendOperations & string;

export type BackendRequestOf<K extends BackendOperationName> = BackendOperations[K]['request'];
export type BackendResponseOf<K extends BackendOperationName> = BackendOperations[K]['response'];

/** Normalised failure payload; adapters reject with plain `Error` instances. */
export interface BackendError {
  message: string;
  /** The original rejection value, for logging and debugging. */
  cause?: unknown;
}

export interface BackendRequestEnvelope<K extends BackendOperationName = BackendOperationName> {
  /** Correlates a request with its success / failure event. */
  requestId: string;
  operation: K;
  request: BackendRequestOf<K>;
}

export interface BackendSuccessEnvelope<K extends BackendOperationName = BackendOperationName>
  extends BackendRequestEnvelope<K> {
  result: BackendResponseOf<K>;
  durationMs: number;
}

export interface BackendFailureEnvelope<K extends BackendOperationName = BackendOperationName>
  extends BackendRequestEnvelope<K> {
  error: BackendError;
  durationMs: number;
}

type BackendRequestEvents = {
  [K in BackendOperationName as `backend:${K}:request`]: BackendRequestEnvelope<K>;
};

type BackendSuccessEvents = {
  [K in BackendOperationName as `backend:${K}:success`]: BackendSuccessEnvelope<K>;
};

type BackendFailureEvents = {
  [K in BackendOperationName as `backend:${K}:failure`]: BackendFailureEnvelope<K>;
};

/** Cross-cutting events that are not tied to a single operation. */
export interface BackendLifecycleEvents {
  /** Fired for every request, regardless of operation — useful for busy state. */
  'backend:request:started': { requestId: string; operation: BackendOperationName };
  'backend:request:settled': {
    requestId: string;
    operation: BackendOperationName;
    ok: boolean;
    durationMs: number;
  };
  /** The active adapter was swapped (preset switch or custom configuration). */
  'backend:adapter:changed': { config: BackendConfig };
  /** A health probe completed. */
  'backend:health:changed': { health: BackendHealthResult };
}

export type BackendEvents = BackendRequestEvents &
  BackendSuccessEvents &
  BackendFailureEvents &
  BackendLifecycleEvents;

export type BackendRequestEventName = `backend:${BackendOperationName}:request`;
export type BackendSuccessEventName = `backend:${BackendOperationName}:success`;
export type BackendFailureEventName = `backend:${BackendOperationName}:failure`;

/** The single bus through which the UI talks to the backend. */
export const backendBus = createEventBus<BackendEvents>('backend');

export const requestEventName = <K extends BackendOperationName>(operation: K): `backend:${K}:request` =>
  `backend:${operation}:request`;

export const successEventName = <K extends BackendOperationName>(operation: K): `backend:${K}:success` =>
  `backend:${operation}:success`;

export const failureEventName = <K extends BackendOperationName>(operation: K): `backend:${K}:failure` =>
  `backend:${operation}:failure`;

let requestCounter = 0;

export const createRequestId = (operation: BackendOperationName): string => {
  requestCounter += 1;
  const unique =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${operation}#${requestCounter}#${unique}`;
};

export const toBackendError = (value: unknown): BackendError => {
  if (value instanceof Error) {
    return { message: value.message, cause: value };
  }
  if (typeof value === 'string' && value) {
    return { message: value, cause: value };
  }
  return { message: 'Unknown backend error', cause: value };
};
