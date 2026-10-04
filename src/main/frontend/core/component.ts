/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Base class for the vanilla TypeScript views that replaced the React
 * components. A view owns one light-DOM host element, renders itself from a
 * string template and re-renders wholesale on state changes — the same mental
 * model as the previous React render, minus the framework.
 */

import { RawHtml, toMarkup } from './html';
import type { Unsubscribe } from './store';

/**
 * Elements carrying `data-focus-key` keep keyboard focus (and text selection)
 * across a re-render, which matters for the filter bar and the RAG chat input.
 */
const FOCUS_KEY_ATTR = 'data-focus-key';

/** Elements carrying `data-scroll-key` keep their scroll offset across a re-render. */
const SCROLL_KEY_ATTR = 'data-scroll-key';

interface FocusSnapshot {
  key: string;
  selectionStart: number | null;
  selectionEnd: number | null;
}

const getInnerInput = (element: Element): HTMLInputElement | HTMLTextAreaElement | null => {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return element;
  }
  const inner = element.shadowRoot?.querySelector('input, textarea');
  return inner instanceof HTMLInputElement || inner instanceof HTMLTextAreaElement ? inner : null;
};

/** Walks up through shadow roots to find the focused element inside `root`. */
const findActiveElement = (root: Element): Element | null => {
  let active: Element | null = document.activeElement;
  while (active) {
    if (root.contains(active)) {
      return active;
    }
    const host = (active.getRootNode() as ShadowRoot).host;
    if (!host) {
      return null;
    }
    active = host;
  }
  return null;
};

/**
 * Structural view of a child view, used by `adopt`/`own`. Referencing
 * `Component<any>` there would break for `Component<void>` subclasses because
 * `Partial<void>` is not assignable to `void`.
 */
export interface MountableComponent {
  readonly el: HTMLElement;
  readonly isMounted: boolean;
  mount(parent: Element): unknown;
  destroy(): void;
}

export abstract class Component<P = void> {
  readonly el: HTMLElement;

  protected props: P;

  private readonly disposers: Unsubscribe[] = [];

  private destroyed = false;

  private mounted = false;

  private renderScheduled = false;

  /**
   * Initializes the component host element with its initial props and optional styling.
   *
   * WHAT: Creates the root DOM node for the specified HTML tag name, records initial props, and applies initial class names.
   * WHY: Creating an explicit host element upfront decouples DOM node creation from attachment,
   * allowing views to be constructed, configured, and subscribed to stores before being mounted
   * into the live document hierarchy.
   *
   * @param props Initial property configuration for the component.
   * @param tagName HTML tag name for the root element (defaults to 'div').
   * @param className Optional initial CSS classes to apply to the host element.
   */
  constructor(props: P, tagName = 'div', className?: string) {
    this.props = props;
    this.el = document.createElement(tagName);
    if (className) {
      this.el.className = className;
    }
  }

  /**
   * Produces the HTML markup string for the component's inner structure.
   *
   * WHAT: Generates a template string containing the presentation structure for the current state.
   * WHY: Pure template rendering keeps views declarative and stateless in markup generation,
   * while automatic HTML escaping via `RawHtml` ensures backend-originating content (such as
   * document titles, user prompts, and AI summaries) cannot introduce XSS injection vulnerabilities.
   *
   * @returns RawHtml or HTML markup string representing the view.
   */
  protected abstract template(): RawHtml | string;

  /**
   * Post-render lifecycle callback executed immediately after innerHTML is replaced.
   *
   * WHAT: Wires up imperative DOM event listeners, binds input handlers, and sets custom UI5 properties.
   * WHY: UI5 Web Components and custom elements require programmatic `addEventListener` bindings
   * and property assignments that cannot be expressed purely through HTML attribute strings
   * (e.g., non-string object references, complex custom event payloads).
   */
  protected afterRender(): void {
    /* optional */
  }

  /**
   * One-time initialization callback executed after the component is first attached to the DOM.
   *
   * WHAT: Runs initial store subscriptions, timers, or initial network fetch triggers.
   * WHY: Keeps expensive setup out of the constructor so views can be instantiated speculatively
   * without incurring DOM side-effects until they are actively mounted in the layout tree.
   */
  protected onMount(): void {
    /* optional */
  }

