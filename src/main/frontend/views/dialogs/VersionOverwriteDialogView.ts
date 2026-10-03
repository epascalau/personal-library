/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vanilla + UI5 replacement for `components/VersionOverwriteDialog.tsx`.
 *
 * The dialog edits a draft copy of the active document's BibTeX metadata and
 * optionally a replacement file; the draft is re-seeded every time the dialog
 * opens, matching the React component's unmount/remount lifecycle.
 */

import { html, raw, RawHtml } from '../../core/html';
import { watch } from '../../core/store';
import { requestBackend } from '../../services/backend';
import { appStore } from '../../stores/appStore';
import { icon } from '../../ui5/icons';
import { DialogView } from './DialogView';
import type { BibTeXMetadata } from '../../types';
import type Input from '@ui5/webcomponents/dist/Input.js';

const ACCEPTED_FILES = '.pdf,.docx,.doc,.md,.txt,.xls,.xlsx,.ppt,.pptx';

const EMPTY_BIBTEX: BibTeXMetadata = {
  bibKey: '',
  entryType: 'book',
  title: '',
  author: '',
  year: '',
  publisher: '',
  edition: ''
} as BibTeXMetadata;

export class VersionOverwriteDialogView extends DialogView {
  private selectedFile: File | null = null;

  private fileContentText = '';

  private fileDataBase64 = '';

  private bibtex: BibTeXMetadata = { ...EMPTY_BIBTEX };

  private submitting = false;

  private errorMsg = '';

  constructor() {
    super(undefined);
  }

  protected isOpen(): boolean {
    return appStore.state.versionModalOpen && appStore.state.activeDocument !== null;
  }

  protected canClose(): boolean {
    return !this.submitting;
  }

  protected requestClose(): void {
    appStore.closeVersionModal();
  }

  protected onMount(): void {
    super.onMount();
    this.track(
      watch(
        appStore,
        (state) => state.versionModalOpen,
        (open) => {
          if (open) {
            this.resetDraft();
          }
          this.requestRender();
        }
      )
    );
  }

  private resetDraft(): void {
    const doc = appStore.state.activeDocument;
    this.selectedFile = null;
    this.fileContentText = '';
    this.fileDataBase64 = '';
    this.errorMsg = '';
    this.submitting = false;
    this.bibtex = doc ? { ...doc.bibtex } : { ...EMPTY_BIBTEX };
  }

  protected body(): RawHtml | string {
    const doc = appStore.state.activeDocument;
    if (!doc) {
      return '';
    }
    const currentVersion = doc.versionNumber || 1;

    return html`
      <div slot="header" class="w-full">
        <div
          class="px-6 py-4 border-b border-gray-200 bg-[#f8fafc] flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            ${icon('GitBranch', { className: 'w-5 h-5 text-[#0070f2]' })}
            <div>
              <h3 class="text-base font-bold text-gray-900">
                Upload New Version / Overwrite Active Document
              </h3>
              <p class="text-xs text-gray-500">
                Current active GUID:
                <span class="font-mono text-gray-700">${doc.guid.slice(0, 18)}...</span> (v${String(
                  currentVersion
                )})
              </p>
            </div>
          </div>
          <ui5-button
            class="plib-button plib-button--icon"
            design="Transparent"
            icon="decline"
            data-action="close"
            accessible-name="Close"
            ${this.submitting ? raw('disabled') : ''}
          ></ui5-button>
        </div>
      </div>

      <div class="p-6 overflow-y-auto space-y-5 flex-1 text-xs" data-scroll-key="version-overwrite">
        <div
          class="p-3 bg-blue-50/70 border border-blue-200 text-blue-900 rounded-lg flex items-start gap-2.5"
        >
          ${icon('History', { className: 'w-4 h-4 text-[#0070f2] shrink-0 mt-0.5' })}
          <div class="space-y-1">
            <p class="font-semibold">Content Overwrite Rules:</p>
            <p class="text-gray-600 leading-relaxed">
              Uploading a new version overwrites the content, format, and summaries of the existing
              document in-place. The document GUID
              (<span class="font-mono text-gray-800">${doc.guid}</span>) is retained and version
              number advances to v${String(currentVersion + 1)}. A new GUID is only generated when
              uploading a new document from the main library page.
            </p>
          </div>
        </div>

        ${this.errorMsg
          ? html`<div
              class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2"
            >
              ${icon('AlertCircle', { className: 'w-4 h-4 shrink-0' })}
              <span>${this.errorMsg}</span>
            </div>`
          : ''}

        <div>
          <label class="block font-semibold text-gray-700 mb-1">
            Select Replacement File (Optional if only modifying metadata)
          </label>
          <div
            data-action="pick-file"
            role="button"
            tabindex="0"
            class="border-2 border-dashed border-gray-300 hover:border-[#0070f2] rounded-lg p-4 text-center cursor-pointer bg-[#f8fafc] hover:bg-[#f0f9ff]/40 transition"
          >
            <input
              type="file"
              data-input="file"
              accept="${ACCEPTED_FILES}"
              class="hidden"
              ${this.submitting ? raw('disabled') : ''}
            />
            ${this.selectedFile
              ? html`<div class="flex items-center justify-center gap-2 text-green-700 font-semibold">
                  ${icon('FileCheck', { className: 'w-5 h-5' })}
                  <span
                    >${this.selectedFile.name} (${(this.selectedFile.size / 1024).toFixed(1)}
                    KB)</span
                  >
                </div>`
              : html`<div class="text-gray-500">
                  ${icon('Upload', { className: 'w-6 h-6 mx-auto mb-1 text-gray-400' })}
                  <span>Click to choose a new physical file revision</span>
                </div>`}
          </div>
        </div>

        <div class="space-y-3 pt-3 border-t border-gray-100">
          <h4 class="font-bold text-gray-800 text-sm">Updated BibTeX Information</h4>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${raw(this.metadataField('Title', 'title', this.bibtex.title))}
            ${raw(this.metadataField('Author(s)', 'author', this.bibtex.author))}
            ${raw(
              this.metadataField(
                'Edition',
                'edition',
                this.bibtex.edition || '',
                'e.g. 2nd Revised Edition'
              )
            )}
            ${raw(this.metadataField('Year', 'year', this.bibtex.year))}
          </div>
        </div>
      </div>

      <div slot="footer" class="w-full">
        <div
          class="px-6 py-3 border-t border-gray-200 bg-[#f8fafc] flex items-center justify-end gap-3 text-xs"
        >
          <ui5-button class="plib-button" data-action="close" ${this.submitting ? raw('disabled') : ''}
            >Cancel</ui5-button
          >
          <ui5-button
            class="plib-button"
            design="Emphasized"
            data-action="overwrite"
            ${this.submitting ? raw('disabled') : ''}
          >
            ${icon(this.submitting ? 'Loader2' : 'GitBranch', {
              className: this.submitting ? 'w-4 h-4 animate-spin mr-1.5' : 'w-4 h-4 mr-1.5'
            })}
            ${this.submitting ? 'Generating New Version GUID...' : 'Overwrite Active View'}
          </ui5-button>
        </div>
      </div>
    `;
  }

