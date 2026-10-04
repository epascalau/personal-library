/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Vanilla + UI5 replacement for `components/ObjectPage.tsx`.
 *
 * Reproduces the SAP Fiori Object Page floorplan: header with CRUD actions,
 * key-attribute strip, and the three sections (BibTeX overview, dual-model
 * summaries, Qdrant-backed RAG chat). The React component was keyed by GUID,
 * so the chat transcript resets whenever the active document changes.
 */

import { Component } from '../core/component';
import { cx, html, raw, RawHtml } from '../core/html';
import { shallowEqual, watch } from '../core/store';
import { requestBackend } from '../services/backend';
import { appStore } from '../stores/appStore';
import { backendStore } from '../stores/backendStore';
import { i18nStore } from '../stores/i18nStore';
import { icon } from '../ui5/icons';
import type { ChatMessage, DocumentRecord, SummaryRecord } from '../types';
import type { SummaryModel } from '../stores/appStore';
import type Input from '@ui5/webcomponents/dist/Input.js';

type ObjectPageTab = 'info' | 'summaries' | 'chat' | 'history';

const COPIED_RESET_MS = 2000;

const WIZARD_PROMPTS = [
  'Which are the characters in the book?',
  'How did Dorothy defeat the Wicked Witch of the West?',
  'What did the Wizard give to the Scarecrow, Tin Woodman, and Lion?'
];

const DEFAULT_PROMPTS = [
  'What are the core technical contributions?',
  'Summarize the methodology used',
  'What are the main limitations?'
];

const nowLabel = (): string =>
  new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const formatDateTime = (value: string): string =>
  new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

/** Exact `YYYY-MM-DD HH:mm:ss` rendering of a summary timestamp. */
const formatSummaryTimestamp = (dateString?: string): string => {
  if (!dateString) {
    return 'Pending generation';
  }
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) {
    return dateString;
  }
  const pad = (value: number): string => value.toString().padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
};

const welcomeMessage = (doc: DocumentRecord): ChatMessage => ({
  id: 'welcome',
  role: 'assistant',
  text:
    `Hello! I am your RAG assistant powered by **Llama 3.3**. I have indexed the document ` +
    `**"${doc.bibtex.title}"** into the Qdrant vector store. You can ask me any question about ` +
    `the methodology, key findings, or specific data points.`,
  timestamp: nowLabel()
});

/** Per-model copy, so both summary cards render from one template. */
interface SummaryCardSpec {
  model: SummaryModel;
  iconKey: 'Cpu' | 'Sparkles';
  iconClass: string;
  defaultModelName: string;
  defaultDuration: string;
  uncomputedClass: string;
  timestampIconClass: string;
  spinnerClass: string;
  loadingText: string;
  emptyPanelClass: string;
  emptyBadgeClass: string;
  emptyTitle: string;
  emptyBody: string;
  emptyAction: string;
  footerType: string;
}

const SUMMARY_CARDS: SummaryCardSpec[] = [
  {
    model: 'llama',
    iconKey: 'Cpu',
    iconClass: 'w-4 h-4 text-[#0070f2]',
    defaultModelName: 'Ollama Llama 3.3 (70B Instruct)',
    defaultDuration: '0 min 4.8 sec',
    uncomputedClass: 'bg-slate-100 text-slate-600 border-slate-200',
    timestampIconClass: 'w-3 h-3 text-[#0070f2]',
    spinnerClass: 'w-7 h-7 border-2 border-[#0070f2] border-t-transparent rounded-full animate-spin',
    loadingText: 'Ollama Llama 3.3 is regenerating analytical synthesis...',
    emptyPanelClass: 'bg-slate-50 border border-slate-200',
    emptyBadgeClass: 'bg-blue-100 text-[#0070f2]',
    emptyTitle: 'No Llama 3.3 Summary Available',
    emptyBody:
      'The Ollama Llama 3.3 backend service has not yet computed an analytical synthesis for this document, or the backend service was unavailable.',
    emptyAction: 'Run Backend Llama Summarizer',
    footerType: 'Type: Technical Analytical Deep-Dive'
  },
  {
    model: 'mistral',
    iconKey: 'Sparkles',
    iconClass: 'w-4 h-4 text-amber-500',
    defaultModelName: 'Ollama Mistral Large (2411)',
    defaultDuration: '0 min 3.5 sec',
    uncomputedClass: 'bg-amber-50 text-amber-700 border-amber-200',
    timestampIconClass: 'w-3 h-3 text-amber-600',
    spinnerClass:
      'w-7 h-7 border-2 border-amber-500 border-t-transparent rounded-full animate-spin',
    loadingText: 'Ollama Mistral is synthesizing executive summary...',
    emptyPanelClass: 'bg-amber-50/60 border border-amber-200/70',
    emptyBadgeClass: 'bg-amber-100 text-amber-600',
    emptyTitle: 'No Mistral Summary Available',
    emptyBody:
      'The Ollama Mistral Large backend service has not yet computed an executive summary for this document, or the backend service was unavailable.',
    emptyAction: 'Run Backend Mistral Summarizer',
    footerType: 'Type: High-Impact Executive Synthesis'
  }
];

export class ObjectPageView extends Component {
  private activeTab: ObjectPageTab = 'info';

  private copiedBib = false;

  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  private chatMessages: ChatMessage[] = [];

  private chatInput = '';

  private chatLoading = false;

  /** Tracks the GUID the local chat state belongs to. */
  private chatDocGuid: string | null = null;