  /**
   * Teardown callback invoked during component destruction.
   *
   * WHAT: Performs subclass-specific resource release before base disposers run.
   * WHY: Allows components to abort inflight fetch controllers, cancel pending animation frames,
   * and clean up third-party widgets before the host element is detached and emptied.
   */
  protected onDestroy(): void {
    /* optional */
  }

  /**
   * Attaches the component's host element to a parent container and triggers initial render.
   *
   * WHAT: Appends `this.el` to `parent`, marks mounted status, executes initial render, and calls `onMount`.
   * WHY: Guaranteeing that the element is inside the DOM before `onMount` runs ensures that
   * child queries, dimensions, and browser layout properties are valid and measurable immediately.
   *
   * @param parent DOM container element where this component will be appended.
   * @returns The component instance for fluent method chaining.
   */
  mount(parent: Element): this {
    parent.appendChild(this.el);
    this.mounted = true;
    this.render();
    this.onMount();
    return this;
  }

  /**
   * Indicates whether the component is currently mounted in the active DOM tree.
   *
   * WHAT: Returns boolean mounting state.
   * WHY: Protects against redundant mount operations and allows child adoption routines
   * to determine whether to call `mount` or simply move `this.el` between DOM slots.
   */
  get isMounted(): boolean {
    return this.mounted;
  }

  /**
   * Updates component properties via shallow patch merge and triggers an immediate re-render.
   *
   * WHAT: Merges `patch` into `this.props` and immediately executes `render()`.
   * WHY: Provides a clean, unidirectional state propagation pattern similar to React props,
   * ensuring that any parent-initiated data change is immediately reflected in the DOM.
   *
   * @param patch Partial property update to apply to the current props.
   */
  setProps(patch: Partial<P>): void {
    this.props = { ...this.props, ...patch };
    this.render();
  }

  /**
   * Re-renders the component's inner markup while preserving user focus and scroll state.
   *
   * WHAT:
   * 1. Captures active focus and scroll positions via `data-focus-key` and `data-scroll-key`.
   * 2. Replaces `this.el.innerHTML` with fresh markup from `template()`.
   * 3. Invokes `afterRender()` for event listener wiring.
   * 4. Restores scroll offsets and re-applies focus/text selection asynchronously.
   *
   * WHY: Wholesale `innerHTML` replacement provides a deterministic, zero-virtual-DOM rendering
   * engine, but ordinarily wipes user focus (dropping keyboard cursor from search inputs) and
   * resets scrollbars. Capturing and restoring these snapshots preserves a smooth, app-like feel
   * even during live RAG streaming or background data refresh.
   */
  render(): void {
    if (this.destroyed) {
      return;
    }
    const focus = this.captureFocus();
    const scroll = this.captureScroll();

    this.el.innerHTML = toMarkup(this.template());

    this.afterRender();
    this.restoreScroll(scroll);
    this.restoreFocus(focus);
  }

  /**
   * Schedules a re-render coalesced into the upcoming microtask queue.
   *
   * WHAT: Queues a single microtask execution of `render()` if not already scheduled.
   * WHY: Prevents layout thrashing and redundant DOM updates when multiple reactive store
   * subscriptions fire synchronously in the same execution tick (e.g. batch updates or multiple filter changes).
   */
  requestRender(): void {
    if (this.renderScheduled || this.destroyed) {
      return;
    }
    this.renderScheduled = true;
    queueMicrotask(() => {
      this.renderScheduled = false;
      this.render();
    });
  }

