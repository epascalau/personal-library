/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Shared base for every modal that used to be a hand-rolled
 * `fixed inset-0 z-50 … bg-black/40` overlay in the React implementation.
 *
 * `ui5-dialog` takes over the overlay, focus trap, `Escape` handling and
 * scroll locking, while the original Tailwind markup moves unchanged into the
 * `header`, default and `footer` slots. Shadow internals (`.ui5-popup-root`
 * and friends) are themed through `plib-dialog` in the global stylesheet.
 */

import { Component } from '../../core/component';
import { RawHtml } from '../../core/html';
import type Dialog from '@ui5/webcomponents/dist/Dialog.js';

export abstract class DialogView<P = void> extends Component<P> {
  /**
   * Initializes the DialogView base instance using SAP UI5's native `ui5-dialog` custom element.
   *
   * WHAT: Instantiates the underlying Component with `ui5-dialog` tag name and `plib-dialog` CSS class.
   * WHY: Delegating dialog overlay semantics to UI5 Web Components ensures consistent accessibility
   * compliance (focus locking, aria-modal semantics, Escape key traps, and backdrop blocking) across
   * desktop and mobile viewports without needing brittle custom overlay scripts.
   *
   * @param props Dialog properties or configuration.
   * @param className CSS class name applied to the host `ui5-dialog` element.
   */
  constructor(props: P, className = 'plib-dialog') {
    super(props, 'ui5-dialog', className);
  }

  /**
   * Provides a typed accessor to the host element as a UI5 Dialog web component.
   *
   * WHAT: Casts `this.el` to the `@ui5/webcomponents/dist/Dialog.js` interface.
   * WHY: Simplifies property access (such as `.open`) with full TypeScript type safety
   * while encapsulating the web component type assertion in one place.
   */
  protected get dialog(): Dialog {
    return this.el as unknown as Dialog;
  }

  /**
   * Determines whether the dialog should currently be displayed.
   *
   * WHAT: Evaluates application store or local view state to indicate visibility.
   * WHY: Driving dialog visibility from reactive store state allows external triggers
   * (e.g. ShellBar buttons, API errors, row action clicks) to open or close the modal deterministically.
   *
   * @returns `true` if the dialog is currently visible, `false` otherwise.
   */
  protected abstract isOpen(): boolean;

  /**
   * Handles user requests to dismiss the dialog.
   *
   * WHAT: Triggers store actions or local callbacks to reset dialog open state.
   * WHY: Centralizing close requests in this hook ensures consistent cleanup whether the user
   * hits Escape, clicks the backdrop overlay, or presses a modal cancel button.
   */
  protected abstract requestClose(): void;

  /**
   * Asserts whether the dialog is permitted to close in its current lifecycle state.
   *
   * WHAT: Returns a boolean indicating whether dismissal is currently allowed (defaults to `true`).
   * WHY: Prevents accidental closure while critical mutations (such as file uploads, document deletion,
   * or backend switching) are actively executing in the background, avoiding orphaned network requests.
   *
   * @returns `true` if dismissal is permitted, `false` if locked during async operations.
   */
  protected canClose(): boolean {
    return true;
  }

  /**
   * Generates the inner content and slot markup for the dialog.
   *
   * WHAT: Returns the template markup for dialog headers, body, inputs, and action buttons.
   * WHY: Subclasses implement this method to provide custom modal layouts while leaving lifecycle
   * and open/close plumbing to the base `DialogView`.
   *
   * @returns RawHtml or HTML markup representing the dialog interior.
   */
  protected abstract body(): RawHtml | string;

  /**
   * Generates markup based on current visibility state.
   *
   * WHAT: Returns `this.body()` if `isOpen()` is true, otherwise returns an empty string.
   * WHY: Omitting inner markup when closed prevents background DOM pollution, unnecessary form bindings,
   * and hidden element evaluation when the modal is inactive.
   *
   * @returns RawHtml or empty string.
   */
  protected template(): RawHtml | string {
    return this.isOpen() ? this.body() : '';
  }

  /**
   * Mounts native UI5 dialog close event listeners.
   *
   * WHAT: Binds the `close` custom event emitted by `ui5-dialog` and registers cleanup in `this.track`.
   * WHY: UI5 fires its native `close` event when the user presses Escape or clicks the backdrop;
   * catching this event allows the application to synchronize its store state or intercept disallowed closes.
   */
  protected onMount(): void {
    // UI5 fires `close` for Escape and backdrop clicks; reopening immediately
    // would fight the animation, so a blocked close re-opens on the next frame.
    this.el.addEventListener('close', this.handleNativeClose);
    this.track(() => this.el.removeEventListener('close', this.handleNativeClose));
  }

  /**
   * Native close event listener that validates `canClose()` before granting modal dismissal.
   *
   * WHAT: Checks `isOpen()` and `canClose()`; if closure is blocked, schedules dialog re-opening on the next animation frame.
   * WHY: Reopening via `requestAnimationFrame` prevents visual UI flickering and race conditions with UI5's internal
   * closing animations when an async background task prohibits dismissal.
   */
  private readonly handleNativeClose = (): void => {
    if (!this.isOpen()) {
      return;
    }
    if (!this.canClose()) {
      requestAnimationFrame(() => {
        this.dialog.open = true;
      });
      return;
    }
    this.requestClose();
  };

  /**
   * Synchronizes web component open state and binds action buttons after DOM updates.
   *
   * WHAT: Sets `this.dialog.open`, attaches click handlers to all `[data-action="close"]` elements, and calls `this.bind()`.
   * WHY: UI5 custom elements reflect open state through properties rather than standard HTML attributes alone,
   * requiring programmatic synchronization after innerHTML replacement.
   */
  protected afterRender(): void {
    this.dialog.open = this.isOpen();
    this.onAll('[data-action="close"]', 'click', () => {
      if (this.canClose()) {
        this.requestClose();
      }
    });
    this.bind();
  }

  /**
   * Subclass hook for wiring custom dialog inputs, forms, and buttons.
   *
   * WHAT: Optional callback executed on every render cycle after base bindings complete.
   * WHY: Allows concrete dialog subclasses to attach file pickers, input validators, and submission handlers
   * without overriding base rendering logic.
   */
  protected bind(): void {
    // optional
  }
}
