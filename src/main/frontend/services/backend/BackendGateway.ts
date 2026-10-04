/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
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
   * Constructs the backend gateway with a dynamic adapter resolver function.
   *
   * WHAT: Accepts a getter function `resolveAdapter: () => BackendAdapter`.
   * WHY: Resolving the adapter lazily at request execution time ensures that when the user
   * switches environment configurations (e.g. from Integrated Mock to Spring Boot :8080),
   * the very next dispatched request automatically routes to the new adapter without needing
   * to rebuild event bus listeners or restart subscribers.
   *
   * @param resolveAdapter Callback returning the currently active backend adapter.
   */
  constructor(private readonly resolveAdapter: () => BackendAdapter) {}

  /**
   * Subscribes the gateway to all backend request topics on the event bus.
   *
   * WHAT: Iterates `BACKEND_OPERATION_NAMES`, registers request event listeners, and stores disposers.
   * WHY: Centralizes request consumption so all business operations (documents, uploads, auth, summaries)
   * funnel through a uniform pipeline that handles telemetry, error normalization, and timing.
   */
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

  /**
   * Unsubscribes all event bus listeners and halts request handling.
   *
   * WHAT: Executes and clears all stored disposer callbacks.
   * WHY: Prevents dangling event listeners when tearing down environments or in automated tests.
   */
  stop(): void {
    this.disposers.forEach((dispose) => dispose());
    this.disposers.length = 0;
  }

  /**
   * Executes a received request envelope against the active adapter and publishes the outcome.
   *
   * WHAT:
   * 1. Emits `backend:request:started` telemetry event.
   * 2. Measures roundtrip latency using high-resolution `performance.now()`.
   * 3. Invokes the matching method on the active adapter.
   * 4. Publishes a correlated success envelope on success, or normalizes errors via `toBackendError`
   *    and publishes a failure envelope on failure.
   * 5. Emits `backend:request:settled` event with final duration.
   *
   * WHY: Standardizes response timing, correlation ID routing, and error classification across
   * all operations, ensuring UI components receive consistent error messages regardless of whether
   * an error originated in a fetch network failure or a backend HTTP 500.
   *
   * @param envelope Request envelope containing requestId, operation name, and payload.
   */
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
 * Dispatches an operation across the backend event bus and awaits its correlated reply.
 *
 * WHAT:
 * 1. Generates a unique correlation `requestId`.
 * 2. Sets up temporary, one-shot event bus subscriptions for success and failure matching the `requestId`.
 * 3. Publishes the request envelope onto the bus.
 * 4. Resolves or rejects the returned promise and cleans up temporary listeners immediately.
 *
 * WHY:
 * Combines the architectural decoupling of an event-driven architecture with the developer ergonomics
 * of standard async/await code. Callers write `await requestBackend('getDocuments', ...)` while
 * the entire message passes through the observable, swappable event bus.
 *
 * @param operation Name of the backend operation.
 * @param request Typed request arguments.
 * @returns Promise resolving to the typed operation response.
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
 * Dispatches a fire-and-forget request on the event bus without awaiting the result.
 *
 * WHAT: Generates a `requestId`, publishes the request envelope, and immediately returns the ID.
 * WHY: Useful for asynchronous background triggers (such as telemetry, prefetching, or heartbeat pings)
 * where the calling code does not need to block on the response.
 *
 * @param operation Name of the backend operation.
 * @param request Typed request payload.
 * @returns The unique correlation requestId generated for this request.
 */
export const dispatchBackend = <K extends BackendOperationName>(
  operation: K,
  request: BackendRequestOf<K>
): string => {
  const requestId = createRequestId(operation);
  publishRequest({ requestId, operation, request } as BackendRequestEnvelope);
  return requestId;
};
