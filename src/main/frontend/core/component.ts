/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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

  constructor(props: P, tagName = 'div', className?: string) {
    this.props = props;
    this.el = document.createElement(tagName);
    if (className) {
      this.el.className = className;
    }
  }

  /** Markup for the view's host element. */
  protected abstract template(): RawHtml | string;

  /** Wire up event listeners and imperative UI5 properties after each render. */
  protected afterRender(): void {
    /* optional */
  }

  /** One-time setup when the view is first attached to the DOM. */
  protected onMount(): void {
    /* optional */
  }

  /** One-time teardown; always call `super.onDestroy()` when overriding. */
  protected onDestroy(): void {
    /* optional */
  }

  mount(parent: Element): this {
    parent.appendChild(this.el);
    this.mounted = true;
    this.render();
    this.onMount();
    return this;
  }

  get isMounted(): boolean {
    return this.mounted;
  }

  /** Replaces props (shallow merge) and re-renders. */
  setProps(patch: Partial<P>): void {
    this.props = { ...this.props, ...patch };
    this.render();
  }

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

  /** Coalesces multiple render requests within the same microtask. */
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

  get isDestroyed(): boolean {
    return this.destroyed;
  }

  /** Registers a disposer (store subscription, timer, listener) for teardown. */
  protected track(dispose: Unsubscribe): void {
    this.disposers.push(dispose);
  }

  /**
   * Re-attaches a child view's persistent host element into a placeholder of
   * this view's freshly rendered markup.
   *
   * Because a child owns its own element, moving it back after the parent
   * re-renders preserves the child's internal state instead of recreating it.
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

  /** Destroys a child view together with this one. */
  protected own<C extends MountableComponent>(child: C): C {
    this.track(() => child.destroy());
    return child;
  }

  protected $<T extends Element = HTMLElement>(selector: string): T | null {
    return this.el.querySelector<T>(selector);
  }

  protected $$<T extends Element = HTMLElement>(selector: string): T[] {
    return Array.from(this.el.querySelectorAll<T>(selector));
  }

  /** Attaches a listener to the first match of `selector`. */
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

  /** Attaches the same listener to every match of `selector`. */
  protected onAll<E extends Event = Event>(
    selector: string,
    type: string,
    handler: (event: E, element: HTMLElement) => void
  ): void {
    this.$$(selector).forEach((element) => {
      element.addEventListener(type, (event) => handler(event as E, element));
    });
  }

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

  private captureScroll(): Map<string, number> {
    const offsets = new Map<string, number>();
    this.$$(`[${SCROLL_KEY_ATTR}]`).forEach((element) => {
      offsets.set(element.getAttribute(SCROLL_KEY_ATTR) as string, element.scrollTop);
    });
    return offsets;
  }

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