  /**
   * Initializes the Object Page view component with SAP Fiori container classes.
   *
   * WHAT: Sets the host container styling.
   * WHY: Provides responsive margins and layout spacing consistent with SAP Fiori Object Page floorplans.
   */
  constructor() {
    super(undefined, 'div', 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6');
  }

  /**
   * Subscribes the Object Page to document updates and summary generation flags.
   *
   * WHAT:
   * 1. Watches `appStore.activeDocument` and `summarizingModels` to update summary cards and timestamps.
   * 2. Subscribes to `i18nStore` to update tab headers, action tooltips, and labels on language change.
   * 3. Registers cleanup for the clipboard copy indicator timer.
   *
   * WHY:
   * Ensures that when an LLM summary completes in the background, the summary tab updates
   * immediately with duration metrics and timestamps without disturbing active chat scroll state.
   */
  protected onMount(): void {
    this.track(
      watch(
        appStore,
        (state) => [state.activeDocument, state.summarizingModels],
        () => this.requestRender(),
        shallowEqual
      )
    );
    this.track(i18nStore.subscribe(() => this.requestRender()));
    this.track(() => {
      if (this.copiedTimer !== null) {
        clearTimeout(this.copiedTimer);
      }
    });
  }

  /**
   * Retrieves the currently active document from the application store.
   *
   * WHAT: Reads `appStore.state.activeDocument`.
   * WHY: Provides a reactive accessor for document state without manual event listener wiring.
   */
  private get doc(): DocumentRecord | null {
    return appStore.state.activeDocument;
  }

  /**
   * Synchronizes and resets conversational chat state when switching between different documents.
   *
   * WHAT: Compares `chatDocGuid` against `doc.guid`. If different, initializes a fresh welcome message,
   * clears chat input, resets loading state, and sets `activeTab: 'info'`.
   * WHY: Mirrors React's `key={activeDocument.guid}` remount semantics. Prevents conversational
   * context and questions from a previous document from leaking into the chat transcript of a new document.
   *
   * @param doc The newly active document record.
   */
  private syncChatForDocument(doc: DocumentRecord): void {
    if (this.chatDocGuid === doc.guid) {
      return;
    }
    this.chatDocGuid = doc.guid;
    this.chatMessages = [welcomeMessage(doc)];
    this.chatInput = '';
    this.chatLoading = false;
    this.activeTab = 'info';
  }

  // ------------------------------------------------------------------
  // Template
  // ------------------------------------------------------------------

  /**
   * Generates the root markup for the Object Page based on the currently selected tab.
   *
   * WHAT: Renders the common document header, key-attributes strip, and the selected tab view
   * (Overview / BibTeX, Dual-Model Summaries, or Qdrant RAG Chat).
   * WHY: Tabbed structure avoids information overload on complex academic documents,
   * organizing metadata, analytical AI models, and interactive vector search into clear workspaces.
   *
   * @returns RawHtml markup for the page.
   */
  protected template(): RawHtml | string {
    const doc = this.doc;
    if (!doc) {
      return html`<div class="max-w-7xl mx-auto px-4 py-16 text-center text-gray-500">
        Document not found or loading...
      </div>`;
    }

    this.syncChatForDocument(doc);

    return html`
      ${this.header(doc)}
      ${this.activeTab === 'info' ? this.infoTab(doc) : ''}
      ${this.activeTab === 'summaries' ? this.summariesTab(doc) : ''}
      ${this.activeTab === 'chat' ? this.chatTab(doc) : ''}
      ${this.activeTab === 'history' ? this.historyTab(doc) : ''}
    `;
  }

  /**
   * Renders the SAP Fiori Object Page header, navigation bar, actions, and key-value metrics strip.
   *
   * WHAT: Renders back button, document format badge, title, author subtitle, action buttons (download, BibTeX copy,
   * new version overwrite, delete), and tab bar navigation.
   * WHY: Adheres to the SAP Fiori Object Page floorplan standard for enterprise asset inspection.
   *
   * @param doc The active document record.
   * @returns RawHtml header markup.
   */
  private header(doc: DocumentRecord): RawHtml {
    const t = i18nStore.state.t;

    return html`
      <div class="bg-white dark:bg-[#1c232b] rounded-lg shadow-sm border border-[#e2e8f0] dark:border-[#2e3b4a] overflow-hidden transition-colors">
        <div
          class="px-6 py-3.5 border-b border-gray-100 dark:border-[#2e3b4a] flex flex-wrap items-center justify-between gap-3 bg-[#f8fafc] dark:bg-[#232c37]"
        >
          <button
            type="button"
            data-action="back"
            class="flex items-center gap-1.5 px-2.5 py-1.5 -ml-2 rounded-md text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-[#0070f2] dark:hover:text-[#4796ff] hover:bg-white dark:hover:bg-[#1a222c] border border-transparent hover:border-gray-200/80 dark:hover:border-[#38495f] hover:shadow-2xs active:scale-[0.98] transition-all duration-150 group cursor-pointer"
          >
            ${icon('NavBack', {
              className: 'w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-[#0070f2] dark:group-hover:text-[#4796ff] group-hover:-translate-x-0.5 transition-all duration-150'
            })}
            <span>${t.objectPage.backToLibrary}</span>
          </button>

          <div class="flex items-center gap-2">
            <ui5-button
              class="plib-button plib-button--accent"
              data-action="open-version"
              icon="upload"
              tooltip="Upload new file version or overwrite active view"
              >${t.objectPage.uploadNewVersion}</ui5-button
            >
            <ui5-button
              class="plib-button"
              data-action="download-asset"
              icon="download"
              tooltip="Download original file asset"
              >${t.objectPage.downloadFile}</ui5-button
            >
            <ui5-button
              class="plib-button"
              data-action="export-bibtex"
              icon="source-code"
              tooltip="Export as .bib file"
              >${t.objectPage.exportBibtex}</ui5-button
            >
            <ui5-button
              class="plib-button plib-button--destructive"
              design="Negative"
              data-action="delete"
              icon="delete"
              tooltip="Delete Document Record"
              >${t.common.delete}</ui5-button
            >
          </div>
        </div>

        <div class="p-6">
          <div class="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div class="space-y-2 max-w-4xl">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="px-2.5 py-0.5 text-xs font-bold rounded bg-[#0070f2] text-white uppercase tracking-wider font-mono shadow-2xs"
                  >${doc.format}</span
                >
                <span
                  class="px-2.5 py-0.5 text-xs font-semibold rounded-md bg-slate-100 dark:bg-[#253241] text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-[#38495f] font-mono tracking-wide shadow-2xs"
                  >@${doc.bibtex.entryType}</span
                >
                <span
                  class="px-2.5 py-0.5 text-xs font-medium rounded-md bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60 shadow-2xs"
                  >${t.common.version} ${String(doc.versionNumber || 1)}</span
                >
                <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">Key: ${doc.bibtex.bibKey}</span>
              </div>

              <h1 class="text-2xl font-bold text-gray-900 dark:text-white leading-snug">
                ${doc.bibtex.title || doc.fileName}
              </h1>

              <div class="text-sm text-gray-600 dark:text-gray-300 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span class="font-medium text-gray-800 dark:text-gray-100">${doc.bibtex.author}</span>
                ${doc.bibtex.year ? html`<span class="text-gray-500 dark:text-gray-400">(${doc.bibtex.year})</span>` : ''}
                ${doc.bibtex.journal
                  ? html`<span class="text-gray-500 dark:text-gray-400 italic">${doc.bibtex.journal}</span>`
                  : ''}
                ${doc.bibtex.booktitle
                  ? html`<span class="text-gray-500 dark:text-gray-400 italic">${doc.bibtex.booktitle}</span>`
                  : ''}
              </div>
            </div>

            <div
              class="bg-[#f8fafc] dark:bg-[#232c37] p-3 rounded-lg border border-gray-200 dark:border-[#2e3b4a] text-right min-w-[200px]"
            >
              <div class="text-[10px] text-gray-400 dark:text-gray-400 uppercase font-semibold">
                ${t.objectPage.guid}
              </div>
              <div class="font-mono text-xs text-gray-700 dark:text-gray-200 break-all select-all">${doc.guid}</div>
              ${doc.previousVersionGuid
                ? html`<div class="mt-1 pt-1 border-t border-gray-200 dark:border-[#2e3b4a] text-[10px] text-gray-500 dark:text-gray-400">
                    <span>Replaced GUID: </span>
                    <span class="font-mono text-gray-600 dark:text-gray-300 truncate block"
                      >${doc.previousVersionGuid}</span
                    >
                  </div>`
                : ''}
              ${doc.versionHistory && doc.versionHistory.length > 0
                ? html`<button
                    type="button"
                    data-tab="history"
                    class="mt-1 pt-1 border-t border-gray-200 dark:border-[#2e3b4a] text-[10px] text-[#0070f2] dark:text-[#4796ff] font-semibold hover:underline block text-right w-full cursor-pointer"
                  >
                    ${doc.versionHistory.length} historical snapshot${doc.versionHistory.length === 1 ? '' : 's'} available →
                  </button>`
                : ''}
            </div>
          </div>

          <div
            class="mt-6 pt-4 border-t border-gray-100 dark:border-[#2e3b4a] grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs"
          >
            <div>
              <span class="text-gray-400 dark:text-gray-400 block">${t.listReport.fileName}</span>
              <span class="font-mono font-medium text-gray-800 dark:text-gray-200 truncate block">${doc.fileName}</span>
            </div>
            <div>
              <span class="text-gray-400 dark:text-gray-400 block">${t.objectPage.fileSize}</span>
              <span class="font-medium text-gray-800 dark:text-gray-200">${doc.fileSizeFormatted}</span>
            </div>
            <div>
              <span class="text-gray-400 dark:text-gray-400 block">${t.objectPage.uploadedOn}</span>
              <span class="font-medium text-gray-800 dark:text-gray-200">${formatDateTime(doc.uploadDate)}</span>
            </div>
            <div>
              <span class="text-gray-400 dark:text-gray-400 block">${t.objectPage.lastModified}</span>
              <span class="font-medium text-gray-800 dark:text-gray-200">${formatDateTime(doc.editDate)}</span>
            </div>
          </div>
        </div>

        <div
          class="flex border-t border-gray-200 dark:border-[#2e3b4a] bg-[#f8fafc] dark:bg-[#232c37] px-6 gap-6 text-xs font-semibold"
          role="tablist"
        >
          ${raw(
            [
              { id: 'info' as const, label: t.objectPage.tabOverview, iconKey: 'BookOpen' as const, iconClass: 'w-3.5 h-3.5' },
              { id: 'summaries' as const, label: t.objectPage.tabSummaries, iconKey: 'Sparkles' as const, iconClass: 'w-3.5 h-3.5 text-amber-500' },
              { id: 'chat' as const, label: t.objectPage.tabChat, iconKey: 'Bot' as const, iconClass: 'w-3.5 h-3.5 text-[#0070f2]' },
              { id: 'history' as const, label: 'Version History & Rollback', iconKey: 'History' as const, iconClass: 'w-3.5 h-3.5 text-rose-500' }
            ]
              .map((tab) =>
                html`<button
                  type="button"
                  role="tab"
                  data-tab="${tab.id}"
                  aria-selected="${this.activeTab === tab.id ? 'true' : 'false'}"
                  class="${cx(
                    'py-3 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors',
                    this.activeTab === tab.id
                      ? 'border-[#0070f2] text-[#0070f2] dark:text-[#4796ff]'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  )}"
                >
                  ${icon(tab.iconKey, { className: tab.iconClass })} ${tab.label}
                </button>`.toString()
              )
              .join('')
          )}
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------------
  // Tab 1 — BibTeX overview
  // ------------------------------------------------------------------

  /**
   * Renders the BibTeX metadata overview tab content.
   *
   * WHAT: Displays formatted fields (Title, Author, Journal, Year, Volume, DOI, ISBN, Publisher)
   * and the raw, syntax-highlighted BibTeX citation block with copy and export controls.
   * WHY: Offers researchers a standardized, copy-paste ready bibliographic record adhering to academic conventions.
   *
   * @param doc The active document record being viewed.
   * @returns RawHtml markup for the metadata tab.
   */
  private infoTab(doc: DocumentRecord): RawHtml {
    const b = doc.bibtex;

    return html`
      <div class="space-y-6">
        <div class="bg-white dark:bg-[#1c232b] rounded-lg shadow-sm border border-[#e2e8f0] dark:border-[#2e3b4a] p-6 space-y-4">
          <h3
            class="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2 border-b border-gray-100 dark:border-[#2e3b4a] pb-3"
          >
            ${icon('Info', { className: 'w-4 h-4 text-[#0070f2]' })}
            BibTeX Standard Metadata Specification
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            ${raw(this.metaItem('Title', b.title || '—', 'text-gray-900 dark:text-gray-100 font-medium'))}
            ${raw(this.metaItem('Author(s)', b.author || '—'))}
            ${raw(
              this.metaItem(
                'Year / Month',
                `${b.year ?? ''} ${b.month ? `(${b.month})` : ''}`.trim()
              )
            )}
            ${b.journal ? raw(this.metaItem('Journal', b.journal)) : ''}
            ${b.booktitle ? raw(this.metaItem('Booktitle / Conference', b.booktitle)) : ''}
            ${b.volume
              ? raw(
                  this.metaItem(
                    'Volume & Number',
                    `Vol. ${b.volume}${b.number ? `, No. ${b.number}` : ''}`
                  )
                )
              : ''}
            ${b.pages ? raw(this.metaItem('Pages', b.pages)) : ''}
            ${b.publisher ? raw(this.metaItem('Publisher', b.publisher)) : ''}
            ${b.edition ? raw(this.metaItem('Edition', b.edition)) : ''}
            ${b.doi
              ? html`<div>
                  <span class="font-semibold text-gray-500 dark:text-gray-400 block mb-0.5">DOI</span>
                  <a
                    href="https://doi.org/${b.doi}"
                    target="_blank"
                    rel="noreferrer"
                    class="text-[#0070f2] dark:text-[#4796ff] hover:underline flex items-center gap-1 font-mono text-[11px]"
                  >
                    ${b.doi} ${icon('ExternalLink', { className: 'w-3 h-3' })}
                  </a>
                </div>`
              : ''}
            ${b.url
              ? html`<div>
                  <span class="font-semibold text-gray-500 dark:text-gray-400 block mb-0.5">URL</span>
                  <a
                    href="${b.url}"
                    target="_blank"
                    rel="noreferrer"
                    class="text-[#0070f2] dark:text-[#4796ff] hover:underline flex items-center gap-1 font-mono text-[11px] truncate max-w-[260px]"
                  >
                    ${b.url} ${icon('ExternalLink', { className: 'w-3 h-3 shrink-0' })}
                  </a>
                </div>`
              : ''}
            ${b.keywords
              ? html`<div class="md:col-span-2">
                  <span class="font-semibold text-gray-500 dark:text-gray-400 block mb-0.5">Keywords</span>
                  <div class="flex flex-wrap gap-1 mt-1">
                    ${raw(
                      b.keywords
                        .split(/[,;]/)
                        .map((keyword) =>
                          html`<span
                            class="px-2 py-0.5 rounded bg-gray-100 dark:bg-[#253241] text-gray-700 dark:text-gray-200 border border-transparent dark:border-[#38495f] text-[11px]"
                            >${keyword.trim()}</span
                          >`.toString()
                        )
                        .join('')
                    )}
                  </div>
                </div>`
              : ''}
          </div>

