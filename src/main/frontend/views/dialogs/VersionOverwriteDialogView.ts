/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Vanilla + UI5 replacement for `components/VersionOverwriteDialog.tsx`.
 *
 * The dialog edits a draft copy of the active document's BibTeX metadata and
 * optionally a replacement file; the draft is re-seeded every time the dialog
 * opens, matching the React component's unmount/remount lifecycle.
 */

import { cx, html, raw, RawHtml } from '../../core/html';
import { watch } from '../../core/store';
import { requestBackend } from '../../services/backend';
import { appStore } from '../../stores/appStore';
import { icon } from '../../ui5/icons';
import { DialogView } from './DialogView';
import type { BibTeXMetadata } from '../../types';
import type Input from '@ui5/webcomponents/dist/Input.js';
import type FileUploader from '@ui5/webcomponents/dist/FileUploader.js';

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'doc', 'md', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'];
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

  /**
   * Constructs VersionOverwriteDialogView with version overwrite modal styling.
   *
   * WHAT: Invokes base DialogView constructor with `plib-dialog--version` class.
   * WHY: Scopes modal styling to provide appropriate dimensions for revision history workflows.
   */
  constructor() {
    super(undefined, 'plib-dialog plib-dialog--version');
  }

  /**
   * Asserts whether the version overwrite dialog is currently visible.
   *
   * WHAT: Checks `versionModalOpen` and validates that `activeDocument` is non-null.
   * WHY: Ensuring an active document exists prevents rendering blank overwrite forms without GUID context.
   *
   * @returns `true` if active document exists and modal is flagged open, `false` otherwise.
   */
  protected isOpen(): boolean {
    return appStore.state.versionModalOpen && appStore.state.activeDocument !== null;
  }

  /**
   * Protects modal from premature dismissal during file upload and re-indexing.
   *
   * WHAT: Returns `!this.submitting`.
   * WHY: In-place revision overwrites update both primary records and vector store embeddings;
   * interrupting this process could leave document states mismatched.
   *
   * @returns `true` if dismissible, `false` while submitting.
   */
  protected canClose(): boolean {
    return !this.submitting;
  }

  /**
   * Dismisses the version overwrite dialog.
   *
   * WHAT: Invokes `appStore.closeVersionModal()`.
   * WHY: Cleans up modal overlay state across stores.
   */
  protected requestClose(): void {
    appStore.closeVersionModal();
  }

  /**
   * Binds store watchers for version modal visibility changes.
   *
   * WHAT: Listens to `versionModalOpen` and re-seeds the draft from the active document when opened.
   * WHY: Re-seeding on open ensures the form reflects the latest persisted metadata if previous edits were discarded.
   */
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

  /**
   * Resets local file buffers and seeds BibTeX metadata from the current active document.
   *
   * WHAT: Clears file buffers and copies `activeDocument.bibtex` into `this.bibtex`.
   * WHY: Isolating edits in a local copy prevents premature mutations from dirtying the live document view before save.
   */
  private resetDraft(): void {
    const doc = appStore.state.activeDocument;
    this.selectedFile = null;
    this.fileContentText = '';
    this.fileDataBase64 = '';
    this.errorMsg = '';
    this.submitting = false;
    this.bibtex = doc ? { ...doc.bibtex } : { ...EMPTY_BIBTEX };
  }

  /**
   * Generates the modal markup for version overwrite, file replacement, and metadata editing.
   *
   * WHAT: Emits modal header with current GUID/version, in-place overwrite rules notice,
   * replacement file picker, BibTeX field inputs, and action buttons.
   * WHY: Clear explanation of in-place GUID retention vs new document creation prevents user confusion
   * regarding bibliographic citation stability.
   *
   * @returns RawHtml modal content or empty string if no active document.
   */
  protected body(): RawHtml | string {
    const doc = appStore.state.activeDocument;
    if (!doc) {
      return '';
    }
    const currentVersion = doc.versionNumber || 1;

    return html`
      <div class="w-full flex flex-col overflow-hidden bg-white dark:bg-[#1c232b]">
        <!-- Header -->
        <div
          class="px-6 py-4 border-b border-gray-100 dark:border-[#2e3b4a] bg-white dark:bg-[#1c232b] flex items-center justify-between"
        >
          <div class="flex items-center gap-2.5">
            <div
              class="w-8 h-8 rounded-full bg-[#0070f2]/10 dark:bg-[#0070f2]/20 flex items-center justify-center text-[#0070f2] dark:text-[#4796ff] shrink-0"
            >
              ${icon('GitBranch', { className: 'w-4 h-4' })}
            </div>
            <div>
              <h3 class="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                Upload New Version / Overwrite Active Document
              </h3>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                Current active GUID:
                <span class="font-mono text-gray-700 dark:text-gray-300">${doc.guid.slice(0, 18)}...</span> (v${String(
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

        <!-- Body -->
        <div class="p-6 overflow-y-auto max-h-[68vh] space-y-5 text-xs text-gray-700 dark:text-gray-300" data-scroll-key="version-overwrite">
          <div
            class="p-3.5 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200 rounded-lg flex items-start gap-2.5"
          >
            ${icon('History', { className: 'w-4 h-4 text-[#0070f2] dark:text-[#38bdf8] shrink-0 mt-0.5' })}
            <div class="space-y-1">
              <p class="font-semibold text-blue-950 dark:text-blue-100 text-xs">Content Overwrite Rules:</p>
              <p class="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">
                Uploading a new version overwrites the content, format, and summaries of the existing
                document in-place. The document GUID
                (<span class="font-mono text-gray-800 dark:text-gray-200 font-medium">${doc.guid}</span>) is retained and version
                number advances to v${String(currentVersion + 1)}. A new GUID is only generated when
                uploading a new document from the main library page.
              </p>
            </div>
          </div>

          ${this.errorMsg
            ? html`<div
                class="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2"
              >
                ${icon('AlertCircle', { className: 'w-4 h-4 shrink-0' })}
                <span>${this.errorMsg}</span>
              </div>`
            : ''}

          <div>
            <ui5-label class="plib-label block font-semibold text-gray-700 dark:text-gray-200 mb-1.5 text-xs">
              Select Replacement File (Optional if only modifying metadata)
            </ui5-label>
            <ui5-file-uploader
              data-input="file"
              accept="${ACCEPTED_FILES}"
              hide-input
              class="plib-file-drop"
              ${this.submitting ? raw('disabled') : ''}
            >
              <div
                class="${cx(
                  'border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all',
                  this.selectedFile
                    ? 'border-emerald-400 dark:border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/30'
                    : 'border-gray-300 dark:border-[#38495f] hover:border-[#0070f2] dark:hover:border-[#4796ff] bg-[#f8fafc] dark:bg-[#232c37] hover:bg-[#f0f9ff]/50 dark:hover:bg-[#283442]'
                )}"
              >
                ${this.selectedFile
                  ? html`<div class="flex items-center justify-center gap-2.5 text-emerald-800 dark:text-emerald-200">
                      ${icon('FileCheck', { className: 'w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0' })}
                      <div class="text-left">
                        <div class="font-semibold text-sm text-gray-900 dark:text-gray-100">${this.selectedFile.name}</div>
                        <div class="text-xs text-gray-500 dark:text-gray-400">
                          ${(this.selectedFile.size / 1024).toFixed(1)} KB • Click or drop to choose a different file
                        </div>
                      </div>
                    </div>`
                  : html`<div class="flex flex-col items-center justify-center gap-1.5 text-gray-500 dark:text-gray-400">
                      ${icon('Upload', { className: 'w-7 h-7 text-gray-400 dark:text-gray-400' })}
                      <span class="font-semibold text-gray-800 dark:text-gray-200">Drag and drop, or click to choose a new physical file revision</span>
                      <span class="text-[11px] text-gray-400 dark:text-gray-400">PDF, DOCX, DOC, MD, TXT, XLS, XLSX, PPT, PPTX</span>
                    </div>`}
              </div>
            </ui5-file-uploader>
          </div>

          <div class="space-y-3 pt-3 border-t border-gray-100 dark:border-[#2e3b4a]">
            <h4 class="font-bold text-gray-900 dark:text-white text-xs">Updated BibTeX Information</h4>

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

        <!-- Footer -->
        <div
          class="px-6 py-3.5 border-t border-gray-100 dark:border-[#2e3b4a] bg-white dark:bg-[#1c232b] flex items-center justify-end gap-2.5 text-xs"
        >
          ${this.submitting
            ? raw(
                '<span class="mr-auto text-[11px] text-gray-500 dark:text-gray-400">Re-indexing content and regenerating the summary &mdash; this can take up to a minute.</span>'
              )
            : ''}
          <ui5-button class="plib-button" data-action="close" ${this.submitting ? raw('disabled') : ''}
            >Cancel</ui5-button
          >
          <ui5-button
            class="plib-button plib-button--accent"
            design="Emphasized"
            data-action="overwrite"
            ${this.submitting ? raw('disabled') : ''}
          >
            ${icon(this.submitting ? 'Loader2' : 'GitBranch', {
              className: this.submitting ? 'w-4 h-4 animate-spin mr-1.5' : 'w-4 h-4 mr-1.5'
            })}
            ${this.submitting ? 'Uploading & Re-indexing...' : 'Overwrite Active View'}
          </ui5-button>
        </div>
      </div>
    `;
  }

  /**
   * Helper rendering a labeled UI5 input component for a version metadata field.
   *
   * WHAT: Generates label and `ui5-input` element with `data-focus-key` preservation.
   * WHY: Preserving focus-keys maintains user cursor position during re-renders.
   *
   * @param label Field label.
   * @param key Property key on BibTeXMetadata.
   * @param value Current string value.
   * @param placeholder Optional placeholder text.
   * @returns Formatted HTML string.
   */
  private metadataField(
    label: string,
    key: keyof BibTeXMetadata,
    value: string,
    placeholder = ''
  ): string {
    return html`
      <div>
        <ui5-label class="plib-label block font-semibold text-gray-700 dark:text-gray-300 mb-1 text-xs">${label}</ui5-label>
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

  /**
   * Binds interaction events to replacement file pickers, metadata inputs, and submit button.
   *
   * WHAT: Registers delegated event listeners for file input changes, text synchronization, and submission click.
   * WHY: Centralized delegated event binding ensures proper lifecycle management without memory leaks.
   */
  protected bind(): void {
    this.on('ui5-file-uploader[data-input="file"]', 'change', (event) => {
      event.stopPropagation();
      this.handleFileChange(event.currentTarget as FileUploader);
    });

    this.onAll('ui5-input[data-bibtex]', 'input', (event) => {
      const input = event.currentTarget as Input;
      const key = input.dataset.bibtex as keyof BibTeXMetadata;
      this.bibtex = { ...this.bibtex, [key]: input.value };
    });

    this.on('[data-action="overwrite"]', 'click', () => void this.submit());
  }

  /**
   * Handles user selection of a replacement file asset.
   *
   * WHAT: Reads replacement file as base64 data and optional plain text, and updates local state.
   * WHY: Reading the replacement file immediately ensures upload payloads are fully buffered before submission.
   *
   * @param input HTML file input element.
   */
  private handleFileChange(input: FileUploader): void {
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    // UI5's FileUploader validates `maxFileSize` only — `accept` is enforced by the native
    // picker but NOT for drag-and-dropped files, so the extension is re-checked here.
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      this.errorMsg = `Unsupported file type (.${extension}). Supported: ${ALLOWED_EXTENSIONS.join(', ')}`;
      this.render();
      return;
    }

    this.errorMsg = '';
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

  /**
   * Dispatches the in-place version overwrite request to the active backend.
   *
   * WHAT: Calls `requestBackend('overwriteVersion', ...)`, updates `activeDocument` in `appStore`,
   * refreshes document list, announces success toast, and closes modal.
   * WHY: Performing an in-place version advancement maintains the document's stable GUID while updating
   * full-text and vector content across all backend stores.
   */
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
