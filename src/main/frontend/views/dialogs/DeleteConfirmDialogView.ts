/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Vanilla + UI5 replacement for `components/DeleteConfirmDialog.tsx`.
 */

import { html, raw, RawHtml } from '../../core/html';
import { shallowEqual, watch } from '../../core/store';
import { appStore } from '../../stores/appStore';
import { i18nStore } from '../../stores/i18nStore';
import { icon } from '../../ui5/icons';
import { DialogView } from './DialogView';

export class DeleteConfirmDialogView extends DialogView {
  /**
   * Initializes the DeleteConfirmDialogView with confirmation dialog styling.
   *
   * WHAT: Invokes base DialogView with confirmation modal CSS class.
   * WHY: Scoping confirmation dialog styling via `plib-dialog--confirm` ensures proper minimum width
   * and warning accentuation across all themes.
   */
  constructor() {
    super(undefined, 'plib-dialog plib-dialog--confirm');
  }

  /**
   * Determines if the delete confirmation dialog should be displayed.
   *
   * WHAT: Checks if `appStore.state.deleteConfirmDoc` is non-null.
   * WHY: Making visibility contingent on having a non-null document reference guarantees that the dialog
   * never opens with missing or undefined document attributes.
   *
   * @returns `true` if a document is pending deletion, `false` otherwise.
   */
  protected isOpen(): boolean {
    return appStore.state.deleteConfirmDoc !== null;
  }

  /**
   * Prevents modal dismissal while deletion network request is active.
   *
   * WHAT: Returns `!appStore.state.deleting`.
   * WHY: Disallowing dismissal while an asynchronous delete mutation is in flight prevents duplicate requests
   * or desynchronized UI state where the user thinks the action was cancelled.
   *
   * @returns `true` if dismissal is permitted, `false` while deleting.
   */
  protected canClose(): boolean {
    return !appStore.state.deleting;
  }

  /**
   * Cancels the deletion request and clears the target document from store.
   *
   * WHAT: Calls `appStore.requestDelete(null)`.
   * WHY: Resetting the target document to `null` cleanly closes the dialog and releases the referenced document.
   */
  protected requestClose(): void {
    appStore.requestDelete(null);
  }

  /**
   * Subscribes to document deletion state and internationalization dictionary changes.
   *
   * WHAT: Watches `deleteConfirmDoc` and `deleting` states, and subscribes to `i18nStore`.
   * WHY: Reacts immediately when a delete request starts or completes, and dynamically updates button
   * labels and warning text when the locale changes.
   */
  protected onMount(): void {
    super.onMount();
    this.track(
      watch(
        appStore,
        (state) => [state.deleteConfirmDoc, state.deleting],
        () => this.requestRender(),
        shallowEqual
      )
    );
    this.track(i18nStore.subscribe(() => this.requestRender()));
  }

  /**
   * Generates the confirmation dialog markup including document details and warning alert.
   *
   * WHAT: Renders modal header with warning icon, document metadata summary card (title, GUID, format, size),
   * Qdrant vector deletion warning notice, and cancel/delete buttons.
   * WHY: Displaying precise document metadata ensures users verify the exact target before permanent destruction
   * of relational records and vector embeddings.
   *
   * @returns RawHtml modal layout or empty string if no document is targeted.
   */
  protected body(): RawHtml | string {
    const t = i18nStore.state.t;
    const doc = appStore.state.deleteConfirmDoc;
    const deleting = appStore.state.deleting;
    if (!doc) {
      return '';
    }

    return html`
      <div class="w-full flex flex-col overflow-hidden bg-white dark:bg-[#1c232b]">
        <!-- Header -->
        <div
          class="px-6 py-4 border-b border-gray-100 dark:border-[#2e3b4a] bg-white dark:bg-[#1c232b] flex items-center justify-between"
        >
          <div class="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
            ${icon('AlertTriangle', { className: 'w-5 h-5 shrink-0' })}
            <span>${t.delete.title}</span>
          </div>
          <ui5-button
            class="plib-button plib-button--icon"
            design="Transparent"
            icon="decline"
            data-action="close"
            ${deleting ? raw('disabled') : ''}
            accessible-name="${t.common.cancel}"
          ></ui5-button>
        </div>

        <!-- Body -->
        <div class="p-6 space-y-4 text-xs">
          <p class="text-gray-700 dark:text-gray-300 leading-relaxed">${t.delete.message}</p>

          <div
            class="p-3.5 bg-red-50/70 dark:bg-red-950/30 rounded-lg border border-red-100 dark:border-red-900/50 space-y-1.5"
          >
            <div class="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
              ${doc.bibtex.title || doc.fileName}
            </div>
            <div class="text-[11px] text-gray-500 dark:text-gray-400 font-mono">GUID: ${doc.guid}</div>
            <div class="text-[11px] text-gray-500 dark:text-gray-400">
              Format: ${doc.format.toUpperCase()} • ${doc.fileSizeFormatted}
            </div>
          </div>

          <p class="text-gray-500 dark:text-gray-400 text-[11px] leading-relaxed">
            ${t.delete.warning}: This action permanently removes the record and associated Qdrant vector embeddings.
          </p>
        </div>

        <!-- Action Footer -->
        <div
          class="px-6 py-4 border-t border-gray-100 dark:border-[#2e3b4a] bg-white dark:bg-[#1c232b] flex items-center justify-end gap-3 text-xs"
        >
          <ui5-button class="plib-button" data-action="close" ${deleting ? raw('disabled') : ''}
            >${t.common.cancel}</ui5-button
          >
          <ui5-button
            class="plib-button plib-button--destructive"
            design="Negative"
            icon="delete"
            data-action="confirm-delete"
            ${deleting ? raw('disabled') : ''}
            >${deleting ? t.common.loading : t.delete.confirmButton}</ui5-button
          >
        </div>
      </div>
    `;
  }

  /**
   * Binds click handler to the affirmative deletion button.
   *
   * WHAT: Attaches a click event listener to `[data-action="confirm-delete"]` triggering `appStore.confirmDelete()`.
   * WHY: Triggers the async deletion pipeline (API call, store refresh, toast announcement) upon user confirmation.
   */
  protected bind(): void {
    this.on('[data-action="confirm-delete"]', 'click', () => void appStore.confirmDelete());
  }
}
