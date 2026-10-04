/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Transient toast notification view.
 * Renders floating success/error alerts in the bottom-right viewport with polite ARIA live announcements.
 */

import { Component } from '../core/component';
import { html, raw, RawHtml } from '../core/html';
import { watch } from '../core/store';
import { appStore } from '../stores/appStore';
import { icon } from '../ui5/icons';

/**
 * Transient feedback banner, pinned bottom-right.
 *
 * Mirrors the former inline JSX block in App.tsx 1:1 — including the
 * `animate-in slide-in-from-bottom-3` entry animation. Auto-dismissal
 * (3500 ms) lives in appStore.showToast, so this view is purely visual.
 */
export class ToastView extends Component {
  /**
   * Initializes the ToastView host element.
   *
   * WHAT: Invokes the base Component constructor without custom tag or initial class parameters.
   * WHY: The host container acts as an inert mounting anchor while the internal template creates
   * a viewport-relative fixed position container (`fixed bottom-5 right-5 z-50`) only when an active toast exists.
   */
  constructor() {
    super(undefined);
  }

  /**
   * Registers a store watcher on the application's active toast state.
   *
   * WHAT: Watches `appStore.state.toast` and triggers `requestRender()` whenever the toast changes or expires.
   * WHY: Fine-grained property observation prevents re-rendering the toast view when other application
   * state (such as documents list, active search query, or selected record) changes.
   */
  protected onMount(): void {
    this.track(
      watch(
        appStore,
        (state) => state.toast,
        () => this.requestRender()
      )
    );
  }

  /**
   * Generates the accessible HTML markup for the transient toast notification.
   *
   * WHAT: Renders a floating notification card styled by toast type (emerald for success, red for error),
   * containing an SVG status icon, message text, and ARIA live attributes.
   * WHY: Setting `role="status"` and `aria-live="polite"` ensures screen readers announce the notification
   * without interrupting existing user speech, complying with accessibility standards. Returning an empty
   * string when no toast is active keeps the DOM clean and unencumbered.
   *
   * @returns RawHtml markup representing the active toast or empty string if none is active.
   */
  protected template(): RawHtml | string {
    const toast = appStore.state.toast;
    if (!toast) {
      return '';
    }

    const success = toast.type === 'success';
    const tone = success
      ? 'bg-emerald-900 text-white border-emerald-700'
      : 'bg-red-900 text-white border-red-700';
    const glyph = success
      ? icon('CheckCircle2', { className: 'w-4 h-4 text-emerald-300' })
      : icon('AlertCircle', { className: 'w-4 h-4 text-red-300' });

    return html`
      <div
        class="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-3 duration-200"
        role="status"
        aria-live="polite"
        data-toast-id="${String(toast.id)}"
      >
        <div
          class="px-4 py-3 rounded-lg shadow-xl border flex items-center gap-2.5 text-xs font-semibold ${raw(
            tone
          )}"
        >
          ${glyph}
          <span>${toast.message}</span>
        </div>
      </div>
    `;
  }
}
