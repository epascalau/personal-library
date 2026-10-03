/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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

export const createEventBus = <TEvents extends EventsDefinition>(
  busName: string
): TypedEventBus<TEvents> => {
  const target = document.createComment(`event-bus:${busName}`);

  const publish = <K extends keyof TEvents & string>(...args: PublishArgs<TEvents, K>): void => {
    const [eventName, payload] = args as [K, TEvents[K] | undefined];
    target.dispatchEvent(new CustomEvent(eventName, { detail: payload }));
  };

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

  const next = <K extends keyof TEvents & string>(eventName: K): Promise<TEvents[K]> =>
    new Promise((resolve) => {
      once(eventName, resolve);
    });

  return { publish, subscribe, once, next };
};
