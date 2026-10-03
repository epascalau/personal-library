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
  constructor() {
    super(undefined);
  }

  protected onMount(): void {
    this.track(
      watch(
        appStore,
        (state) => state.toast,
        () => this.requestRender()
      )
    );
  }

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
