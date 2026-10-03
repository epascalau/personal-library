/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tiny observable store. Replaces the React contexts (`BackendContext`,
 * `ThemeContext`, `I18nContext`) and the `useState` hooks that previously lived
 * in `App.tsx`, without pulling in a framework.
 */

export type Unsubscribe = () => void;

export type Listener<S> = (state: Readonly<S>) => void;

export interface SubscribeOptions {
  /** Invoke the listener immediately with the current state. */
  immediate?: boolean;
}

export class Store<S extends object> {
  private currentState: S;

  private readonly listeners = new Set<Listener<S>>();

  private notifyScheduled = false;

  constructor(initialState: S) {
    this.currentState = initialState;
  }

  get state(): Readonly<S> {
    return this.currentState;
  }

  /**
   * Merges a partial update into the state and notifies subscribers.
   * No-ops when every supplied value is already identical, which keeps the
   * 30s backend health poll from re-rendering the whole shell.
   */
  setState(patch: Partial<S> | ((prev: Readonly<S>) => Partial<S>)): void {
    const next = typeof patch === 'function' ? patch(this.currentState) : patch;
    const keys = Object.keys(next) as Array<keyof S>;

    let changed = false;
    for (const key of keys) {
      if (!Object.is(this.currentState[key], next[key])) {
        changed = true;
        break;
      }
    }
    if (!changed) {
      return;
    }

    this.currentState = { ...this.currentState, ...next };
    this.notify();
  }

  subscribe(listener: Listener<S>, options: SubscribeOptions = {}): Unsubscribe {
    this.listeners.add(listener);
    if (options.immediate) {
      listener(this.currentState);
    }
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Coalesces bursts of `setState` calls into a single notification per
   * microtask so a handler that updates several fields renders only once.
   */
  protected notify(): void {
    if (this.notifyScheduled) {
      return;
    }
    this.notifyScheduled = true;
    queueMicrotask(() => {
      this.notifyScheduled = false;
      const snapshot = this.currentState;
      for (const listener of [...this.listeners]) {
        listener(snapshot);
      }
    });
  }

  /** Flushes any pending notification synchronously. */
  flush(): void {
    if (!this.notifyScheduled) {
      return;
    }
    this.notifyScheduled = false;
    const snapshot = this.currentState;
    for (const listener of [...this.listeners]) {
      listener(snapshot);
    }
  }
}

/**
 * Subscribes to several stores at once and returns a single disposer.
 */
export const subscribeAll = (
  stores: Array<Store<object>>,
  listener: () => void
): Unsubscribe => {
  const disposers = stores.map((store) => store.subscribe(listener));
  return () => disposers.forEach((dispose) => dispose());
};

/**
 * Fires only when the selected slice actually changes.
 *
 * Views use this to avoid re-rendering on unrelated state updates — for
 * example the 30s backend health poll must not tear down an open popover.
 */
export const watch = <S extends object, T>(
  store: Store<S>,
  selector: (state: Readonly<S>) => T,
  listener: (value: T) => void,
  isEqual: (a: T, b: T) => boolean = Object.is
): Unsubscribe => {
  let previous = selector(store.state);
  return store.subscribe((state) => {
    const nextValue = selector(state);
    if (!isEqual(previous, nextValue)) {
      previous = nextValue;
      listener(nextValue);
    }
  });
};

/** Shallow equality helper for `watch` selectors that build a tuple/record. */
export const shallowEqual = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) {
    return true;
  }
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
    return false;
  }
  const aKeys = Object.keys(a as object);
  const bKeys = Object.keys(b as object);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every((key) =>
    Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
  );
};
