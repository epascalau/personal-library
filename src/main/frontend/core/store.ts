/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
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

  /**
   * Initializes the store with its root state record.
   *
   * WHAT: Sets the initial state payload.
   * WHY: Requires an explicit initial state to ensure TypeScript subscribers always observe
   * a fully initialized, non-undefined state object without needing null assertions.
   *
   * @param initialState The initial immutable state object.
   */
  constructor(initialState: S) {
    this.currentState = initialState;
  }

  /**
   * Returns a read-only snapshot of the current state.
   *
   * WHAT: Readonly state accessor.
   * WHY: Enforces unidirectional data flow by preventing callers from mutating state properties
   * directly; state updates must be dispatched exclusively via `setState()` so subscribers are notified.
   */
  get state(): Readonly<S> {
    return this.currentState;
  }

  /**
   * Merges a partial state update or reducer result into the active state and schedules subscriber notification.
   *
   * WHAT: Evaluates the patch, compares updated keys against current values via `Object.is`,
   * merges changed properties into a new immutable object, and triggers microtask notification.
   * WHY:
   * 1. Equality short-circuiting: If none of the patched fields have changed (e.g., periodic
   *    30-second background health checks returning the same status), the method no-ops immediately.
   *    This prevents unwanted re-renders, input blurs, and popover dismissals across the UI.
   * 2. Immutable shallow merge: Creating a new object reference allows selectors and `watch()`
   *    comparators to detect changes reliably via fast reference comparisons.
   *
   * @param patch Partial state slice or reducer function returning a partial state slice.
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

  /**
   * Registers a subscriber listener to receive state updates whenever state changes.
   *
   * WHAT: Adds `listener` to the internal listener Set, optionally invokes it immediately with
   * the current state, and returns an idempotent unsubscribe function.
   * WHY: Returning an unsubscribe closure directly adheres to standard reactive disposer patterns,
   * making it trivial for views to register store listeners inside `this.track(store.subscribe(...))`
   * for automatic teardown during unmount.
   *
   * @param listener Callback function receiving the updated state.
   * @param options Configuration options (e.g. `immediate: true` to trigger on registration).
   * @returns Unsubscribe function that removes the listener.
   */
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
   * Dispatches state change notifications to all registered listeners asynchronously.
   *
   * WHAT: Schedules listener dispatch in `queueMicrotask` if a notification is not already pending.
   * WHY: Coalescing notifications within the microtask queue prevents redundant render cascades
   * when multiple state updates are issued consecutively within the same synchronous call stack
   * (e.g., setting loading flag, clearing active error, and populating search results).
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

  /**
   * Flushes any pending notification immediately and synchronously.
   *
   * WHAT: Cancels the microtask flag and immediately executes all listener callbacks with the latest state.
   * WHY: Critical for unit tests and imperative transitions where downstream DOM assertions or
   * sequential synchronous steps require guaranteed DOM convergence before the next line of code executes.
   */
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
 * Subscribes a single listener callback to multiple stores simultaneously.
 *
 * WHAT: Attaches the given listener to every store in the `stores` array and returns a composite disposer.
 * WHY: Views often depend on intersections of distinct domains (e.g., List Report depending
 * on both `appStore` for document data and `i18nStore` for localized column labels).
 * Bundling subscriptions avoids boilerplate multiple `track` calls.
 *
 * @param stores Array of Store instances to observe.
 * @param listener Unified callback invoked whenever any of the observed stores change.
 * @returns Composite unsubscribe function that detaches from all stores.
 */
export const subscribeAll = (
  stores: Array<Store<object>>,
  listener: () => void
): Unsubscribe => {
  const disposers = stores.map((store) => store.subscribe(listener));
  return () => disposers.forEach((dispose) => dispose());
};

/**
 * Observes a specific derived slice of store state and notifies only when that selected slice changes.
 *
 * WHAT: Runs `selector(state)` on every store change and compares the derived value to the previous
 * value using `isEqual` (defaulting to `Object.is`). If unequal, updates cached value and fires `listener`.
 * WHY: Prevents over-rendering by filtering out irrelevant state transitions. For example, a dialog
 * header watching only document titles will not re-render when background download progress counters tick.
 *
 * @param store The source store to observe.
 * @param selector Pure function mapping state to a desired sub-value or slice.
 * @param listener Callback triggered when the derived value changes.
 * @param isEqual Equality comparator function (defaults to Object.is).
 * @returns Unsubscribe function to terminate observation.
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

/**
 * Performs shallow comparison between two objects or primitives for `watch` selectors.
 *
 * WHAT: Compares primitive equality via `Object.is`, and for objects compares key counts
 * and shallow property values.
 * WHY: Enables `watch` selectors that return multi-field tuples or composite slice objects
 * (e.g. `{ id, status }`) to avoid firing listeners when a new object literal is returned
 * but its member properties have not changed.
 *
 * @param a First value to compare.
 * @param b Second value to compare.
 * @returns True if both values are shallowly identical.
 */
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
