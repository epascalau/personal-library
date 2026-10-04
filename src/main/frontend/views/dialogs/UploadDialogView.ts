/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Vanilla + UI5 replacement for `components/UploadDialog.tsx`.
 *
 * Preserves the complete ingestion flow: single-file validation, base64 +
 * plain-text reads, cancellable AI metadata extraction, the BibTeX schema form
 * whose fields change with `@entryType`, and the four-step progress pipeline.
 */

import { cx, html, raw, RawHtml } from '../../core/html';
import { watch } from '../../core/store';
import { requestBackend } from '../../services/backend';
import { appStore } from '../../stores/appStore';
import { i18nStore } from '../../stores/i18nStore';
import { icon } from '../../ui5/icons';
import { DialogView } from './DialogView';
import type { BibTeXMetadata, BibTeXType } from '../../types';
import type Input from '@ui5/webcomponents/dist/Input.js';
import type Select from '@ui5/webcomponents/dist/Select.js';
import type TextArea from '@ui5/webcomponents/dist/TextArea.js';

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'doc', 'md', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'];
const ACCEPT_ATTRIBUTE = '.pdf,.docx,.doc,.md,.txt,.xls,.xlsx,.ppt,.pptx';

const ENTRY_TYPES: Array<{ value: BibTeXType; label: string }> = [
  { value: 'article', label: '@article (Journal or magazine article)' },
  { value: 'inproceedings', label: '@inproceedings (Conference proceedings paper)' },
  { value: 'book', label: '@book (Monograph or published book)' },
  { value: 'techreport', label: '@techreport (Technical report or whitepaper)' },
  { value: 'phdthesis', label: '@phdthesis (Doctoral or master dissertation)' },
  { value: 'misc', label: '@misc (General document or online reference)' }
];

const createEmptyBibtex = (): BibTeXMetadata =>
  ({
    entryType: 'book',
    bibKey: '',
    title: '',
    author: '',
    year: new Date().getFullYear().toString(),
    month: '',
    journal: '',
    booktitle: '',
    volume: '',
    number: '',
    pages: '',
    publisher: '',
    edition: '',
    institution: '',
    school: '',
    doi: '',
    url: '',
    abstract: '',
    keywords: ''
  }) as BibTeXMetadata;

const stripExtension = (fileName: string): string => fileName.replace(/\.[^/.]+$/, '');

const toCitationKey = (fileName: string): string =>
  stripExtension(fileName).toLowerCase().replace(/\W+/g, '_');

