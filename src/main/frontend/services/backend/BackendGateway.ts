/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bridges the typed backend event bus to the concrete `BackendAdapter`.
 *
 * Views and stores never call the adapter directly: they publish a
 * `backend:<operation>:request` event, and the gateway answers with a
 * correlated `…:success` or `…:failure` event. Swapping the adapter (gateway,
 * Spring Boot, offline mock) therefore has no effect on any call site.
 */

import type { Unsubscribe } from '../../core/eventBus';
import {
  BackendError,
  BackendFailureEnvelope,
  BackendOperationName,
  BackendRequestEnvelope,
  BackendRequestOf,
  BackendResponseOf,
  BackendSuccessEnvelope,
  backendBus,
  createRequestId,
  failureEventName,
  requestEventName,
  successEventName,
  toBackendError
} from './events';
import { BackendAdapter } from './types';

type Invoker<K extends BackendOperationName> = (
  adapter: BackendAdapter,
  request: BackendRequestOf<K>
) => Promise<BackendResponseOf<K>>;

/**
 * The only place that knows how an operation name maps onto an adapter method.
 */
const invokers: { [K in BackendOperationName]: Invoker<K> } = {
  getDocuments: (adapter, request) => adapter.getDocuments(request),
  getDocument: (adapter, request) => adapter.getDocument(request.guid),
  uploadDocument: (adapter, request) => adapter.uploadDocument(request),
  overwriteVersion: (adapter, { guid, ...payload }) => adapter.overwriteVersion(guid, payload),
  deleteDocument: (adapter, request) => adapter.deleteDocument(request.guid),
  regenerateSummary: (adapter, request) => adapter.regenerateSummary(request.guid, request.modelKey),
  chatWithDocument: (adapter, request) =>
    adapter.chatWithDocument(request.guid, request.question, request.chatHistory),
  extractMetadata: (adapter, request) =>
    adapter.extractMetadata(request.fileName, request.sampleContent, request.fileData, request.mimeType),
  login: (adapter, request) => adapter.login(request.username, request.password, request.realm),
  logout: (adapter) => adapter.logout(),
  getOpenApiSpec: (adapter) => adapter.getOpenApiSpec(),
  testHealth: (adapter) => adapter.testHealth()
};

export const BACKEND_OPERATION_NAMES = Object.keys(invokers) as BackendOperationName[];

/**
 * TypeScript cannot correlate the members of a union of envelopes with the
 * matching invoker, so the dispatch itself is funnelled through these two
 * narrow, deliberately unchecked helpers. Everything the rest of the
 * application touches stays fully typed.
 */
const invoke = (
  operation: BackendOperationName,
  adapter: BackendAdapter,
  request: unknown
): Promise<unknown> =>
  (invokers[operation] as (a: BackendAdapter, r: unknown) => Promise<unknown>)(adapter, request);

const publishSettled = (
  eventName: string,
  envelope: BackendSuccessEnvelope | BackendFailureEnvelope
): void => {
  (backendBus.publish as (name: string, payload: unknown) => void)(eventName, envelope);
};

/**
 * `PublishArgs` stays unresolved while the operation name is still generic, so
 * the request publication is funnelled through this single cast as well.
 */
const publishRequest = (envelope: BackendRequestEnvelope): void => {
  (backendBus.publish as (name: string, payload: unknown) => void)(
    requestEventName(envelope.operation),
    envelope
  );
};

export class BackendGateway {
  private readonly disposers: Unsubscribe[] = [];

  /**
   * @param resolveAdapter Returns the adapter that is active *at the moment a
   * request is handled*, so a preset switch takes effect immediately.
   */
  constructor(private readonly resolveAdapter: () => BackendAdapter) {}

  start(): void {
    if (this.disposers.length > 0) {
      return;
    }
    BACKEND_OPERATION_NAMES.forEach((operation) => {
      this.disposers.push(
        backendBus.subscribe(requestEventName(operation), (envelope) => {
          void this.execute(envelope as BackendRequestEnvelope);
        })
      );
    });
  }

  stop(): void {
    this.disposers.forEach((dispose) => dispose());
    this.disposers.length = 0;
  }

  private async execute(envelope: BackendRequestEnvelope): Promise<void> {
    const { requestId, operation, request } = envelope;
    const startedAt = performance.now();

    backendBus.publish('backend:request:started', { requestId, operation });

    try {
      const result = await invoke(operation, this.resolveAdapter(), request);
      const durationMs = performance.now() - startedAt;

      publishSettled(successEventName(operation), {
        requestId,
        operation,
        request,
        result,
        durationMs
      } as BackendSuccessEnvelope);

      backendBus.publish('backend:request:settled', {
        requestId,
        operation,
        ok: true,
        durationMs
      });
    } catch (err) {
      const durationMs = performance.now() - startedAt;
      const error: BackendError = toBackendError(err);

      publishSettled(failureEventName(operation), {
        requestId,
        operation,
        request,
        error,
        durationMs
      } as BackendFailureEnvelope);

      backendBus.publish('backend:request:settled', {
        requestId,
        operation,
        ok: false,
        durationMs
      });
    }
  }
}

/**
 * Promise facade over the request/response event pair.
 *
 * Communication still flows entirely through the bus — this only correlates
 * the reply for call sites that read like ordinary async code.
 */
export const requestBackend = <K extends BackendOperationName>(
  operation: K,
  request: BackendRequestOf<K>
): Promise<BackendResponseOf<K>> => {
  const requestId = createRequestId(operation);

  return new Promise<BackendResponseOf<K>>((resolve, reject) => {
    const disposers: Unsubscribe[] = [];
    const cleanup = (): void => disposers.forEach((dispose) => dispose());

    disposers.push(
      backendBus.subscribe(successEventName(operation), (envelope) => {
        if (envelope.requestId !== requestId) {
          return;
        }
        cleanup();
        resolve(envelope.result as BackendResponseOf<K>);
      })
    );

    disposers.push(
      backendBus.subscribe(failureEventName(operation), (envelope) => {
        if (envelope.requestId !== requestId) {
          return;
        }
        cleanup();
        const error = new Error(envelope.error.message);
        if (envelope.error.cause !== undefined) {
          (error as Error & { cause?: unknown }).cause = envelope.error.cause;
        }
        reject(error);
      })
    );

    publishRequest({ requestId, operation, request } as BackendRequestEnvelope);
  });
};

/**
 * Fire-and-forget variant: publishes the request and returns its correlation
 * id so the caller can observe the outcome through the bus.
 */
export const dispatchBackend = <K extends BackendOperationName>(
  operation: K,
  request: BackendRequestOf<K>
): string => {
  const requestId = createRequestId(operation);
  publishRequest({ requestId, operation, request } as BackendRequestEnvelope);
  return requestId;
};
