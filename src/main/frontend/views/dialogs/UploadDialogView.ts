/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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

  constructor() {
    super(undefined);
  }

  protected isOpen(): boolean {
    return appStore.state.uploadModalOpen;
  }

  protected canClose(): boolean {
    return !this.submitting;
  }

  protected requestClose(): void {
    appStore.closeUpload();
  }

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

  protected body(): RawHtml {
    const t = i18nStore.state.t;

    return html`
      <div slot="header" class="w-full">
        <div
          class="px-6 py-4 border-b border-gray-200 bg-[#f8fafc] flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            ${icon('Upload', { className: 'w-5 h-5 text-[#0070f2]' })}
            <div>
              <h3 class="text-base font-bold text-gray-900">${t.upload.title}</h3>
              <p class="text-xs text-gray-500">${t.upload.subtitle}</p>
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
      </div>

      <div class="p-6 overflow-y-auto space-y-6 flex-1 text-xs" data-scroll-key="upload-body">
        ${this.errorMsg
          ? html`<div
              class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2"
            >
              ${icon('AlertCircle', { className: 'w-4 h-4 shrink-0' })}
              <span>${this.errorMsg}</span>
            </div>`
          : ''}

        ${this.fileDropZone(t.upload.dragDrop, t.upload.supportedFormats)}
        ${this.extractionNotice()} ${this.metadataForm()} ${this.progressSection()}
      </div>

      ${this.footer()}
    `;
  }

  private fileDropZone(dragDropLabel: string, supportedFormats: string): RawHtml {
    return html`
      <div>
        <label class="block font-semibold text-gray-700 mb-2">${dragDropLabel}</label>
        <div
          data-action="pick-file"
          role="button"
          tabindex="0"
          class="${cx(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all',
            this.selectedFile
              ? 'border-green-400 bg-green-50/40'
              : 'border-gray-300 hover:border-[#0070f2] bg-[#f8fafc] hover:bg-[#f0f9ff]/50'
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
            ? html`<div class="flex items-center justify-center gap-3 text-green-800">
                ${icon('FileCheck', { className: 'w-8 h-8 text-green-600' })}
                <div class="text-left">
                  <div class="font-semibold text-sm">${this.selectedFile.name}</div>
                  <div class="text-xs text-gray-500">
                    ${(this.selectedFile.size / 1024).toFixed(1)} KB • Click to choose a different
                    file
                  </div>
                </div>
              </div>`
            : html`<div class="flex flex-col items-center justify-center gap-2 text-gray-500">
                ${icon('Upload', { className: 'w-8 h-8 text-gray-400' })}
                <span class="font-semibold text-gray-700">${dragDropLabel}</span>
                <span class="text-[11px] text-gray-400">${supportedFormats}</span>
              </div>`}
        </div>
      </div>
    `;
  }

  private extractionNotice(): RawHtml | string {
    if (!this.extracting) {
      return '';
    }
    return html`
      <div
        class="p-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-lg flex items-center justify-between gap-3 text-[#1e40af] animate-in fade-in duration-200"
      >
        <div class="flex items-center gap-2.5">
          ${icon('Loader2', { className: 'w-4 h-4 text-[#0070f2] animate-spin shrink-0' })}
          <span class="text-xs">
            AI is analyzing document text to extract standard BibTeX fields (author, publication
            year, journal, citation key)...
          </span>
        </div>
        <button
          type="button"
          data-action="skip-extraction"
          class="text-[11px] font-semibold text-[#0070f2] hover:text-[#0854a0] hover:bg-blue-100/60 px-2.5 py-1 rounded bg-white border border-[#bfdbfe] transition cursor-pointer shrink-0 shadow-2xs"
          title="Skip automated extraction and proceed with manual entry"
        >
          Skip &amp; Fill Manually
        </button>
      </div>
    `;
  }

  private metadataForm(): RawHtml {
    const b = this.bibtex;

    return html`
      <div class="space-y-4 pt-2 border-t border-gray-100">
        <div class="flex items-center justify-between">
          <h4 class="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
            ${icon('Sparkles', { className: 'w-4 h-4 text-amber-500' })}
            BibTeX Schema &amp; Metadata Review
          </h4>
          <span class="text-[11px] text-gray-400">
            You can review or override any auto-extracted field
          </span>
        </div>

        <div class="bg-[#f8fafc] p-3 rounded-lg border border-gray-200">
          <label class="block font-semibold text-gray-700 mb-1">
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
          <label class="block font-semibold text-gray-600 mb-1">Abstract</label>
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

  /** The `@entryType`-specific field groups, each with its original tint. */
  private dynamicFields(): RawHtml | string {
    const b = this.bibtex;

    if (b.entryType === 'article') {
      return html`
        <div
          class="p-3 bg-blue-50/50 rounded-lg border border-blue-100 grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          <div class="md:col-span-3">
            ${raw(
              this.field('journal', 'Journal Name', b.journal || '', {
                placeholder: 'e.g. IEEE Transactions on Software Engineering',
                onWhite: true,
                bare: true
              })
            )}
          </div>
          ${raw(
            this.field('volume', 'Volume', b.volume || '', {
              placeholder: 'e.g. 42',
              onWhite: true
            })
          )}
          ${raw(
            this.field('number', 'Number / Issue', b.number || '', {
              placeholder: 'e.g. 3',
              onWhite: true
            })
          )}
          ${raw(
            this.field('pages', 'Pages', b.pages || '', {
              placeholder: 'e.g. 101--115',
              onWhite: true
            })
          )}
        </div>
      `;
    }

    if (b.entryType === 'inproceedings') {
      return html`
        <div
          class="p-3 bg-purple-50/50 rounded-lg border border-purple-100 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <div class="md:col-span-2">
            ${raw(
              this.field('booktitle', 'Booktitle / Conference Proceedings', b.booktitle || '', {
                placeholder: 'e.g. Advances in Neural Information Processing Systems (NeurIPS)',
                onWhite: true,
                bare: true
              })
            )}
          </div>
          ${raw(
            this.field('publisher', 'Publisher / Organization', b.publisher || '', {
              placeholder: 'e.g. ACM / IEEE',
              onWhite: true
            })
          )}
          ${raw(
            this.field('pages', 'Pages', b.pages || '', {
              placeholder: 'e.g. 200--212',
              onWhite: true
            })
          )}
        </div>
      `;
    }

    if (b.entryType === 'book') {
      return html`
        <div
          class="p-3 bg-amber-50/50 rounded-lg border border-amber-100 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          ${raw(
            this.field('publisher', 'Publisher', b.publisher || '', {
              placeholder: "e.g. Springer, O'Reilly",
              onWhite: true
            })
          )}
          ${raw(
            this.field('edition', 'Edition', b.edition || '', {
              placeholder: 'e.g. 2nd Edition',
              onWhite: true
            })
          )}
        </div>
      `;
    }

    if (b.entryType === 'techreport') {
      return html`
        <div
          class="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          ${raw(
            this.field('institution', 'Institution', b.institution || '', {
              placeholder: 'e.g. SAP SE, MIT CSAIL',
              onWhite: true
            })
          )}
          ${raw(
            this.field('edition', 'Report Number / Edition', b.edition || '', {
              placeholder: 'e.g. TR-2024-01',
              onWhite: true
            })
          )}
        </div>
      `;
    }

    return '';
  }

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
      <label class="block font-semibold text-gray-600 mb-1">
        ${label}${options.required ? html`<span class="text-red-500"> *</span>` : ''}
      </label>
      <ui5-input
        class="${cx(
          'plib-input w-full text-xs',
          options.inputClass,
          options.onWhite && 'bg-white'
        )}"
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

  private progressSection(): RawHtml | string {
    if (!this.submitting) {
      return '';
    }
    return html`
      <div class="p-4 bg-[#f8fafc] rounded-lg border border-[#cbd5e1] space-y-2">
        <div class="flex items-center justify-between text-xs font-semibold text-gray-800">
          <span class="flex items-center gap-2">
            ${icon('Loader2', { className: 'w-4 h-4 text-[#0070f2] animate-spin' })}
            ${this.progressStatus}
          </span>
          <span class="font-mono">${String(this.uploadProgress)}%</span>
        </div>
        <ui5-progress-indicator
          class="plib-progress w-full"
          value="${String(this.uploadProgress)}"
          accessible-name="${this.progressStatus}"
        ></ui5-progress-indicator>
        <div class="text-[10px] text-gray-400">
          Independent record with unique GUID is being generated; vector store embeddings &amp; dual
          summaries in progress.
        </div>
      </div>
    `;
  }

  private footer(): RawHtml {
    const t = i18nStore.state.t;
    const submitDisabled = !this.selectedFile || this.submitting || this.extracting;
    const submitTooltip = this.extracting
      ? 'Please wait for BibTeX metadata extraction to finish, or click "Skip & Fill Manually"'
      : !this.selectedFile
        ? 'Please select a document file first'
        : 'Submit document and start ingestion pipeline';

    return html`
      <div slot="footer" class="w-full">
        <div
          class="px-6 py-3 border-t border-gray-200 bg-[#f8fafc] flex items-center justify-between gap-3"
        >
          <div class="text-[11px] text-gray-500">
            ${this.extracting
              ? html`<span class="flex items-center gap-1.5 text-blue-600 font-medium">
                  ${icon('Loader2', { className: 'w-3.5 h-3.5 animate-spin' })}
                  Extracting BibTeX metadata... Submit is paused.
                </span>`
              : ''}
          </div>

          <div class="flex items-center gap-3">
            <ui5-button
              class="plib-button"
              data-action="close"
              ${this.submitting ? raw('disabled') : ''}
              >${t.common.cancel}</ui5-button
            >
            <ui5-button
              class="plib-button"
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
      </div>
    `;
  }

  // ------------------------------------------------------------------
  // Behaviour
  // ------------------------------------------------------------------

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

  private patchBibtex(key: keyof BibTeXMetadata, value: string): void {
    this.bibtex = { ...this.bibtex, [key]: value };
  }

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

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => reject(new Error('Failed to read file asset as base64'));
      reader.readAsDataURL(file);
    });
  }

  private readPlainText(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve((event.target?.result as string) || '');
      reader.onerror = () => resolve('');
      reader.readAsText(file);
    });
  }

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

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

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

  private setProgress(value: number, status: string): void {
    this.uploadProgress = value;
    this.progressStatus = status;
    this.render();
  }
}