const toProvisionalTitle = (fileName: string): string => {
  const clean = stripExtension(fileName).replace(/[_-]/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

export class UploadDialogView extends DialogView {
  private selectedFile: File | null = null;

  private fileContentText = '';

  private fileDataBase64 = '';

  private extracting = false;

  private submitting = false;

  private uploadProgress = 0;

  private progressStatus = '';

  private errorMsg = '';

  private bibtex: BibTeXMetadata = createEmptyBibtex();

  /** Counterpart of `extractionCancelledRef` in the React component. */
  private extractionCancelled = false;

  /**
   * Initializes the UploadDialogView component.
   *
   * WHAT: Invokes base DialogView constructor with `plib-dialog--upload` modal styling class.
   * WHY: Scoping upload modal styles ensures full-width multi-column BibTeX forms display cleanly across breakpoints.
   */
  constructor() {
    super(undefined, 'plib-dialog plib-dialog--upload');
  }

  /**
   * Checks whether the document upload dialog is open.
   *
   * WHAT: Queries `appStore.state.uploadModalOpen`.
   * WHY: Synchronizes dialog visibility with global store state triggered by ShellBar or empty state buttons.
   *
   * @returns `true` if open, `false` otherwise.
   */
  protected isOpen(): boolean {
    return appStore.state.uploadModalOpen;
  }

  /**
   * Prevents dialog dismissal while ingestion submission is executing.
   *
   * WHAT: Returns `!this.submitting`.
   * WHY: Blocking dismissal during multi-step document ingestion (storage, chunking, vector indexing, summarization)
   * prevents half-completed uploads from being abandoned in the backend.
   *
   * @returns `true` if safe to close, `false` while submitting.
   */
  protected canClose(): boolean {
    return !this.submitting;
  }

  /**
   * Dispatches store action to close upload dialog.
   *
   * WHAT: Invokes `appStore.closeUpload()`.
   * WHY: Centralizing closure in `appStore` ensures application-level modal state is consistently reset.
   */
  protected requestClose(): void {
    appStore.closeUpload();
  }

  /**
   * Registers store watchers for upload dialog visibility and language dictionary.
   *
   * WHAT: Listens for `uploadModalOpen` (resetting draft state on new open) and `i18nStore` updates.
   * WHY: Clearing previous draft fields upon reopening ensures each upload begins in a clean, predictable state.
   */
  protected onMount(): void {
    super.onMount();
    this.track(
      watch(
        appStore,
        (state) => state.uploadModalOpen,
        (open) => {
          if (open) {
            this.resetDraft();
          }
          this.requestRender();
        }
      )
    );
    this.track(i18nStore.subscribe(() => this.requestRender()));
  }

  /**
   * Resets local file buffers, progress indicators, errors, and BibTeX schema fields.
   *
   * WHAT: Clears `selectedFile`, raw text/base64 buffers, progress flags, and resets `bibtex` to empty schema.
   * WHY: Prevents stale file data or leftover error messages from leaking into subsequent upload workflows.
   */
  private resetDraft(): void {
    this.selectedFile = null;
    this.fileContentText = '';
    this.fileDataBase64 = '';
    this.extracting = false;
    this.submitting = false;
    this.uploadProgress = 0;
    this.progressStatus = '';
    this.errorMsg = '';
    this.bibtex = createEmptyBibtex();
    this.extractionCancelled = false;
  }

  // ------------------------------------------------------------------
  // Template
  // ------------------------------------------------------------------

  /**
   * Renders the complete upload modal layout.
   *
   * WHAT: Composes dialog header, error alerts, drag-and-drop zone, AI extraction notice, BibTeX schema form,
   * 4-step progress indicator, and action footer.
   * WHY: Encapsulating the ingestion lifecycle into dedicated sub-renderers keeps the template modular and readable.
   *
   * @returns RawHtml modal content.
   */
  protected body(): RawHtml {
    const t = i18nStore.state.t;

    return html`
      <div class="w-full flex flex-col overflow-hidden bg-white dark:bg-[#1c232b]">
        <!-- Header -->
        <div
          class="px-6 py-4 border-b border-gray-100 dark:border-[#2e3b4a] bg-white dark:bg-[#1c232b] flex items-center justify-between"
        >
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-[#0070f2]/10 dark:bg-[#0070f2]/20 flex items-center justify-center text-[#0070f2] dark:text-[#4796ff] shrink-0">
              ${icon('Upload', { className: 'w-4 h-4' })}
            </div>
            <div>
              <h3 class="text-sm font-bold text-gray-900 dark:text-white leading-tight">${t.upload.title}</h3>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 font-normal mt-0.5">${t.upload.subtitle}</p>
            </div>
          </div>
          <ui5-button
            class="plib-button plib-button--icon"
            design="Transparent"
            icon="decline"
            data-action="close"
            accessible-name="${t.common.cancel}"
            ${this.submitting ? raw('disabled') : ''}
          ></ui5-button>
        </div>

        <!-- Body -->
        <div class="p-6 overflow-y-auto max-h-[68vh] space-y-5 text-xs text-gray-700 dark:text-gray-300" data-scroll-key="upload-body">
          ${this.errorMsg
            ? html`<div
                class="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 rounded-lg flex items-center gap-2"
              >
                ${icon('AlertCircle', { className: 'w-4 h-4 shrink-0' })}
                <span>${this.errorMsg}</span>
              </div>`
            : ''}

          ${this.fileDropZone(t.upload.dragDrop, t.upload.supportedFormats)}
          ${this.extractionNotice()}
          ${this.metadataForm()}
          ${this.progressSection()}
        </div>

        <!-- Action Footer -->
        ${this.footer()}
      </div>
    `;
  }

  /**
   * Generates the drag-and-drop file target and file picker container.
   *
   * WHAT: Emits a clickable dashed upload box showing file name/size when loaded or upload icon when empty.
   * WHY: Interactive visual feedback immediately confirms successful file selection before ingestion begins.
   *
   * @param dragDropLabel Localized prompt.
   * @param supportedFormats Localized list of file extensions.
   * @returns RawHtml drop zone markup.
   */
  private fileDropZone(dragDropLabel: string, supportedFormats: string): RawHtml {
    return html`
      <div>
        <label class="block font-semibold text-gray-700 dark:text-gray-200 mb-1.5">${dragDropLabel}</label>
        <div
          data-action="pick-file"
          role="button"
          tabindex="0"
          class="${cx(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all',
            this.selectedFile
              ? 'border-emerald-400 dark:border-emerald-500/80 bg-emerald-50/50 dark:bg-emerald-950/30'
              : 'border-gray-300 dark:border-[#38495f] hover:border-[#0070f2] dark:hover:border-[#4796ff] bg-[#f8fafc] dark:bg-[#232c37] hover:bg-[#f0f9ff]/50 dark:hover:bg-[#283442]'
          )}"
        >
          <input
            type="file"
            data-input="file"
            accept="${ACCEPT_ATTRIBUTE}"
            class="hidden"
            ${this.submitting ? raw('disabled') : ''}
          />
          ${this.selectedFile
            ? html`<div class="flex items-center justify-center gap-3 text-emerald-800 dark:text-emerald-200">
                ${icon('FileCheck', { className: 'w-8 h-8 text-emerald-600 dark:text-emerald-400 shrink-0' })}
                <div class="text-left">
                  <div class="font-semibold text-sm text-gray-900 dark:text-gray-100">${this.selectedFile.name}</div>
                  <div class="text-xs text-gray-500 dark:text-gray-400">
                    ${(this.selectedFile.size / 1024).toFixed(1)} KB • Click to choose a different file
                  </div>
                </div>
              </div>`
            : html`<div class="flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
                ${icon('Upload', { className: 'w-8 h-8 text-gray-400 dark:text-gray-400' })}
                <span class="font-semibold text-gray-800 dark:text-gray-200">${dragDropLabel}</span>
                <span class="text-[11px] text-gray-400 dark:text-gray-400">${supportedFormats}</span>
              </div>`}
        </div>
      </div>
    `;
  }

  /**
   * Displays an animated banner during automated AI BibTeX metadata extraction.
   *
   * WHAT: Shows spinner and a "Skip & Fill Manually" button while `extracting` is true.
   * WHY: Giving users a manual skip button ensures they are never blocked if the background LLM
   * or extraction service takes too long or fails to respond.
   *
   * @returns RawHtml banner or empty string.
   */
  private extractionNotice(): RawHtml | string {
    if (!this.extracting) {
      return '';
    }
    return html`
      <div
        class="p-3 bg-[#eff6ff] dark:bg-blue-950/40 border border-[#bfdbfe] dark:border-blue-900/60 rounded-lg flex items-center justify-between gap-3 text-[#1e40af] dark:text-[#93c5fd] animate-in fade-in duration-200"
      >
        <div class="flex items-center gap-2.5">
          ${icon('Loader2', { className: 'w-4 h-4 text-[#0070f2] dark:text-[#38bdf8] animate-spin shrink-0' })}
          <span class="text-xs">
            AI is analyzing document text to extract standard BibTeX fields (author, publication
            year, journal, citation key)...
          </span>
        </div>
        <button
          type="button"
          data-action="skip-extraction"
          class="text-[11px] font-semibold text-[#0070f2] dark:text-[#38bdf8] hover:text-[#0854a0] hover:bg-blue-100/60 dark:hover:bg-blue-900/60 px-2.5 py-1 rounded bg-white dark:bg-[#1c232b] border border-[#bfdbfe] dark:border-blue-800 transition cursor-pointer shrink-0 shadow-2xs"
          title="Skip automated extraction and proceed with manual entry"
        >
          Skip &amp; Fill Manually
        </button>
      </div>
    `;
  }

  /**
   * Generates the BibTeX schema editor form.
   *
   * WHAT: Renders entry type selector (@book, @article, etc.), core metadata inputs (key, title, author, year),
   * dynamic type-specific fields, DOI/URL, keywords, and abstract textarea.
   * WHY: Preserving standard BibTeX field formats ensures academic bibliography export interoperability.
   *
   * @returns RawHtml metadata review form.
   */
  private metadataForm(): RawHtml {
    const b = this.bibtex;

    return html`
      <div class="space-y-4 pt-2 border-t border-gray-100 dark:border-[#2e3b4a]">
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-gray-900 dark:text-white flex items-center gap-1.5 text-sm">
            ${icon('Sparkles', { className: 'w-4 h-4 text-amber-500' })}
            BibTeX Schema &amp; Metadata Review
          </h4>
          <span class="text-[11px] text-gray-400 dark:text-gray-400">
            You can review or override any auto-extracted field
          </span>
        </div>

        <div class="bg-[#f8fafc] dark:bg-[#232c37] p-3.5 rounded-lg border border-gray-200 dark:border-[#2e3b4a]">
          <label class="block font-semibold text-gray-700 dark:text-gray-200 mb-1.5 text-xs">
            BibTeX Publication Type (@type)
          </label>
          <ui5-select
            class="plib-input w-full font-mono text-xs"
            data-action="entry-type"
            accessible-name="BibTeX Publication Type"
          >
            ${raw(
              ENTRY_TYPES.map(
                (entry) =>
                  html`<ui5-option
                    value="${entry.value}"
                    ${b.entryType === entry.value ? raw('selected') : ''}
                    >${entry.label}</ui5-option
                  >`.toString()
              ).join('')
            )}
          </ui5-select>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${raw(
            this.field('bibKey', 'Citation Key', b.bibKey, {
              required: true,
              placeholder: 'e.g. vaswani2017attention',
              inputClass: 'font-mono'
            })
          )}
          ${raw(
            this.field('title', 'Document Title', b.title, {
              required: true,
              placeholder: 'Full title of the paper or document'
            })
          )}
          ${raw(
            this.field('author', 'Author(s)', b.author, {
              required: true,
              placeholder: 'e.g. Last, First and CoAuthor, First'
            })
          )}

          <div class="grid grid-cols-2 gap-2">
            ${raw(
              this.field('year', 'Year', b.year, { required: true, placeholder: 'e.g. 2024' })
            )}
            ${raw(this.field('month', 'Month', b.month || '', { placeholder: 'e.g. October' }))}
          </div>
        </div>

        ${this.dynamicFields()}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${raw(
            this.field('doi', 'DOI', b.doi || '', { placeholder: 'e.g. 10.1145/3290605.3300249' })
          )}
          ${raw(
            this.field('url', 'URL', b.url || '', {
              placeholder: 'e.g. https://arxiv.org/abs/1706.03762',
              type: 'URL'
            })
          )}
        </div>

        ${raw(
          this.field('keywords', 'Keywords', b.keywords || '', {
            placeholder: 'Comma separated: Deep Learning, Information Retrieval, Transformers'
          })
        )}

        <div>
          <label class="block font-semibold text-gray-700 dark:text-gray-300 mb-1">Abstract</label>
          <ui5-textarea
            class="plib-input w-full text-xs"
            data-bibtex="abstract"
            data-focus-key="upload-abstract"
            rows="3"
            placeholder="Brief summary or abstract of the document..."
            value="${b.abstract || ''}"
            accessible-name="Abstract"
          ></ui5-textarea>
        </div>
      </div>
    `;
  }

  /**
   * Generates type-specific form fields based on the chosen `@entryType`.
   *
   * WHAT: Emits journal/volume/number/pages for `@article`, booktitle/publisher for `@inproceedings`,
   * publisher/edition for `@book`, and institution/edition for `@techreport`.
   * WHY: Conditionally displaying only relevant attributes prevents visual clutter and adheres to standard BibTeX specifications.
   *
   * @returns RawHtml field group or empty string.
   */
  private dynamicFields(): RawHtml | string {
    const b = this.bibtex;

    if (b.entryType === 'article') {
      return html`
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="md:col-span-3">
            ${raw(
              this.field('journal', 'Journal Name', b.journal || '', {
                placeholder: 'e.g. IEEE Transactions on Software Engineering',
                bare: true
              })
            )}
          </div>
          ${raw(
            this.field('volume', 'Volume', b.volume || '', {
              placeholder: 'e.g. 42'
            })
          )}
          ${raw(
            this.field('number', 'Number / Issue', b.number || '', {
              placeholder: 'e.g. 3'
            })
          )}
          ${raw(
            this.field('pages', 'Pages', b.pages || '', {
              placeholder: 'e.g. 101--115'
            })
          )}
        </div>
      `;
    }

    if (b.entryType === 'inproceedings') {
      return html`
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            ${raw(
              this.field('booktitle', 'Booktitle / Conference Proceedings', b.booktitle || '', {
                placeholder: 'e.g. Advances in Neural Information Processing Systems (NeurIPS)',
                bare: true
              })
            )}
          </div>
          ${raw(
            this.field('publisher', 'Publisher / Organization', b.publisher || '', {
              placeholder: 'e.g. ACM / IEEE'
            })
          )}
          ${raw(
            this.field('pages', 'Pages', b.pages || '', {
              placeholder: 'e.g. 200--212'
            })
          )}
        </div>
      `;
    }

    if (b.entryType === 'book') {
      return html`
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${raw(
            this.field('publisher', 'Publisher', b.publisher || '', {
              placeholder: "e.g. Springer, O'Reilly"
            })
          )}
          ${raw(
            this.field('edition', 'Edition', b.edition || '', {
              placeholder: 'e.g. 2nd Edition'
            })
          )}
        </div>
      `;
    }

    if (b.entryType === 'techreport') {
      return html`
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          ${raw(
            this.field('institution', 'Institution', b.institution || '', {
              placeholder: 'e.g. SAP SE, MIT CSAIL'
            })
          )}
          ${raw(
            this.field('edition', 'Report Number / Edition', b.edition || '', {
              placeholder: 'e.g. TR-2024-01'
            })
          )}
        </div>
      `;
    }

    return '';
  }

  /**
   * Helper producing a labeled UI5 input component for a BibTeX property.
   *
   * WHAT: Generates an input element with label, required asterisk indicator, focus preservation key, and accessibility attributes.
   * WHY: Enforces uniform spacing, font styling, and focus-key management across all 15+ BibTeX form inputs.
   *
   * @param key Property key on BibTeXMetadata.
   * @param label Human-readable label.
   * @param value Current string value.
   * @param options Input styling and layout options.
   * @returns Formatted HTML string.
   */
  private field(
    key: keyof BibTeXMetadata,
    label: string,
    value: string,
    options: {
      required?: boolean;
      placeholder?: string;
      type?: string;
      inputClass?: string;
      /** Field sits on a tinted panel, so the control keeps a white background. */
      onWhite?: boolean;
      /** Skips the wrapping `<div>` when the caller already provides one. */
      bare?: boolean;
    } = {}
  ): string {
    const control = html`
      <label class="block font-semibold text-gray-700 dark:text-gray-300 mb-1 text-xs">
        ${label}${options.required ? html`<span class="text-red-500"> *</span>` : ''}
      </label>
      <ui5-input
        class="${cx('plib-input w-full text-xs', options.inputClass)}"
        data-bibtex="${String(key)}"
        data-focus-key="upload-${String(key)}"
        type="${options.type ?? 'Text'}"
        value="${value}"
        placeholder="${options.placeholder ?? ''}"
        accessible-name="${label}"
      ></ui5-input>
    `.toString();

    return options.bare ? control : html`<div>${raw(control)}</div>`.toString();
  }

  /**
   * Renders the ingestion pipeline progress bar and status message during submission.
   *
   * WHAT: Emits an animated `ui5-progress-indicator` showing current percentage and pipeline phase.
   * WHY: Transparent feedback during multi-second pipeline execution (storage, chunking, embedding, summarization)
   * reassures the user that the operation is actively progressing.
   *
   * @returns RawHtml progress layout or empty string.
   */
  private progressSection(): RawHtml | string {
    if (!this.submitting) {
      return '';
    }
    return html`
      <div class="p-4 bg-[#f8fafc] dark:bg-[#232c37] rounded-lg border border-gray-200 dark:border-[#2e3b4a] space-y-2">
        <div class="flex items-center justify-between text-xs font-semibold text-gray-800 dark:text-gray-200">
          <span class="flex items-center gap-2">
            ${icon('Loader2', { className: 'w-4 h-4 text-[#0070f2] dark:text-[#4796ff] animate-spin' })}
            ${this.progressStatus}
          </span>
          <span class="font-mono text-gray-600 dark:text-gray-300">${String(this.uploadProgress)}%</span>
        </div>
        <ui5-progress-indicator
          class="plib-progress w-full"
          value="${String(this.uploadProgress)}"
          accessible-name="${this.progressStatus}"
        ></ui5-progress-indicator>
        <div class="text-[10px] text-gray-500 dark:text-gray-400">
          Independent record with unique GUID is being generated; vector store embeddings &amp; dual
          summaries in progress.
        </div>
      </div>
    `;
  }

  /**
   * Generates the dialog action footer.
   *
   * WHAT: Emits extraction status notices, cancel button, and submit button with dynamic loading labels and tooltips.
   * WHY: Disabling submit while extracting or submitting prevents double-submissions and race conditions.
   *
   * @returns RawHtml footer markup.
   */
  private footer(): RawHtml {
    const t = i18nStore.state.t;
    const submitDisabled = !this.selectedFile || this.submitting || this.extracting;
    const submitTooltip = this.extracting
      ? 'Please wait for BibTeX metadata extraction to finish, or click "Skip & Fill Manually"'
      : !this.selectedFile
        ? 'Please select a document file first'
        : 'Submit document and start ingestion pipeline';

    return html`
      <div
        class="px-6 py-3.5 border-t border-gray-100 dark:border-[#2e3b4a] bg-white dark:bg-[#1c232b] flex items-center justify-between gap-3 text-xs"
      >
        <div class="text-[11px] text-gray-500 dark:text-gray-400">
          ${this.extracting
            ? html`<span class="flex items-center gap-1.5 text-[#0070f2] dark:text-[#4796ff] font-medium">
                ${icon('Loader2', { className: 'w-3.5 h-3.5 animate-spin' })}
                Extracting BibTeX metadata... Submit is paused.
              </span>`
            : ''}
        </div>

        <div class="flex items-center gap-2.5">
          <ui5-button
            class="plib-button"
            data-action="close"
            ${this.submitting ? raw('disabled') : ''}
            >${t.common.cancel}</ui5-button
          >
          <ui5-button
            class="plib-button plib-button--accent"
            design="Emphasized"
            data-action="submit-upload"
            tooltip="${submitTooltip}"
            ${submitDisabled ? raw('disabled') : ''}
          >
            ${icon(this.submitting || this.extracting ? 'Loader2' : 'Upload', {
              className: cx(
                'w-4 h-4 mr-1.5',
                (this.submitting || this.extracting) && 'animate-spin'
              )
            })}
            <span
              >${this.submitting
                ? t.upload.uploadingButton
                : this.extracting
                  ? t.upload.extractingAi
                  : t.upload.submitButton}</span
            >
          </ui5-button>
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------------
  // Behaviour
  // ------------------------------------------------------------------

  /**
   * Binds interaction events to file pickers, inputs, selects, and action buttons.
   *
   * WHAT: Sets up click delegation for file picker triggering, input bindings for BibTeX field sync,
   * publication type select handler, and submit button click handler.
   * WHY: Direct delegated binding ensures clean interaction with UI5 Web Components and native inputs.
   */
  protected bind(): void {
    this.on('[data-action="pick-file"]', 'click', () => {
      if (!this.submitting) {
        this.$<HTMLInputElement>('input[data-input="file"]')?.click();
      }
    });

    this.on('input[data-input="file"]', 'change', (event) => {
      event.stopPropagation();
      void this.handleFileSelect(event.currentTarget as HTMLInputElement);
    });

    this.on('[data-action="skip-extraction"]', 'click', () => this.skipExtraction());

    this.on('ui5-select[data-action="entry-type"]', 'change', (event) => {
      const select = event.currentTarget as Select;
      this.bibtex = {
        ...this.bibtex,
        entryType: (select.selectedOption?.value as BibTeXType) || 'book'
      };
      this.render();
    });

    this.onAll('ui5-input[data-bibtex]', 'input', (event) => {
      const input = event.currentTarget as Input;
      this.patchBibtex(input.dataset.bibtex as keyof BibTeXMetadata, input.value);
    });

    this.on('ui5-textarea[data-bibtex="abstract"]', 'input', (event) => {
      const textarea = event.currentTarget as TextArea;
      this.patchBibtex('abstract', textarea.value);
    });

    this.on('[data-action="submit-upload"]', 'click', () => void this.submit());
  }

  /**
   * Updates an individual field within the local BibTeX state.
   *
   * WHAT: Immutably patches `this.bibtex` with `[key]: value`.
   * WHY: Keeps metadata state up to date with live user keystrokes without needing full-form DOM queries.
   *
   * @param key BibTeXMetadata property.
   * @param value User-entered text.
   */
  private patchBibtex(key: keyof BibTeXMetadata, value: string): void {
    this.bibtex = { ...this.bibtex, [key]: value };
  }

  /**
   * Aborts automated AI metadata extraction and prepares fallback provisional fields.
   *
   * WHAT: Sets `extractionCancelled = true`, stops extracting spinner, and populates provisional title/bibKey from file name if blank.
   * WHY: Allows the user to bypass slow or offline AI extraction services immediately.
   */
  private skipExtraction(): void {
    this.extractionCancelled = true;
    this.extracting = false;
    if (this.selectedFile && !this.bibtex.title) {
      this.bibtex = {
        ...this.bibtex,
        title: this.bibtex.title || toProvisionalTitle(this.selectedFile.name),
        bibKey: this.bibtex.bibKey || toCitationKey(this.selectedFile.name)
      };
    }
    this.render();
  }

  /**
   * Reads a File object into a base64 Data URL string via FileReader.
   *
   * WHAT: Returns a Promise resolving with base64 encoded data string.
   * WHY: Enables transmission of binary files (PDFs, Word documents) to REST endpoints and storage adapters.
   *
   * @param file File to read.
   * @returns Base64 Data URL string.
   */
  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => reject(new Error('Failed to read file asset as base64'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Reads plain text file content via FileReader.
   *
   * WHAT: Returns a Promise resolving with text file contents.
   * WHY: Text and markdown files can be read synchronously in the browser for instant client-side RAG chunking.
   *
   * @param file File to read.
   * @returns Extracted plain text string.
   */
  private readPlainText(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve((event.target?.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsText(file);
    });
  }

  /**
   * Handles user file selection, validates file type, reads content, and triggers AI metadata extraction.
   *
   * WHAT: Validates file extension against `ALLOWED_EXTENSIONS`, generates provisional title/key, reads base64/text,
   * and invokes `extractMetadata` backend service.
   * WHY: Early client-side validation prevents uploading unsupported file types, and speculative auto-extraction
   * pre-fills the form so the user rarely has to enter metadata by hand.
   *
   * @param input File input element.
   */
  private async handleFileSelect(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      this.errorMsg = `Unsupported file type (.${extension}). Supported: ${ALLOWED_EXTENSIONS.join(', ')}`;
      this.render();
      return;
    }

    this.errorMsg = '';
    this.selectedFile = file;
    this.extractionCancelled = false;
    this.bibtex = {
      ...this.bibtex,
      title: toProvisionalTitle(file.name),
      bibKey: toCitationKey(file.name)
    };

    try {
      this.extracting = true;
      this.render();

      const base64Data = await this.readFileAsBase64(file);
      this.fileDataBase64 = base64Data;

      let textContent = '';
      if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        textContent = await this.readPlainText(file);
        this.fileContentText = textContent;
      } else {
        this.fileContentText = '';
      }

      const extracted = await requestBackend('extractMetadata', {
        fileName: file.name,
        sampleContent: textContent.slice(0, 4000),
        fileData: base64Data,
        mimeType:
          file.type || (extension === 'pdf' ? 'application/pdf' : 'application/octet-stream')
      });

      if (!this.extractionCancelled && extracted) {
        this.bibtex = {
          ...this.bibtex,
          ...extracted,
          bibKey: extracted.bibKey || toCitationKey(file.name)
        };
        if (extracted.extractedText) {
          this.fileContentText = extracted.extractedText;
        }
      }
    } catch (err) {
      console.warn('Metadata auto-extraction warning:', err);
    } finally {
      if (!this.extractionCancelled) {
        this.extracting = false;
      }
      this.render();
    }
  }

  /**
   * Promisified delay helper for progress milestone pauses.
   *
   * WHAT: Pauses execution for `ms` milliseconds.
   * WHY: Paces multi-stage ingestion progress updates so the user can visually track each processing milestone.
   *
   * @param ms Milliseconds to wait.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Submits the document along with its reviewed BibTeX metadata to the ingestion pipeline.
   *
   * WHAT: Validates form readiness, executes the 4-step pipeline (physical storage, text chunking,
   * vector indexing, dual-model summaries), notifies stores, triggers document list refresh, and closes modal.
   * WHY: Sequencing steps with clear progress updates guarantees all downstream search indices and RAG embeddings
   * are fully synchronized before the document is displayed in the UI.
   */
  private async submit(): Promise<void> {
    if (!this.selectedFile) {
      this.errorMsg = 'Please select a file to upload';
      this.render();
      return;
    }

    if (this.extracting) {
      this.errorMsg =
        'Please wait for BibTeX metadata extraction to finish, or click "Skip & Fill Manually".';
      this.render();
      return;
    }

    if (this.submitting) {
      return;
    }

    this.submitting = true;
    this.errorMsg = '';
    this.render();

    try {
      this.setProgress(
        25,
        'Step 1 of 4: Uploading physical file asset to repository storage...'
      );
      await this.delay(400);

      this.setProgress(
        50,
        'Step 2 of 4: Processing document structure & generating text chunks...'
      );
      await this.delay(450);

      this.setProgress(
        75,
        'Step 3 of 4: Indexing vector embeddings into Qdrant collection...'
      );

      const newDoc = await requestBackend('uploadDocument', {
        file: this.selectedFile,
        fileName: this.selectedFile.name,
        fileFormat: this.selectedFile.name.split('.').pop()?.toLowerCase() || 'txt',
        fileSize: this.selectedFile.size,
        fileContent: this.fileContentText || undefined,
        fileData: this.fileDataBase64 || undefined,
        mimeType: this.selectedFile.type || 'application/pdf',
        bibtex: this.bibtex
      });

      this.setProgress(
        95,
        'Step 4 of 4: Computing dual-model summaries (Llama 3.3 & Mistral)...'
      );
      await this.delay(200);

      this.setProgress(100, 'Completed: Document successfully ingested and indexed!');
      await this.delay(300);

      appStore.showToast(`"${newDoc.bibtex.title || newDoc.fileName}" uploaded & indexed!`);
      void appStore.fetchDocuments();
      void appStore.loadSingleDocument(newDoc.guid);
      appStore.closeUpload();
    } catch (err: any) {
      this.errorMsg = err?.message || 'Error occurred during ingestion';
    } finally {
      this.submitting = false;
      this.render();
    }
  }

  /**
   * Updates progress state and triggers re-render.
   *
   * WHAT: Sets `uploadProgress` percentage and `progressStatus` label, then calls `render()`.
   * WHY: Keeps the UI5 progress bar and status text synchronized with the executing ingestion phase.
   *
   * @param value Percentage complete (0-100).
   * @param status Milestone status description.
   */
  private setProgress(value: number, status: string): void {
    this.uploadProgress = value;
    this.progressStatus = status;
    this.render();
  }
}