  private metadataField(
    label: string,
    key: keyof BibTeXMetadata,
    value: string,
    placeholder = ''
  ): string {
    return html`
      <div>
        <label class="block font-semibold text-gray-600 mb-1">${label}</label>
        <ui5-input
          class="plib-input w-full text-xs"
          data-bibtex="${String(key)}"
          data-focus-key="version-${String(key)}"
          value="${value}"
          placeholder="${placeholder}"
          accessible-name="${label}"
        ></ui5-input>
      </div>
    `.toString();
  }

  protected bind(): void {
    this.on('[data-action="pick-file"]', 'click', () => {
      if (!this.submitting) {
        this.$<HTMLInputElement>('input[data-input="file"]')?.click();
      }
    });

    this.on('input[data-input="file"]', 'change', (event) => {
      event.stopPropagation();
      this.handleFileChange(event.currentTarget as HTMLInputElement);
    });

    this.onAll('ui5-input[data-bibtex]', 'input', (event) => {
      const input = event.currentTarget as Input;
      const key = input.dataset.bibtex as keyof BibTeXMetadata;
      this.bibtex = { ...this.bibtex, [key]: input.value };
    });

    this.on('[data-action="overwrite"]', 'click', () => void this.submit());
  }

  private handleFileChange(input: HTMLInputElement): void {
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    this.selectedFile = file;

    const base64Reader = new FileReader();
    base64Reader.onload = () => {
      this.fileDataBase64 = (base64Reader.result as string) || '';
    };
    base64Reader.readAsDataURL(file);

    if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const textReader = new FileReader();
      textReader.onload = (evt) => {
        this.fileContentText = (evt.target?.result as string) || '';
      };
      textReader.readAsText(file);
    } else {
      this.fileContentText = '';
    }

    this.render();
  }

  private async submit(): Promise<void> {
    const doc = appStore.state.activeDocument;
    if (!doc || this.submitting) {
      return;
    }

    this.submitting = true;
    this.errorMsg = '';
    this.render();

    try {
      const updated = await requestBackend('overwriteVersion', {
        guid: doc.guid,
        file: this.selectedFile,
        fileName: this.selectedFile ? this.selectedFile.name : doc.fileName,
        fileFormat: this.selectedFile
          ? this.selectedFile.name.split('.').pop()?.toLowerCase()
          : doc.format,
        fileSize: this.selectedFile ? this.selectedFile.size : doc.fileSize,
        fileContent: this.fileContentText || undefined,
        fileData: this.fileDataBase64 || undefined,
        mimeType: this.selectedFile?.type || 'application/pdf',
        bibtex: this.bibtex
      });

      appStore.showToast(
        `File content overwritten in-place for GUID ${updated.guid.slice(0, 8)}... (v${updated.versionNumber})!`
      );
      appStore.setActiveDocument(updated);
      void appStore.fetchDocuments();
      appStore.closeVersionModal();
    } catch (err: any) {
      this.errorMsg = err?.message || 'Error updating version';
    } finally {
      this.submitting = false;
      this.render();
    }
  }
}