          ${b.abstract
            ? html`<div class="pt-4 border-t border-gray-100 dark:border-[#2e3b4a]">
                <span class="font-semibold text-gray-500 dark:text-gray-400 block mb-1">Abstract</span>
                <p
                  class="text-xs text-gray-700 dark:text-gray-200 leading-relaxed bg-[#f8fafc] dark:bg-[#232c37] p-3 rounded border border-gray-200 dark:border-[#2e3b4a]"
                >
                  ${b.abstract}
                </p>
              </div>`
            : ''}
        </div>

        <div class="bg-white dark:bg-[#1c232b] rounded-lg shadow-sm border border-[#e2e8f0] dark:border-[#2e3b4a] p-6 space-y-3">
          <div class="flex items-center justify-between border-b border-gray-100 dark:border-[#2e3b4a] pb-3">
            <div class="flex items-center gap-2">
              ${icon('FileCode', { className: 'w-4 h-4 text-[#0070f2]' })}
              <h3 class="font-semibold text-sm text-gray-900 dark:text-gray-100">
                Formatted BibTeX Entry (Copy-Ready)
              </h3>
            </div>
            <ui5-button
              class="plib-button plib-button--accent"
              data-action="copy-bibtex"
              icon="${this.copiedBib ? 'accept' : 'copy'}"
              >${this.copiedBib ? 'Copied to Clipboard!' : 'Copy BibTeX'}</ui5-button
            >
          </div>

