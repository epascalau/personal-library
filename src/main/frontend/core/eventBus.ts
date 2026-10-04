/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * A small, fully type-safe event bus.
 *
 * The event name and its payload type are bound together through an
 * `EventsDefinition` map, so it is impossible to publish an event with the
 * wrong payload or to subscribe with a mistyped handler. Events declared with
 * a `void` payload must be published without any payload at all.
 *
 * The bus itself is backed by a detached `Comment` node, which is a real
 * `EventTarget` but is never part of the rendered document.
 */

/**
 * Any object whose keys are event names. Deliberately not
 * `Record<string, unknown>`: that would reject plain interfaces and derived
 * mapped types, which lack an index signature.
 */
export type EventsDefinition = object;

export type Unsubscribe = () => void;

/**
 * Builds the argument tuple for `publish`, dropping the payload parameter
 * entirely when the event is declared as `void`.
 */
type PublishArgs<TEvents extends EventsDefinition, K extends keyof TEvents & string> =
  TEvents[K] extends void ? [eventName: K] : [eventName: K, payload: TEvents[K]];

export interface TypedEventBus<TEvents extends EventsDefinition> {
  publish<K extends keyof TEvents & string>(...args: PublishArgs<TEvents, K>): void;
  subscribe<K extends keyof TEvents & string>(
    eventName: K,
    handler: (payload: TEvents[K]) => void
  ): Unsubscribe;
  once<K extends keyof TEvents & string>(
    eventName: K,
    handler: (payload: TEvents[K]) => void
  ): Unsubscribe;
  /** Resolves with the payload of the next occurrence of `eventName`. */
  next<K extends keyof TEvents & string>(eventName: K): Promise<TEvents[K]>;
}

/**
 * Factory function that instantiates a strongly-typed pub/sub event bus.
 *
 * WHAT: Creates a decoupled event dispatcher where message topics and payload schemas
 * are strictly constrained by the generic interface `TEvents`.
 * WHY:
 * 1. Detached `Comment` node as EventTarget: Using `document.createComment` creates a lightweight,
 *    browser-native `EventTarget` that supports standard `dispatchEvent` and `addEventListener`.
 *    Because the Comment node is detached and never attached to the document body, dispatched events
 *    are fully isolated and cannot bubble into the global window or leak into other DOM trees.
 * 2. Type-safety: Enforces compile-time checks on event names and prevents mismatches between
 *    published payloads and subscriber expectations.
 *
 * @param busName Informative label used to identify the bus in DOM profiling.
 * @returns Strongly-typed event bus object providing publish, subscribe, once, and next.
 */
export const createEventBus = <TEvents extends EventsDefinition>(
  busName: string
): TypedEventBus<TEvents> => {
  const target = document.createComment(`event-bus:${busName}`);

  /**
   * Publishes an event and its corresponding payload to all active subscribers.
   *
   * WHAT: Wraps the payload in a native `CustomEvent` with `detail: payload` and dispatches it on the target node.
   * WHY: Dispatches events synchronously through the native DOM event pipeline, guaranteeing
   * immediate delivery in the exact order published, while allowing error boundaries to catch handler exceptions.
   *
   * @param args Dynamic tuple containing the event name and optional typed payload.
   */
  const publish = <K extends keyof TEvents & string>(...args: PublishArgs<TEvents, K>): void => {
    const [eventName, payload] = args as [K, TEvents[K] | undefined];
    target.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  };

  /**
   * Subscribes a handler to receive events matching `eventName`.
   *
   * WHAT: Registers an event listener on the internal target and unpacks `event.detail` for the handler.
   * WHY: Returns an unsubscribe function closure directly, allowing consumers to pass the returned
   * callback straight to `this.track(...)` for automatic cleanup during component unmounting.
   *
   * @param eventName Name of the event to listen for.
   * @param handler Callback function invoked with the strongly-typed event payload.
   * @returns Idempotent unsubscribe function that removes the listener.
   */
  const subscribe = <K extends keyof TEvents & string>(
    eventName: K,
    handler: (payload: TEvents[K]) => void
  ): Unsubscribe => {
    const listener = (event: Event): void => {
      // The type guard is what lets us hand the caller a correctly typed payload.
      if (event instanceof CustomEvent) {
        handler(event.detail as TEvents[K]);
      }
    };
    target.addEventListener(eventName, listener);
    return () => target.removeEventListener(eventName, listener);
  };

  /**
   * Subscribes a handler to receive a single occurrence of `eventName`, then automatically unregisters.
   *
   * WHAT: Sets up a subscription that immediately invokes its own disposer before executing `handler`.
   * WHY: Ensures single-execution semantics without race conditions, even if the handler throws an error
   * or triggers another event synchronously.
   *
   * @param eventName Name of the event to await.
   * @param handler Callback invoked upon the first receipt of the event.
   * @returns Unsubscribe function to cancel the one-shot listener before it fires.
   */
  const once = <K extends keyof TEvents & string>(
    eventName: K,
    handler: (payload: TEvents[K]) => void
  ): Unsubscribe => {
    const dispose = subscribe(eventName, (payload) => {
      dispose();
      handler(payload);
    });
    return dispose;
  };

  /**
   * Returns a promise that resolves with the payload of the next occurrence of `eventName`.
   *
   * WHAT: Promisifies the one-shot event listener pattern.
   * WHY: Enables async/await coordination workflows (e.g. awaiting backend adapter initialization
   * or waiting for an upload completion event before triggering a table reload).
   *
   * @param eventName Name of the event to wait for.
   * @returns Promise resolving to the event's typed payload.
   */
  const next = <K extends keyof TEvents & string>(eventName: K): Promise<TEvents[K]> =>
    new Promise((resolve) => {
      once(eventName, resolve);
    });

  return { publish, subscribe, once, next };
};
