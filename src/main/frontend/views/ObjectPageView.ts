/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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

type ObjectPageTab = 'info' | 'summaries' | 'chat';

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
    defaultModelName: 'Ollama Llama 3.3 (70B)',
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

  constructor() {
    super(undefined, 'div', 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6');
  }

  protected onMount(): void {
    this.track(
      watch(
        appStore,
        (state) => [state.activeDocument, state.summarizingModel],
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

  private get doc(): DocumentRecord | null {
    return appStore.state.activeDocument;
  }

  /** Mirrors React's `key={activeDocument.guid}` remount semantics. */
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
    `;
  }

  private header(doc: DocumentRecord): RawHtml {
    const t = i18nStore.state.t;

    return html`
      <div class="bg-white rounded-lg shadow-sm border border-[#e2e8f0] overflow-hidden">
        <div
          class="px-6 py-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 bg-[#f8fafc]"
        >
          <button
            type="button"
            data-action="back"
            class="flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-[#0070f2] transition-colors group cursor-pointer"
          >
            ${icon('NavBack', {
              className: 'w-4 h-4 text-gray-500 group-hover:text-[#0070f2] transition-colors'
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
                  class="px-2 py-0.5 text-xs font-bold rounded bg-[#0070f2] text-white uppercase tracking-wider font-mono"
                  >${doc.format}</span
                >
                <span
                  class="px-2 py-0.5 text-xs font-semibold rounded bg-[#f1f5f9] text-[#334155] border border-[#cbd5e1] font-mono"
                  >@${doc.bibtex.entryType}</span
                >
                <span
                  class="px-2 py-0.5 text-xs font-medium rounded bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >${t.common.version} ${String(doc.versionNumber || 1)}</span
                >
                <span class="text-xs text-gray-400 font-mono">Key: ${doc.bibtex.bibKey}</span>
              </div>

              <h1 class="text-2xl font-bold text-gray-900 leading-snug">
                ${doc.bibtex.title || doc.fileName}
              </h1>

              <div class="text-sm text-gray-600 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span class="font-medium text-gray-800">${doc.bibtex.author}</span>
                ${doc.bibtex.year ? html`<span class="text-gray-500">(${doc.bibtex.year})</span>` : ''}
                ${doc.bibtex.journal
                  ? html`<span class="text-gray-500 italic">${doc.bibtex.journal}</span>`
                  : ''}
                ${doc.bibtex.booktitle
                  ? html`<span class="text-gray-500 italic">${doc.bibtex.booktitle}</span>`
                  : ''}
              </div>
            </div>

            <div
              class="bg-[#f8fafc] p-3 rounded-lg border border-gray-200 text-right min-w-[200px]"
            >
              <div class="text-[10px] text-gray-400 uppercase font-semibold">
                ${t.objectPage.guid}
              </div>
              <div class="font-mono text-xs text-gray-700 break-all select-all">${doc.guid}</div>
              ${doc.previousVersionGuid
                ? html`<div class="mt-1 pt-1 border-t border-gray-200 text-[10px] text-gray-500">
                    <span>Replaced GUID: </span>
                    <span class="font-mono text-gray-600 truncate block"
                      >${doc.previousVersionGuid}</span
                    >
                  </div>`
                : ''}
            </div>
          </div>

          <div
            class="mt-6 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs"
          >
            <div>
              <span class="text-gray-400 block">${t.listReport.fileName}</span>
              <span class="font-mono font-medium text-gray-800 truncate block">${doc.fileName}</span>
            </div>
            <div>
              <span class="text-gray-400 block">${t.objectPage.fileSize}</span>
              <span class="font-medium text-gray-800">${doc.fileSizeFormatted}</span>
            </div>
            <div>
              <span class="text-gray-400 block">${t.objectPage.uploadedOn}</span>
              <span class="font-medium text-gray-800">${formatDateTime(doc.uploadDate)}</span>
            </div>
            <div>
              <span class="text-gray-400 block">${t.objectPage.lastModified}</span>
              <span class="font-medium text-gray-800">${formatDateTime(doc.editDate)}</span>
            </div>
          </div>
        </div>

        <div
          class="flex border-t border-gray-200 bg-[#f8fafc] px-6 gap-6 text-xs font-semibold"
          role="tablist"
        >
          ${raw(
            [
              { id: 'info' as const, label: t.objectPage.tabOverview, iconKey: 'BookOpen' as const, iconClass: 'w-3.5 h-3.5' },
              { id: 'summaries' as const, label: t.objectPage.tabSummaries, iconKey: 'Sparkles' as const, iconClass: 'w-3.5 h-3.5 text-amber-500' },
              { id: 'chat' as const, label: t.objectPage.tabChat, iconKey: 'Bot' as const, iconClass: 'w-3.5 h-3.5 text-[#0070f2]' }
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
                      ? 'border-[#0070f2] text-[#0070f2]'
                      : 'border-transparent text-gray-500 hover:text-gray-800'
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

  private infoTab(doc: DocumentRecord): RawHtml {
    const b = doc.bibtex;

    return html`
      <div class="space-y-6">
        <div class="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-6 space-y-4">
          <h3
            class="font-semibold text-sm text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3"
          >
            ${icon('Info', { className: 'w-4 h-4 text-[#0070f2]' })}
            BibTeX Standard Metadata Specification
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            ${raw(this.metaItem('Title', b.title || '—', 'text-gray-900 font-medium'))}
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
                  <span class="font-semibold text-gray-500 block mb-0.5">DOI</span>
                  <a
                    href="https://doi.org/${b.doi}"
                    target="_blank"
                    rel="noreferrer"
                    class="text-[#0070f2] hover:underline flex items-center gap-1 font-mono text-[11px]"
                  >
                    ${b.doi} ${icon('ExternalLink', { className: 'w-3 h-3' })}
                  </a>
                </div>`
              : ''}
            ${b.url
              ? html`<div>
                  <span class="font-semibold text-gray-500 block mb-0.5">URL</span>
                  <a
                    href="${b.url}"
                    target="_blank"
                    rel="noreferrer"
                    class="text-[#0070f2] hover:underline flex items-center gap-1 font-mono text-[11px] truncate max-w-[260px]"
                  >
                    ${b.url} ${icon('ExternalLink', { className: 'w-3 h-3 shrink-0' })}
                  </a>
                </div>`
              : ''}
            ${b.keywords
              ? html`<div class="md:col-span-2">
                  <span class="font-semibold text-gray-500 block mb-0.5">Keywords</span>
                  <div class="flex flex-wrap gap-1 mt-1">
                    ${raw(
                      b.keywords
                        .split(/[,;]/)
                        .map((keyword) =>
                          html`<span
                            class="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-[11px]"
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
            ? html`<div class="pt-4 border-t border-gray-100">
                <span class="font-semibold text-gray-500 block mb-1">Abstract</span>
                <p
                  class="text-xs text-gray-700 leading-relaxed bg-[#f8fafc] p-3 rounded border border-gray-200"
                >
                  ${b.abstract}
                </p>
              </div>`
            : ''}
        </div>

        <div class="bg-white rounded-lg shadow-sm border border-[#e2e8f0] p-6 space-y-3">
          <div class="flex items-center justify-between border-b border-gray-100 pb-3">
            <div class="flex items-center gap-2">
              ${icon('FileCode', { className: 'w-4 h-4 text-[#0070f2]' })}
              <h3 class="font-semibold text-sm text-gray-900">
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

  private metaItem(label: string, value: string, valueClass = 'text-gray-900'): string {
    return html`
      <div>
        <span class="font-semibold text-gray-500 block mb-0.5">${label}</span>
        <p class="${valueClass}">${value}</p>
      </div>
    `.toString();
  }

  // ------------------------------------------------------------------
  // Tab 2 — dual-model summaries
  // ------------------------------------------------------------------

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

  private summaryCard(spec: SummaryCardSpec, summary: SummaryRecord | undefined): string {
    const summarizingModel = appStore.state.summarizingModel;
    const isBusy = summarizingModel === spec.model;
    const hasText = Boolean(summary?.summaryText);

    return html`
      <div
        class="bg-white rounded-lg shadow-sm border border-[#e2e8f0] flex flex-col justify-between overflow-hidden"
      >
        <div class="p-5 border-b border-gray-100 bg-[#fafafa]">
          <div class="flex items-start justify-between gap-3">
            <div>
              <div class="flex items-center gap-2">
                ${icon(spec.iconKey, { className: spec.iconClass })}
                <h4 class="font-bold text-sm text-gray-900">
                  ${summary?.modelName || spec.defaultModelName}
                </h4>
              </div>
              <div class="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-gray-500">
                ${hasText
                  ? html`<span
                        class="flex items-center gap-1.5 font-mono bg-[#f1f5f9] px-2 py-0.5 rounded border border-gray-200 text-gray-800"
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
                      <span class="text-gray-300">•</span>
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
          class="p-6 text-xs text-gray-800 leading-relaxed space-y-3 prose prose-sm max-w-none"
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
                  class="whitespace-pre-wrap font-sans text-gray-700 leading-relaxed bg-[#f8fafc] p-4 rounded-lg border border-gray-100"
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
                  <div class="text-xs font-semibold text-gray-800">${spec.emptyTitle}</div>
                  <p class="text-[11px] text-gray-500 max-w-sm mx-auto leading-normal">
                    ${spec.emptyBody}
                  </p>
                  <ui5-button
                    class="plib-button mt-1"
                    design="Emphasized"
                    data-regenerate="${spec.model}"
                    ${summarizingModel ? raw('disabled') : ''}
                  >
                    ${icon('RotateCw', { className: 'w-3.5 h-3.5 mr-1.5' })} ${spec.emptyAction}
                  </ui5-button>
                </div>`}
        </div>

        <div
          class="px-5 py-2.5 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-400 flex items-center justify-between"
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

  private chatTab(doc: DocumentRecord): RawHtml {
    const prompts = doc.bibtex.title.toLowerCase().includes('wizard of oz')
      ? WIZARD_PROMPTS
      : DEFAULT_PROMPTS;

    return html`
      <div
        class="bg-white rounded-lg shadow-sm border border-[#e2e8f0] overflow-hidden flex flex-col h-[650px]"
      >
        <div class="p-4 bg-[#f8fafc] border-b border-gray-200 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div
              class="w-8 h-8 rounded-full bg-[#0070f2] flex items-center justify-center text-white"
            >
              ${icon('Bot', { className: 'w-4 h-4' })}
            </div>
            <div>
              <div class="text-xs font-bold text-gray-900 flex items-center gap-2">
                <span>Chat with Document Assistant</span>
                <span
                  class="px-2 py-0.5 text-[10px] font-semibold bg-[#ebf8ff] text-[#0070f2] rounded border border-[#b9e5fe]"
                  >Active Model: Llama 3.3</span
                >
              </div>
              <div class="text-[11px] text-gray-500">
                Retrieval-Augmented Generation backed by Qdrant vector database chunks
              </div>
            </div>
          </div>

          <div class="hidden sm:flex items-center gap-2 text-xs text-gray-400 font-mono">
            <span class="w-2 h-2 rounded-full bg-green-500"></span>
            Qdrant Connected
          </div>
        </div>

        <div
          class="flex-1 overflow-y-auto p-5 space-y-4 bg-[#fafbfc]"
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
                  class="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-2 shadow-sm"
                >
                  <div
                    class="w-4 h-4 border-2 border-[#0070f2] border-t-transparent rounded-full animate-spin"
                  ></div>
                  <span>Searching Qdrant vector space &amp; generating Llama response...</span>
                </div>
              </div>`
            : ''}
        </div>

        <div class="px-5 py-2 border-t border-gray-100 bg-white flex flex-wrap gap-2 text-xs">
          <span class="text-[11px] text-gray-400 font-medium py-1">Quick prompts:</span>
          ${raw(
            prompts
              .map((prompt) =>
                html`<button
                  type="button"
                  data-prompt="${prompt}"
                  class="px-2.5 py-1 rounded bg-[#f1f5f9] hover:bg-[#e2e8f0] text-gray-700 text-[11px] transition-colors cursor-pointer border border-gray-200"
                >
                  ${prompt}
                </button>`.toString()
              )
              .join('')
          )}
        </div>

        <form
          data-form="chat"
          class="p-3 bg-white border-t border-gray-200 flex items-center gap-2"
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
              : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
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
  // Behaviour
  // ------------------------------------------------------------------

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

  private scrollChatToBottom(): void {
    const feed = this.$('[data-chat-feed]');
    if (feed) {
      feed.scrollTop = feed.scrollHeight;
    }
  }

  private downloadAsset(): void {
    const doc = this.doc;
    if (!doc) {
      return;
    }
    // Synchronous URL construction; no request travels over the bus here.
    window.location.href = backendStore.adapter.getDownloadUrl(doc.guid);
  }

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