          <pre
            class="p-4 bg-[#1e293b] text-[#e2e8f0] rounded-lg font-mono text-xs overflow-x-auto leading-relaxed border border-slate-700"
          ><code>${doc.bibtexRaw}</code></pre>
        </div>
      </div>
    `;
  }

  /**
   * Renders a key-value bibliographic metadata item widget.
   *
   * WHAT: Generates an HTML snippet formatting a metadata label with styled text value.
   * WHY: Keeps metadata layout uniform across fields and supports responsive CSS grid column spanning.
   *
   * @param label The descriptive title of the field.
   * @param value The textual content or placeholder.
   * @param valueClass Custom CSS classes for typography and color styling.
   * @returns Stringified HTML element.
   */
  private metaItem(label: string, value: string, valueClass = 'text-gray-900 dark:text-gray-200'): string {
    return html`
      <div>
        <span class="font-semibold text-gray-500 dark:text-gray-400 block mb-0.5">${label}</span>
        <p class="${valueClass}">${value}</p>
      </div>
    `.toString();
  }

  // ------------------------------------------------------------------
  // Tab 2 — dual-model summaries
  // ------------------------------------------------------------------

  /**
   * Renders the dual-model AI summaries tab comparing Llama 3.3 and Mistral.
   *
   * WHAT: Displays architecture telemetry banner and a grid of summary cards for configured AI models.
   * WHY: Delivers multi-perspective document analysis allowing side-by-side comparison of deep analysis vs concise synthesis.
   *
   * @param doc Active document record.
   * @returns RawHtml markup for summaries tab.
   */
  private summariesTab(doc: DocumentRecord): RawHtml {
    return html`
      <div class="space-y-6">
        <div
          class="bg-[#eff6ff] border border-[#bfdbfe] rounded-lg p-4 flex items-center gap-3 text-xs text-[#1e40af]"
        >
          ${icon('Sparkles', { className: 'w-5 h-5 shrink-0 text-[#0070f2]' })}
          <div>
            <span class="font-semibold">Dual-Model AI Ingestion Pipeline:</span> Upon document
            upload, Spring AI orchestrated simultaneous summaries with
            <strong>Ollama Llama 3.3</strong> (analytical deep dive) and
            <strong>Ollama Mistral</strong> (executive synthesis). Regeneration triggers model
            recomputation with runtime telemetry.
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          ${raw(
            SUMMARY_CARDS.map((spec) =>
              this.summaryCard(spec, doc.summaries?.[spec.model])
            ).join('')
          )}
        </div>
      </div>
    `;
  }

  /**
   * Renders an individual summary card for a specific AI model.
   *
   * WHAT: Generates model badge, latency, token count, full summary prose, and regenerate action button.
   * WHY: Encapsulates model-specific UI states (loading spinner, error messages, copy button, telemetry tags).
   *
   * @param spec Specification of the model (key, title, icons).
   * @param summary Persisted summary record or undefined if not yet generated.
   * @returns Stringified HTML for the summary card.
   */
  private summaryCard(spec: SummaryCardSpec, summary: SummaryRecord | undefined): string {
    const isBusy = Boolean(appStore.state.summarizingModels[spec.model]);
    const hasText = Boolean(summary?.summaryText);

    return html`
      <div
        class="bg-white dark:bg-[#1c232b] rounded-lg shadow-sm border border-[#e2e8f0] dark:border-[#2e3b4a] flex flex-col justify-between overflow-hidden"
      >
        <div class="p-5 border-b border-gray-100 dark:border-[#2e3b4a] bg-[#fafafa] dark:bg-[#232c37]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                ${icon(spec.iconKey, { className: spec.iconClass })}
                <h4 class="font-bold text-sm text-gray-900 dark:text-white">
                  ${summary?.modelName || spec.defaultModelName}
                </h4>
              </div>
              <div class="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                ${hasText
                  ? html`<span
                        class="flex items-center gap-1.5 font-mono bg-[#f1f5f9] dark:bg-[#1b2531] px-2 py-0.5 rounded border border-gray-200 dark:border-[#38495f] text-gray-800 dark:text-gray-200"
                        title="${summary?.createdAt
                          ? `ISO: ${summary.createdAt}`
                          : 'Generated on upload'}"
                      >
                        ${icon('Calendar', { className: spec.timestampIconClass })} Timestamp:
                        <strong
                          >${formatSummaryTimestamp(
                            summary?.createdAt || summary?.timestamp
                          )}</strong
                        >
                      </span>
                      <span class="text-gray-300 dark:text-gray-600">•</span>
                      <span class="flex items-center gap-1">
                        ${icon('Clock', { className: 'w-3 h-3 text-gray-400' })} Duration:
                        <strong>${summary?.durationFormatted || spec.defaultDuration}</strong>
                      </span>`
                  : html`<span
                      class="${cx(
                        'px-2 py-0.5 rounded font-mono text-[10px] border',
                        spec.uncomputedClass
                      )}"
                      >Status: Uncomputed</span
                    >`}
              </div>
            </div>

            <ui5-button
              class="plib-button"
              design="Emphasized"
              data-regenerate="${spec.model}"
              ${isBusy ? raw('disabled') : ''}
            >
              ${icon('RotateCw', { className: cx('w-3.5 h-3.5 mr-1.5', isBusy && 'animate-spin') })}
              ${isBusy ? 'Generating...' : hasText ? 'Regenerate' : 'Compute Summary'}
            </ui5-button>
          </div>
        </div>

        <div
          class="p-6 text-xs text-gray-800 dark:text-gray-200 leading-relaxed space-y-3 prose prose-sm max-w-none"
        >
          ${isBusy
            ? html`<div class="py-12 flex flex-col items-center justify-center gap-3 text-gray-500">
                <div class="${spec.spinnerClass}"></div>
                <span class="font-medium">${spec.loadingText}</span>
                <span class="text-[11px] text-gray-400"
                  >Measuring runtime duration and updating metadata...</span
                >
              </div>`
            : hasText
              ? html`<div
                  class="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-200 leading-relaxed bg-[#f8fafc] dark:bg-[#232c37] p-4 rounded-lg border border-gray-100 dark:border-[#2e3b4a]"
                >
                  ${summary?.summaryText}
                </div>`
              : html`<div
                  class="${cx('py-8 px-4 rounded-lg text-center space-y-2.5', spec.emptyPanelClass)}"
                >
                  <div
                    class="${cx(
                      'w-8 h-8 rounded-full flex items-center justify-center mx-auto',
                      spec.emptyBadgeClass
                    )}"
                  >
                    ${icon(spec.iconKey, { className: 'w-4 h-4' })}
                  </div>
                  <div class="text-xs font-semibold text-gray-800 dark:text-gray-200">${spec.emptyTitle}</div>
                  <p class="text-[11px] text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-normal">
                    ${spec.emptyBody}
                  </p>
                  <ui5-button
                    class="plib-button mt-1"
                    design="Emphasized"
                    data-regenerate="${spec.model}"
                    ${isBusy ? raw('disabled') : ''}
                  >
                    ${icon('RotateCw', { className: cx('w-3.5 h-3.5 mr-1.5', isBusy && 'animate-spin') })}
                    ${isBusy ? 'Generating...' : spec.emptyAction}
                  </ui5-button>
                </div>`}
        </div>

        <div
          class="px-5 py-2.5 bg-gray-50 dark:bg-[#232c37] border-t border-gray-100 dark:border-[#2e3b4a] text-[11px] text-gray-400 dark:text-gray-400 flex items-center justify-between"
        >
          <span>Model Target: Ollama / Spring AI</span>
          <span>${spec.footerType}</span>
        </div>
      </div>
    `.toString();
  }

  // ------------------------------------------------------------------
  // Tab 3 — RAG chat
  // ------------------------------------------------------------------

  /**
   * Renders the interactive Retrieval-Augmented Generation (RAG) chat tab.
   *
   * WHAT: Generates Qdrant vector status badge, scrollable message feed, suggested query prompts,
   * and input field bound to the conversational QA pipeline.
   * WHY: Enables researchers to interrogate documents interactively with grounded citations from segmented passages.
   *
   * @param doc Active document record.
   * @returns RawHtml markup for chat interface.
   */
  private chatTab(doc: DocumentRecord): RawHtml {
    const prompts = doc.bibtex.title.toLowerCase().includes('wizard of oz')
      ? WIZARD_PROMPTS
      : DEFAULT_PROMPTS;

    return html`
      <div
        class="bg-white dark:bg-[#1c232b] rounded-lg shadow-sm border border-[#e2e8f0] dark:border-[#2e3b4a] overflow-hidden flex flex-col h-[650px]"
      >
        <div class="p-4 bg-[#f8fafc] dark:bg-[#232c37] border-b border-gray-200 dark:border-[#2e3b4a] flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div
              class="w-8 h-8 rounded-full bg-[#0070f2] flex items-center justify-center text-white"
            >
              ${icon('Bot', { className: 'w-4 h-4' })}
            </div>
            <div>
              <div class="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>Chat with Document Assistant</span>
                <span
                  class="px-2 py-0.5 text-[10px] font-semibold bg-[#ebf8ff] dark:bg-blue-950/60 text-[#0070f2] dark:text-[#38bdf8] rounded border border-[#b9e5fe] dark:border-blue-900/60"
                  >Active Model: Llama 3.3 (70B Instruct)</span
                >
              </div>
              <div class="text-[11px] text-gray-500 dark:text-gray-400">
                Retrieval-Augmented Generation backed by Qdrant vector database chunks
              </div>
            </div>
          </div>

          <div class="hidden sm:flex items-center gap-2 text-xs text-gray-400 dark:text-gray-400 font-mono">
            <span class="w-2 h-2 rounded-full bg-green-500"></span>
            Qdrant Connected
          </div>
        </div>

        <div
          class="flex-1 overflow-y-auto p-5 space-y-4 bg-[#fafbfc] dark:bg-[#151c24]"
          data-scroll-key="chat-feed"
          data-chat-feed
        >
          ${raw(this.chatMessages.map((message) => this.chatBubble(message)).join(''))}
          ${this.chatLoading
            ? html`<div class="flex gap-3 items-center text-xs text-gray-500">
                <div
                  class="w-7 h-7 rounded-full bg-[#0070f2] flex items-center justify-center text-white shrink-0 text-xs"
                >
                  ${icon('Bot', { className: 'w-3.5 h-3.5' })}
                </div>
                <div
                  class="bg-white dark:bg-[#1c232b] border border-gray-200 dark:border-[#2e3b4a] rounded-lg p-3 flex items-center gap-2 shadow-sm text-gray-800 dark:text-gray-200"
                >
                  <div
                    class="w-4 h-4 border-2 border-[#0070f2] border-t-transparent rounded-full animate-spin"
                  ></div>
                  <span>Searching Qdrant vector space &amp; generating Llama response...</span>
                </div>
              </div>`
            : ''}
        </div>

        <div class="px-5 py-2 border-t border-gray-100 dark:border-[#2e3b4a] bg-white dark:bg-[#1c232b] flex flex-wrap gap-2 text-xs">
          <span class="text-[11px] text-gray-400 dark:text-gray-400 font-medium py-1">Quick prompts:</span>
          ${raw(
            prompts
              .map((prompt) =>
                html`<button
                  type="button"
                  data-prompt="${prompt}"
                  class="px-2.5 py-1 rounded bg-[#f1f5f9] dark:bg-[#232c37] hover:bg-[#e2e8f0] dark:hover:bg-[#2b3746] text-gray-700 dark:text-gray-200 text-[11px] transition-colors cursor-pointer border border-gray-200 dark:border-[#38495f]"
                >
                  ${prompt}
                </button>`.toString()
              )
              .join('')
          )}
        </div>

        <form
          data-form="chat"
          class="p-3 bg-white dark:bg-[#1c232b] border-t border-gray-200 dark:border-[#2e3b4a] flex items-center gap-2"
        >
          <ui5-input
            class="plib-input flex-1 text-xs"
            data-input="chat"
            data-focus-key="chat-input"
            placeholder="Ask a question about this document (e.g., empirical results, equations, conclusions)..."
            value="${this.chatInput}"
            accessible-name="Chat question"
          ></ui5-input>
          <ui5-button
            class="plib-button"
            design="Emphasized"
            data-action="send-chat"
            icon="paper-plane"
            ${!this.chatInput.trim() || this.chatLoading ? raw('disabled') : ''}
            >Send</ui5-button
          >
        </form>
      </div>
    `;
  }

  /**
   * Formats a single chat message bubble with role-specific styling and citations.
   *
   * WHAT: Distinguishes user prompts (blue pill on right) from assistant responses (white card on left),
   * rendering timestamp and retrieved vector chunk citations with relevance percentages.
   * WHY: Provides clear visual attribution and traceability back to source text in the vector database.
   *
   * @param message Structured chat message model.
   * @returns Stringified HTML representing the chat bubble.
   */
  private chatBubble(message: ChatMessage): string {
    const isUser = message.role === 'user';

    return html`
      <div class="${cx('flex gap-3', isUser ? 'justify-end' : 'justify-start')}">
        ${isUser
          ? ''
          : html`<div
              class="w-7 h-7 rounded-full bg-[#0070f2] flex items-center justify-center text-white shrink-0 mt-0.5 text-xs"
            >
              ${icon('Bot', { className: 'w-3.5 h-3.5' })}
            </div>`}

        <div
          class="${cx(
            'max-w-2xl rounded-lg p-3.5 text-xs shadow-sm',
            isUser
              ? 'bg-[#0070f2] text-white rounded-br-none'
              : 'bg-white dark:bg-[#1c232b] text-gray-800 dark:text-gray-100 border border-gray-200 dark:border-[#2e3b4a] rounded-bl-none'
          )}"
        >
          <div class="whitespace-pre-wrap leading-relaxed">${message.text}</div>

          ${message.citations && message.citations.length > 0
            ? html`<div class="mt-3 pt-2.5 border-t border-gray-100 space-y-1.5">
                <div class="text-[10px] uppercase font-bold text-gray-400 flex items-center gap-1">
                  ${icon('Quote', { className: 'w-3 h-3 text-[#0070f2]' })}
                  Retrieved Document Excerpts (Qdrant Vectors):
                </div>
                ${raw(
                  message.citations
                    .map((citation) =>
                      html`<div
                        class="bg-gray-50 border border-gray-200 rounded p-2 text-[11px] text-gray-600 font-mono leading-normal"
                      >
                        <span class="font-bold text-[#0070f2]"
                          >[Chunk #${String(citation.chunkIndex + 1)} • Similarity:
                          ${(citation.score * 100).toFixed(0)}%]</span
                        >
                        ${citation.snippet.slice(0, 160)}...
                      </div>`.toString()
                    )
                    .join('')
                )}
              </div>`
            : ''}

          <div
            class="${cx('text-[10px] mt-1.5 text-right', isUser ? 'text-blue-100' : 'text-gray-400')}"
          >
            ${message.timestamp}
          </div>
        </div>
      </div>
    `.toString();
  }

  // ------------------------------------------------------------------
  // Tab 4 — Version History & Rollback
  // ------------------------------------------------------------------

  /**
   * Renders the Version History & Rollback matrix tab.
   *
   * WHAT: Displays active revision status, lineage predecessor links, and an interactive
   * table of archived version snapshots with one-click historical asset download and rollback triggers.
   * WHY: Empowers researchers to audit revision changes, compare historical metadata/summaries,
   * download previous file states, and perform non-destructive rollbacks.
   *
   * @param doc The active document record being viewed.
   * @returns RawHtml markup for the version history tab.
   */
  private historyTab(doc: DocumentRecord): RawHtml {
    const snapshots = doc.versionHistory || [];

    return html`
      <div class="space-y-6">
        <!-- Active Version & Lineage KPI Bar -->
        <div class="bg-white dark:bg-[#1c232b] rounded-lg shadow-sm border border-[#e2e8f0] dark:border-[#2e3b4a] p-6">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 dark:border-[#2e3b4a] pb-4">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-[#0070f2] dark:text-[#4796ff]">
                ${icon('History', { className: 'w-5 h-5' })}
              </div>
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-semibold text-base text-gray-900 dark:text-gray-100">
                    Active Revision Lineage (v${doc.versionNumber})
                  </h3>
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700">
                    Active Head
                  </span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  All prior revisions are preserved as immutable snapshots with file assets, metadata, and dual-model AI summaries.
                </p>
              </div>
            </div>

            <div class="flex items-center gap-2">
              <ui5-button
                class="plib-button"
                data-action="open-version"
                icon="upload"
              >
                Upload New Revision
              </ui5-button>
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-2 text-xs">
            <div>
              <span class="text-gray-400 dark:text-gray-400 block font-medium">Current Version</span>
              <span class="font-bold text-gray-900 dark:text-gray-100 text-sm">v${doc.versionNumber}</span>
            </div>
            <div>
              <span class="text-gray-400 dark:text-gray-400 block font-medium">Predecessor Pointer</span>
              <span class="font-mono text-gray-700 dark:text-gray-300 truncate block text-[11px]">
                ${doc.previousVersionGuid ? doc.previousVersionGuid : 'None (Root Ingestion)'}
              </span>
            </div>
            <div>
              <span class="text-gray-400 dark:text-gray-400 block font-medium">Archived Snapshots</span>
              <span class="font-semibold text-gray-800 dark:text-gray-200">${snapshots.length} recorded</span>
            </div>
            <div>
              <span class="text-gray-400 dark:text-gray-400 block font-medium">Last Modified</span>
              <span class="text-gray-800 dark:text-gray-200">${formatDateTime(doc.editDate)}</span>
            </div>
          </div>
        </div>

        <!-- Historical Snapshots Table & Rollback Actions -->
        <div class="bg-white dark:bg-[#1c232b] rounded-lg shadow-sm border border-[#e2e8f0] dark:border-[#2e3b4a] p-6 space-y-4">
          <div class="flex items-center justify-between border-b border-gray-100 dark:border-[#2e3b4a] pb-3">
            <div class="flex items-center gap-2">
              ${icon('GitBranch', { className: 'w-4 h-4 text-rose-500' })}
              <h3 class="font-semibold text-sm text-gray-900 dark:text-gray-100">
                Historical Snapshot Archive & Rollback Matrix
              </h3>
            </div>
            <span class="text-xs text-gray-500 dark:text-gray-400 font-mono">
              ${snapshots.length} snapshot${snapshots.length === 1 ? '' : 's'} recorded
            </span>
          </div>

          ${snapshots.length === 0
            ? html`
                <div class="text-center py-10 px-4 bg-gray-50 dark:bg-[#232c37] rounded-lg border border-dashed border-gray-200 dark:border-[#344458] space-y-3">
                  <div class="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-[#0070f2]">
                    ${icon('History', { className: 'w-6 h-6' })}
                  </div>
                  <h4 class="font-semibold text-sm text-gray-900 dark:text-gray-100">
                    Root Version (v1) — No Prior Revisions Yet
                  </h4>
                  <p class="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
                    This document is currently at its initial ingestion state. When you upload a revision using
                    <strong>Upload New Revision</strong>, a snapshot of v${doc.versionNumber} will automatically be archived here,
                    allowing instant historical asset downloading and non-destructive rollbacks.
                  </p>
                  <div class="pt-2">
                    <ui5-button
                      class="plib-button"
                      data-action="open-version"
                      icon="upload"
                    >
                      Test Version Overwrite
                    </ui5-button>
                  </div>
                </div>
              `
            : html`
                <div class="overflow-x-auto">
                  <table class="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr class="border-b border-gray-200 dark:border-[#2e3b4a] bg-gray-50 dark:bg-[#232c37] text-gray-600 dark:text-gray-300 font-semibold">
                        <th class="py-2.5 px-3">Revision</th>
                        <th class="py-2.5 px-3">Archived Date</th>
                        <th class="py-2.5 px-3">File Asset</th>
                        <th class="py-2.5 px-3">Bibliographic Metadata</th>
                        <th class="py-2.5 px-3">AI Summaries</th>
                        <th class="py-2.5 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-[#2e3b4a]">
                      ${raw(
                        snapshots
                          .map(
                            (s) => html`
                              <tr class="hover:bg-gray-50/60 dark:hover:bg-[#232c37]/60 transition-colors">
                                <td class="py-3 px-3 align-top font-mono">
                                  <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-xs bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                    v${s.versionNumber}
                                  </span>
                                  <div class="text-[10px] text-gray-400 mt-1 truncate max-w-[90px]" title="${s.snapshotGuid}">
                                    ${s.snapshotGuid.slice(0, 14)}...
                                  </div>
                                </td>
                                <td class="py-3 px-3 align-top text-gray-700 dark:text-gray-300 whitespace-nowrap">
                                  <div>${formatDateTime(s.savedAt)}</div>
                                  <div class="text-[10px] text-gray-400 mt-0.5 italic max-w-[150px] truncate" title="${s.note || 'Prior revision snapshot'}">
                                    ${s.note || 'Prior revision snapshot'}
                                  </div>
                                </td>
                                <td class="py-3 px-3 align-top">
                                  <div class="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[180px]" title="${s.fileName}">
                                    ${s.fileName}
                                  </div>
                                  <div class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                    ${s.fileSizeFormatted} • <span class="uppercase font-mono">${s.format}</span>
                                  </div>
                                </td>
                                <td class="py-3 px-3 align-top max-w-[220px]">
                                  <div class="font-medium text-gray-800 dark:text-gray-200 truncate" title="${s.bibtex.title || 'Untitled'}">
                                    ${s.bibtex.title || 'Untitled'}
                                  </div>
                                  <div class="text-[11px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                    ${s.bibtex.author || '—'} ${s.bibtex.year ? `(${s.bibtex.year})` : ''}
                                  </div>
                                </td>
                                <td class="py-3 px-3 align-top whitespace-nowrap">
                                  <div class="flex flex-col gap-1 text-[10px]">
                                    <span class="inline-flex items-center gap-1 ${s.summaries?.llama ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-gray-400'}">
                                      ${icon('Sparkles', { className: 'w-3 h-3' })} Llama 3.3 ${s.summaries?.llama ? '✓' : '—'}
                                    </span>
                                    <span class="inline-flex items-center gap-1 ${s.summaries?.mistral ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-gray-400'}">
                                      ${icon('Sparkles', { className: 'w-3 h-3' })} Mistral Large ${s.summaries?.mistral ? '✓' : '—'}
                                    </span>
                                  </div>
                                </td>
                                <td class="py-3 px-3 align-top text-right whitespace-nowrap">
                                  <div class="flex items-center justify-end gap-1.5">
                                    <a
                                      href="/api/v1/documents/${doc.guid}/versions/${s.versionNumber}/download"
                                      class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium bg-gray-100 dark:bg-[#2e3b4a] hover:bg-gray-200 dark:hover:bg-[#38495f] text-gray-700 dark:text-gray-200 transition-colors border border-gray-200 dark:border-[#38495f]"
                                      title="Download historical asset for version ${s.versionNumber}"
                                    >
                                      ${icon('Download', { className: 'w-3 h-3' })} Download (v${s.versionNumber})
                                    </a>
                                    <ui5-button
                                      class="plib-button"
                                      data-action="rollback-version"
                                      data-guid="${doc.guid}"
                                      data-version="${s.versionNumber}"
                                      icon="history"
                                      design="Emphasized"
                                    >
                                      Rollback
                                    </ui5-button>
                                  </div>
                                </td>
                              </tr>
                            `.toString()
                          )
                          .join('')
                      )}
                    </tbody>
                  </table>
                </div>
              `}
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------------
  // Behaviour
  // ------------------------------------------------------------------

  /**
   * Post-render lifecycle callback that wires action buttons, tab navigation, and chat interactions.
   *
   * WHAT: Attaches handlers for back button, version modal, asset download, .bib file export,
   * document deletion, tab switching, BibTeX clipboard copy, summary regeneration, suggested prompt clicks,
   * and chat form submissions.
   * WHY: Binds all interactive controls after the template markup is rendered, ensuring that dynamic
   * UI5 Web Components and buttons correctly trigger state changes and API calls.
   */
  protected afterRender(): void {
    this.on('[data-action="back"]', 'click', () => appStore.backToList());
    this.on('[data-action="open-version"]', 'click', () => appStore.openVersionModal());
    this.on('[data-action="download-asset"]', 'click', () => this.downloadAsset());
    this.on('[data-action="export-bibtex"]', 'click', () => this.exportBibtexFile());
    this.on('[data-action="delete"]', 'click', () => {
      const doc = this.doc;
      if (doc) {
        appStore.requestDelete(doc);
      }
    });

    this.onAll('[data-action="rollback-version"]', 'click', (event) => {
      const btn = event.currentTarget as HTMLElement;
      const targetVersion = parseInt(btn.dataset.version || '0', 10);
      const guid = btn.dataset.guid;
      if (!guid || !targetVersion) return;
      void appStore.rollbackDocument(guid, targetVersion);
    });

    this.onAll('[data-tab]', 'click', (event) => {
      this.activeTab = (event.currentTarget as HTMLElement).dataset.tab as ObjectPageTab;
      this.render();
    });

    this.on('[data-action="copy-bibtex"]', 'click', () => this.copyBibtex());

    this.onAll('ui5-button[data-regenerate]', 'click', (event) => {
      const model = (event.currentTarget as HTMLElement).dataset.regenerate as SummaryModel;
      void appStore.regenerateSummary(model);
    });

    this.onAll('[data-prompt]', 'click', (event) => {
      this.chatInput = (event.currentTarget as HTMLElement).dataset.prompt as string;
      this.render();
    });

    this.on('ui5-input[data-input="chat"]', 'input', (event) => {
      const previous = this.chatInput;
      this.chatInput = (event.currentTarget as Input).value;
      // Only re-render when the Send button's disabled state actually flips.
      if (Boolean(previous.trim()) !== Boolean(this.chatInput.trim())) {
        this.render();
      }
    });

    this.on('ui5-input[data-input="chat"]', 'keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Enter') {
        event.preventDefault();
        void this.sendChat();
      }
    });

    this.on('[data-action="send-chat"]', 'click', () => void this.sendChat());
    this.on('form[data-form="chat"]', 'submit', (event) => {
      event.preventDefault();
      void this.sendChat();
    });

    this.scrollChatToBottom();
  }

  /**
   * Scrolls the conversation message feed to the newest message at the bottom.
   *
   * WHAT: Sets `feed.scrollTop = feed.scrollHeight`.
   * WHY: Ensures the researcher immediately sees their sent question and the incoming assistant reply
   * without needing to manually scroll down.
   */
  private scrollChatToBottom(): void {
    const feed = this.$('[data-chat-feed]');
    if (feed) {
      feed.scrollTop = feed.scrollHeight;
    }
  }

  /**
   * Initiates direct browser download of the document's original physical file.
   *
   * WHAT: Directs `window.location.href` to the adapter's download URL.
   * WHY: Triggers native browser streaming attachment downloads without loading large binary blobs
   * into JavaScript memory buffers.
   */
  private downloadAsset(): void {
    const doc = this.doc;
    if (!doc) {
      return;
    }
    // Synchronous URL construction; no request travels over the bus here.
    window.location.href = backendStore.adapter.getDownloadUrl(doc.guid);
  }

  /**
   * Exports the document's BibTeX citation record as a downloadable `.bib` file.
   *
   * WHAT: Creates a client-side Blob with `text/plain` content, generates an object URL,
   * simulates an anchor click, and revokes the URL.
   * WHY: Enables researchers to save standard BibTeX files directly into their citation managers
   * (e.g. Zotero, Mendeley, JabRef, LaTeX projects) with zero server overhead.
   */
  private exportBibtexFile(): void {
    const doc = this.doc;
    if (!doc) {
      return;
    }
    const blob = new Blob([doc.bibtexRaw], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${doc.bibtex.bibKey || 'document'}.bib`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Copies raw BibTeX citation text to the operating system clipboard.
   *
   * WHAT: Calls `navigator.clipboard.writeText(doc.bibtexRaw)`, sets `copiedBib = true`,
   * re-renders to display green "Copied!" feedback, and sets a 2-second timer to reset the button state.
   * WHY: Gives researchers a fast, frictionless way to paste citations into LaTeX documents,
   * with clear temporary visual confirmation.
   */
  private copyBibtex(): void {
    const doc = this.doc;
    if (!doc) {
      return;
    }
    void navigator.clipboard.writeText(doc.bibtexRaw);
    this.copiedBib = true;
    this.render();
    if (this.copiedTimer !== null) {
      clearTimeout(this.copiedTimer);
    }
    this.copiedTimer = setTimeout(() => {
      this.copiedTimer = null;
      this.copiedBib = false;
      this.render();
    }, COPIED_RESET_MS);
  }

  /**
   * Sends a user question to the Qdrant-backed RAG service and appends the grounded answer.
   *
   * WHAT:
   * 1. Constructs and appends the user's `ChatMessage` to local state.
   * 2. Extracts a rolling history window of the previous 6 conversation turns.
   * 3. Sets loading state and re-renders to show the assistant typing indicator.
   * 4. Dispatches `chatWithDocument` through the backend gateway.
   * 5. Appends the model's answer along with retrieved citation chunks and similarity scores.
   * 6. Recovers cleanly on error, displaying an informative error message.
   *
   * WHY:
   * 1. Multi-turn context: Sending the last 6 turns maintains conversational continuity
   *    (e.g. answering follow-up questions like "Can you elaborate on that point?").
   * 2. Grounded citations: Displaying citation chunk indices and similarity percentages
   *    allows researchers to verify the answer against original document excerpts, preventing hallucinations.
   */
  private async sendChat(): Promise<void> {
    const doc = this.doc;
    if (!doc || !this.chatInput.trim() || this.chatLoading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: this.chatInput.trim(),
      timestamp: nowLabel()
    };

    // The history sent to the backend excludes the message being asked,
    // matching the React implementation's stale-closure read of `chatMessages`.
    const history = this.chatMessages
      .slice(-6)
      .map((message) => ({ role: message.role, text: message.text }));

    this.chatMessages = [...this.chatMessages, userMessage];
    this.chatInput = '';
    this.chatLoading = true;
    this.render();

    try {
      const data = await requestBackend('chatWithDocument', {
        guid: doc.guid,
        question: userMessage.text,
        chatHistory: history
      });

      this.chatMessages = [
        ...this.chatMessages,
        {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          text: data.answer,
          timestamp: nowLabel(),
          citations: data.citations
        }
      ];
    } catch (err: any) {
      this.chatMessages = [
        ...this.chatMessages,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: `⚠️ An error occurred while retrieving answer from Llama: ${err?.message}`,
          timestamp: nowLabel()
        }
      ];
    } finally {
      this.chatLoading = false;
      this.render();
    }
  }
}