  /**
   * Disposes of the component and completely releases all attached resources.
   *
   * WHAT:
   * 1. Sets destruction flag to reject subsequent renders.
   * 2. Invokes `onDestroy()` lifecycle hook.
   * 3. Executes all registered disposers (unsubscribing from stores, event buses, timers).
   * 4. Empties and removes host element from the DOM.
   *
   * WHY: In long-lived single-page applications, failure to unbind global store listeners
   * or detached DOM nodes creates severe memory leaks. Centralizing teardown guarantees
   * that unmounted views are completely garbage-collected.
   */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.onDestroy();
    this.disposers.forEach((dispose) => dispose());
    this.disposers.length = 0;
    this.el.innerHTML = '';
    this.el.remove();
  }

  /**
   * Returns whether the component has been destroyed.
   *
   * WHAT: Destruction status accessor.
   * WHY: Enables async callbacks (promises, fetch responses, timeouts) to guard against
   * modifying DOM elements or updating state on obsolete components after navigation away.
   */
  get isDestroyed(): boolean {
    return this.destroyed;
  }

  /**
   * Registers a cleanup callback to be executed upon component destruction.
   *
   * WHAT: Pushes `dispose` into the internal disposers array.
   * WHY: Simplifies lifecycle management by allowing reactive subscriptions (`store.subscribe`),
   * event bus registrations, and intervals to be declared inline during setup with automatic cleanup.
   *
   * @param dispose Callback invoked when the component is destroyed.
   */
  protected track(dispose: Unsubscribe): void {
    this.disposers.push(dispose);
  }

  /**
   * Re-attaches a persistent child component into a designated placeholder in this view's markup.
   *
   * WHAT: Finds the slot matching `selector` and moves or mounts `child.el` into it.
   * WHY: Because `render()` resets `innerHTML`, persistent child components (such as shell bars,
   * complex dialogs, or embedded charts) would otherwise lose their internal DOM state and event
   * listeners. Moving the persistent DOM node into the new placeholder retains all child state seamlessly.
   *
   * @param selector CSS selector identifying the placeholder slot element.
   * @param child The child component instance to place into the slot.
   */
  protected adopt(selector: string, child: MountableComponent): void {
    const slot = this.$(selector);
    if (!slot) {
      return;
    }
    if (!child.isMounted) {
      child.mount(slot);
    } else if (child.el.parentNode !== slot) {
      slot.appendChild(child.el);
    }
  }

  /**
   * Binds the lifecycle of a child component to this parent component.
   *
   * WHAT: Registers `child.destroy()` as a tracked disposer of this component.
   * WHY: Ensures hierarchical destruction so that when a parent view is unmounted,
   * all nested child views and their respective store subscriptions are automatically torn down.
   *
   * @param child Child component to track.
   * @returns The child instance for convenient assignment.
   */
  protected own<C extends MountableComponent>(child: C): C {
    this.track(() => child.destroy());
    return child;
  }

  /**
   * Scoped query selector helper targeting this component's host element.
   *
   * WHAT: Runs `querySelector` scoped strictly inside `this.el`.
   * WHY: Prevents accidental queries against other views or global elements, ensuring
   * encapsulation and predictable component behavior.
   *
   * @param selector CSS selector to query.
   * @returns The first matching element or null.
   */
  protected $<T extends Element = HTMLElement>(selector: string): T | null {
    return this.el.querySelector<T>(selector);
  }

  /**
   * Scoped query selector all helper targeting this component's host element.
   *
   * WHAT: Runs `querySelectorAll` scoped inside `this.el` and returns a real array.
   * WHY: Converts native NodeList to a standard Array so callers can immediately use
   * functional array methods (`map`, `filter`, `forEach`) without boilerplate conversion.
   *
   * @param selector CSS selector to query.
   * @returns Array of matching elements.
   */
  protected $$<T extends Element = HTMLElement>(selector: string): T[] {
    return Array.from(this.el.querySelectorAll<T>(selector));
  }

  /**
   * Convenience helper to attach an event listener to the first element matching `selector`.
   *
   * WHAT: Finds the element matching `selector` and attaches `addEventListener`.
   * WHY: Reduces repetitive null checks in `afterRender()` implementations.
   *
   * @param selector CSS selector for target element.
   * @param type Event type string (e.g., 'click', 'input', 'change').
   * @param handler Event handler receiving the event and target element.
   */
  protected on<E extends Event = Event>(
    selector: string,
    type: string,
    handler: (event: E, element: HTMLElement) => void
  ): void {
    const element = this.$(selector);
    if (element) {
      element.addEventListener(type, (event) => handler(event as E, element));
    }
  }

  /**
   * Convenience helper to attach an event listener to all elements matching `selector`.
   *
   * WHAT: Queries all matching elements and attaches the given event listener to each.
   * WHY: Simplifies event delegation for repeated items such as table rows, tags, or buttons.
   *
   * @param selector CSS selector for target elements.
   * @param type Event type string.
   * @param handler Event handler invoked on event trigger.
   */
  protected onAll<E extends Event = Event>(
    selector: string,
    type: string,
    handler: (event: E, element: HTMLElement) => void
  ): void {
    this.$$(selector).forEach((element) => {
      element.addEventListener(type, (event) => handler(event as E, element));
    });
  }

  /**
   * Captures the currently focused element and its text cursor selection state.
   *
   * WHAT: Locates the active element inside `this.el` (navigating shadow roots) and captures
   * its `data-focus-key` along with selection start and end indices.
   * WHY: Standard `document.activeElement` cannot penetrate Web Component shadow roots,
   * and raw DOM references become detached when `innerHTML` is updated. Keying inputs with
   * `data-focus-key` allows us to locate the newly created DOM node after render and restore caret position.
   *
   * @returns Focus snapshot object or null if no keyed element is focused.
   */
  private captureFocus(): FocusSnapshot | null {
    const active = findActiveElement(this.el);
    if (!active) {
      return null;
    }
    const keyed = active.closest(`[${FOCUS_KEY_ATTR}]`);
    if (!keyed) {
      return null;
    }
    const input = getInnerInput(keyed);
    return {
      key: keyed.getAttribute(FOCUS_KEY_ATTR) as string,
      selectionStart: input?.selectionStart ?? null,
      selectionEnd: input?.selectionEnd ?? null
    };
  }

  /**
   * Restores focus and cursor position from a previously captured focus snapshot.
   *
   * WHAT: Finds the new element with matching `data-focus-key`, focuses it, and restores text selection range.
   * WHY: UI5 Web Components render their internal inputs asynchronously inside shadow roots.
   * If the target has a `_waitForDomRef` promise, we await it before setting focus so the browser
   * does not drop focus due to the inner `<input>` not being ready yet.
   *
   * @param snapshot Focus snapshot captured prior to re-render.
   */
  private restoreFocus(snapshot: FocusSnapshot | null): void {
    if (!snapshot) {
      return;
    }
    const target = this.el.querySelector<HTMLElement>(
      `[${FOCUS_KEY_ATTR}="${CSS.escape(snapshot.key)}"]`
    );
    if (!target) {
      return;
    }

    /**
     * Applies focus and restores caret/selection positions on the target DOM or UI5 element.
     *
     * WHAT: Invokes `.focus()` on target and sets `selectionStart`/`selectionEnd` on the inner input if available.
     * WHY: Retains user cursor placement during reactive store re-renders, preventing typing interruption.
     */
    const applyFocus = () => {
      target.focus();
      if (snapshot.selectionStart === null) {
        return;
      }
      const input = getInnerInput(target);
      if (input) {
        try {
          input.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd ?? snapshot.selectionStart);
        } catch {
          // Inputs such as type="email" do not support selection ranges.
        }
      }
    };

    // UI5 elements only accept focus once their shadow root has rendered.
    const maybeUi5 = target as HTMLElement & { _waitForDomRef?: () => Promise<unknown> };
    if (typeof maybeUi5._waitForDomRef === 'function') {
      maybeUi5._waitForDomRef().then(applyFocus).catch(() => undefined);
    } else {
      applyFocus();
    }
  }

  /**
   * Captures scroll top offsets for all elements decorated with `data-scroll-key`.
   *
   * WHAT: Queries all elements carrying `data-scroll-key` and maps key to `scrollTop`.
   * WHY: When views re-render (e.g. List Report receiving fresh query data or RAG chat receiving
   * streaming chunks), table containers and chat panels would jump to the top without scroll preservation.
   *
   * @returns Map of scroll key to pixel vertical offset.
   */
  private captureScroll(): Map<string, number> {
    const offsets = new Map<string, number>();
    this.$$(`[${SCROLL_KEY_ATTR}]`).forEach((element) => {
      offsets.set(element.getAttribute(SCROLL_KEY_ATTR) as string, element.scrollTop);
    });
    return offsets;
  }

  /**
   * Restores scroll offsets for elements matching previously recorded scroll keys.
   *
   * WHAT: Iterates stored offsets and assigns `element.scrollTop = top` on matched elements.
   * WHY: Keeps table viewports and conversation history stable across live renders.
   *
   * @param offsets Map of scroll key to vertical offset.
   */
  private restoreScroll(offsets: Map<string, number>): void {
    offsets.forEach((top, key) => {
      const element = this.el.querySelector<HTMLElement>(
        `[${SCROLL_KEY_ATTR}="${CSS.escape(key)}"]`
      );
      if (element) {
        element.scrollTop = top;
      }
    });
  }
}
