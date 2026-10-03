/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
  constructor() {
    super(undefined);
  }

  protected isOpen(): boolean {
    return appStore.state.deleteConfirmDoc !== null;
  }

  protected canClose(): boolean {
    return !appStore.state.deleting;
  }

  protected requestClose(): void {
    appStore.requestDelete(null);
  }

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

  protected body(): RawHtml | string {
    const t = i18nStore.state.t;
    const doc = appStore.state.deleteConfirmDoc;
    const deleting = appStore.state.deleting;
    if (!doc) {
      return '';
    }

    return html`
      <div slot="header" class="w-full">
        <div
          class="px-5 py-3.5 border-b border-gray-200 bg-[#f8fafc] flex items-center justify-between"
        >
          <div class="flex items-center gap-2 text-red-600 font-bold text-sm">
            ${icon('AlertTriangle', { className: 'w-5 h-5' })}
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
      </div>

      <div class="p-5 space-y-3 text-xs">
        <p class="text-gray-700 leading-relaxed">${t.delete.message}</p>

        <div class="p-3 bg-red-50/60 rounded border border-red-100 space-y-1">
          <div class="font-semibold text-gray-900 truncate">
            ${doc.bibtex.title || doc.fileName}
          </div>
          <div class="text-[11px] text-gray-500 font-mono">GUID: ${doc.guid}</div>
          <div class="text-[11px] text-gray-500">
            Format: ${doc.format.toUpperCase()} • ${doc.fileSizeFormatted}
          </div>
        </div>

        <p class="text-gray-500 text-[11px]">${t.delete.warning}: ${t.delete.message}</p>
      </div>

      <div slot="footer" class="w-full">
        <div
          class="px-5 py-3 border-t border-gray-200 bg-[#f8fafc] flex items-center justify-end gap-2 text-xs"
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

  protected bind(): void {
    this.on('[data-action="confirm-delete"]', 'click', () => void appStore.confirmDelete());
  }
}
