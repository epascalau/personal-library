/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Camunda BPMN 2.0 Process Definition & Visual Flow Inspector modal.
 *
 * Displays the complete BPMN 2.0 XML model along with an architectural stage flow diagram,
 * Camunda 7 / Camunda 8 execution mappings, and one-click export for Camunda Modeler.
 */

import { html, raw, RawHtml } from '../../core/html';
import { watch } from '../../core/store';
import { appStore } from '../../stores/appStore';
import { icon } from '../../ui5/icons';
import { DialogView } from './DialogView';

const COPIED_RESET_MS = 2000;

type BpmnTab = 'mindmap' | 'diagram' | 'pipeline' | 'xml' | 'deployment';

export class BpmnModalView extends DialogView {
  private activeTab: BpmnTab = 'mindmap';

  private xmlContent = '';

  private loading = true;

  private copied = false;

  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Constructs the BPMN modal view with wide dialog styling.
   *
   * WHAT: Initializes base `DialogView` with custom `plib-dialog--bpmn` class.
   * WHY: Scopes dialog width to max-w-5xl, providing ample viewport space for multi-stage workflow cards and XML code.
   */
  constructor() {
    super(undefined, 'plib-dialog plib-dialog--bpmn');
  }

  /**
   * Evaluates if the BPMN inspection modal is open.
   *
   * WHAT: Returns `appStore.state.bpmnModalOpen`.
   * WHY: Synchronizes component visibility with central reactive application state.
   *
   * @returns `true` if dialog is open, `false` otherwise.
   */
  protected isOpen(): boolean {
    return appStore.state.bpmnModalOpen;
  }

  /**
   * Handles user dismissal of the BPMN modal dialog.
   *
   * WHAT: Dispatches `appStore.closeBpmnModal()`.
   * WHY: Restores UI focus and clears modal presentation state.
   */
  protected requestClose(): void {
    appStore.closeBpmnModal();
  }

  /**
   * Registers reactive store listeners for opening the dialog and loads the BPMN model.
   *
   * WHAT: Subscribes to `bpmnModalOpen` changes, triggers rendering, and lazily fetches the BPMN XML when opened.
   * WHY: Avoids network overhead by only loading the BPMN definition asset on demand.
   */
  protected onMount(): void {
    super.onMount();
    this.track(
      watch(
        appStore,
        (state) => state.bpmnModalOpen,
        (open) => {
          this.requestRender();
          if (open) {
            void this.loadBpmnXml();
          }
        }
      )
    );
    this.track(() => {
      if (this.copiedTimer !== null) {
        clearTimeout(this.copiedTimer);
        this.copiedTimer = null;
      }
    });
  }

  /**
   * Fetches the BPMN 2.0 XML definition from the server API endpoint.
   *
   * WHAT: Dispatches HTTP request to `/api/v1/bpmn/document-ingestion.bpmn` and caches text.
   * WHY: Guarantees the frontend displays the exact XML served to Camunda engines.
   */
  private async loadBpmnXml(): Promise<void> {
    this.loading = true;
    this.requestRender();

    try {
      const response = await fetch('/api/v1/bpmn/document-ingestion.bpmn');
      if (response.ok) {
        this.xmlContent = await response.text();
      } else {
        this.xmlContent = '<!-- Failed to load BPMN 2.0 XML from /api/v1/bpmn/document-ingestion.bpmn -->';
      }
    } catch (err: any) {
      this.xmlContent = `<!-- Error retrieving BPMN definition: ${err?.message || 'Network error'} -->`;
    } finally {
      this.loading = false;
      this.requestRender();
    }
  }

  /**
   * Copies the raw BPMN 2.0 XML markup to the system clipboard.
   *
   * WHAT: Invokes `navigator.clipboard.writeText` and toggles `copied` state with auto-reset timer.
   * WHY: Enables quick paste into external editors or Camunda Modeler XML view with visual confirmation.
   */
  private copyXml(): void {
    if (!this.xmlContent) return;

    void navigator.clipboard.writeText(this.xmlContent);
    this.copied = true;
    this.requestRender();

    if (this.copiedTimer !== null) {
      clearTimeout(this.copiedTimer);
    }
    this.copiedTimer = setTimeout(() => {
      this.copied = false;
      this.copiedTimer = null;
      this.requestRender();
    }, COPIED_RESET_MS);
  }

  /**
   * Switches the active inspector tab view.
   *
   * WHAT: Updates `activeTab` property and re-renders the dialog.
   * WHY: Organizes complex workflow details into digestible visual, code, and deployment views.
   *
   * @param tab Selected tab identifier.
   */
  private switchTab(tab: BpmnTab): void {
    this.activeTab = tab;
    this.requestRender();
  }

  /**
   * Renders the header title and metadata badges.
   *
   * WHAT: Emits modal title, subtitle, and Camunda 7 / Camunda 8 architecture tags.
   * WHY: Frames the dialog with enterprise architectural context and standards compliance.
   *
   * @returns RawHtml header block.
   */
  protected header(): RawHtml {
    return html`
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg bg-teal-600 dark:bg-teal-500 flex items-center justify-center text-white shrink-0 shadow-xs">
          ${icon('GitBranch', { className: 'w-5 h-5' })}
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-base font-bold text-gray-900 dark:text-white">
              Camunda BPMN 2.0 Process Model
            </h2>
            <span class="px-2 py-0.5 text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 rounded border border-teal-200 dark:border-teal-800/60 font-mono">
              Process_DocumentIngestionRAG
            </span>
          </div>
          <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Enterprise Document Ingestion, Parallel Dual AI Summarization & Qdrant RAG Orchestration
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Renders the main modal body including tab bar and active panel.
   *
   * WHAT: Generates tab navigation and conditionally renders the pipeline overview, XML viewer, or deployment guide.
   * WHY: Provides structured, multi-dimensional inspection of the business process.
   *
   * @returns RawHtml modal body contents.
   */
  protected body(): RawHtml {
    return html`
      <div class="flex flex-col h-[75vh] max-h-[820px] text-xs">
        <!-- Top Toolbar & Tabs -->
        <div class="flex flex-wrap items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-[#202934] border-b border-gray-200 dark:border-[#2e3b4a] shrink-0">
          <div class="flex flex-wrap items-center gap-1 bg-white dark:bg-[#182029] p-1 rounded-lg border border-gray-200 dark:border-[#2e3b4a]">
            <button
              type="button"
              data-action="tab-mindmap"
              class="px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${this.activeTab === 'mindmap'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#263342]'}"
            >
              🧠 Full Functionality Mindmap
            </button>
            <button
              type="button"
              data-action="tab-diagram"
              class="px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${this.activeTab === 'diagram'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#263342]'}"
            >
              BPMN Diagram
            </button>
            <button
              type="button"
              data-action="tab-pipeline"
              class="px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${this.activeTab === 'pipeline'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#263342]'}"
            >
              Task Breakdown
            </button>
            <button
              type="button"
              data-action="tab-xml"
              class="px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${this.activeTab === 'xml'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#263342]'}"
            >
              BPMN 2.0 XML
            </button>
            <button
              type="button"
              data-action="tab-deployment"
              class="px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${this.activeTab === 'deployment'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#263342]'}"
            >
              Camunda Guide
            </button>
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
            ${this.activeTab === 'mindmap'
              ? html`
                  <a
                    href="/api/v1/diagrams/mindmap.png?download=true"
                    download="personal-library-mindmap.png"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Download 4K Ultra-HD Mindmap PNG (3840px)"
                  >
                    ${icon('Download', { className: 'w-3 h-3' })}
                    4K PNG
                  </a>
                  <a
                    href="/api/v1/diagrams/mindmap.pdf?download=true"
                    download="personal-library-mindmap.pdf"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Download 2-Page Architectural Vector Mindmap PDF"
                  >
                    ${icon('Download', { className: 'w-3 h-3' })}
                    PDF Spec
                  </a>
                  <a
                    href="/api/v1/diagrams/mindmap.svg?download=true"
                    download="personal-library-mindmap.svg"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Download Infinitely Scalable Vector SVG"
                  >
                    ${icon('Download', { className: 'w-3 h-3' })}
                    Vector SVG
                  </a>
                  <a
                    href="/api/v1/diagrams/mindmap.mmd?download=true"
                    download="personal-library-mindmap.mmd"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Download Mermaid Mindmap Markup"
                  >
                    ${icon('Download', { className: 'w-3 h-3' })}
                    Mermaid
                  </a>
                `
              : html`
                  <a
                    href="/api/v1/diagrams/bpmn.png?download=true"
                    download="document_ingestion_rag.png"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Download high-resolution 2x PNG image (3480px)"
                  >
                    ${icon('Download', { className: 'w-3 h-3' })}
                    PNG Image
                  </a>
                  <a
                    href="/api/v1/diagrams/bpmn.pdf?download=true"
                    download="document_ingestion_rag.pdf"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Download 4-page architectural specification PDF"
                  >
                    ${icon('Download', { className: 'w-3 h-3' })}
                    PDF Spec
                  </a>
                  <a
                    href="/api/v1/bpmn/document-ingestion.bpmn?download=true"
                    download="document-ingestion-rag.bpmn"
                    class="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    title="Download executable BPMN 2.0 XML for Camunda Modeler"
                  >
                    ${icon('Download', { className: 'w-3 h-3' })}
                    BPMN Model
                  </a>
                  <ui5-button
                    class="plib-button"
                    design="Default"
                    icon="${this.copied ? 'accept' : 'copy'}"
                    data-action="copy-bpmn"
                  >
                    ${this.copied ? 'Copied XML!' : 'Copy XML'}
                  </ui5-button>
                `}
          </div>
        </div>

        <!-- Content Area -->
        <div class="flex-1 overflow-y-auto p-5 bg-[#fafbfc] dark:bg-[#151c24]">
          ${this.activeTab === 'mindmap'
            ? this.renderMindmapView()
            : this.activeTab === 'diagram'
            ? this.renderDiagramView()
            : this.activeTab === 'pipeline'
            ? this.renderPipelineView()
            : this.activeTab === 'xml'
            ? this.renderXmlView()
            : this.renderDeploymentView()}
        </div>
      </div>
    `;
  }

  /**
   * Renders the Full Functionality Mindmap viewer with image, download links, and 8-pillar capability catalog.
   */
  private renderMindmapView(): RawHtml {
    return html`
      <div class="space-y-5">
        <!-- Quick Stats Banner -->
        <div class="p-3.5 bg-linear-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 rounded-xl border border-blue-500/30 flex flex-wrap items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-lg bg-blue-600/30 border border-blue-400/50 flex items-center justify-center text-lg">
              🧠
            </div>
            <div>
              <div class="font-bold text-white text-sm">Personal Library &amp; AI Research Engine — Capability Mindmap</div>
              <div class="text-xs text-blue-200">100% Comprehensive Functional Architecture: Ingestion, BibTeX, Dual AI, Qdrant RAG, UI5, Security &amp; Tooling</div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold">8 Strategic Pillars</span>
            <span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[11px] font-bold">32 Functional Modules</span>
          </div>
        </div>

        <!-- Format & Download Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div class="p-3 bg-white dark:bg-[#1c232b] rounded-lg border border-gray-200 dark:border-[#2e3b4a] shadow-xs flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                ${icon('FileText', { className: 'w-3.5 h-3.5 text-blue-600' })}
                Ultra-HD 4K PNG
              </div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400">3840 × 2400 px · High DPI</p>
            </div>
            <a
              href="/api/v1/diagrams/mindmap.png"
              target="_blank"
              rel="noopener noreferrer"
              class="px-2 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 rounded text-[11px] font-medium hover:underline flex items-center gap-1"
            >
              <span>View</span>
              ${icon('ExternalLink', { className: 'w-3 h-3' })}
            </a>
          </div>

          <div class="p-3 bg-white dark:bg-[#1c232b] rounded-lg border border-gray-200 dark:border-[#2e3b4a] shadow-xs flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                ${icon('BookOpen', { className: 'w-3.5 h-3.5 text-purple-600' })}
                Archival Vector PDF
              </div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400">2 Pages · Spread + Catalog</p>
            </div>
            <a
              href="/api/v1/diagrams/mindmap.pdf"
              target="_blank"
              rel="noopener noreferrer"
              class="px-2 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 rounded text-[11px] font-medium hover:underline flex items-center gap-1"
            >
              <span>View</span>
              ${icon('ExternalLink', { className: 'w-3 h-3' })}
            </a>
          </div>

          <div class="p-3 bg-white dark:bg-[#1c232b] rounded-lg border border-gray-200 dark:border-[#2e3b4a] shadow-xs flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                ${icon('Layers', { className: 'w-3.5 h-3.5 text-teal-600' })}
                Scalable Vector SVG
              </div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400">Infinite Zoom · Crisp Text</p>
            </div>
            <a
              href="/api/v1/diagrams/mindmap.svg"
              target="_blank"
              rel="noopener noreferrer"
              class="px-2 py-1 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-300 rounded text-[11px] font-medium hover:underline flex items-center gap-1"
            >
              <span>View</span>
              ${icon('ExternalLink', { className: 'w-3 h-3' })}
            </a>
          </div>

          <div class="p-3 bg-white dark:bg-[#1c232b] rounded-lg border border-gray-200 dark:border-[#2e3b4a] shadow-xs flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                ${icon('FileCode2', { className: 'w-3.5 h-3.5 text-amber-600' })}
                Mermaid &amp; PlantUML
              </div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400">Source .mmd &amp; .puml markup</p>
            </div>
            <a
              href="/api/v1/diagrams/mindmap.mmd"
              target="_blank"
              rel="noopener noreferrer"
              class="px-2 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 rounded text-[11px] font-medium hover:underline flex items-center gap-1"
            >
              <span>View</span>
              ${icon('ExternalLink', { className: 'w-3 h-3' })}
            </a>
          </div>
        </div>

        <!-- Embedded Interactive Mindmap Visual Container -->
        <div class="rounded-xl border border-gray-200 dark:border-[#2e3b4a] bg-[#090d16] overflow-hidden shadow-md">
          <div class="px-4 py-2.5 bg-[#0f172a] border-b border-gray-800 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2 text-gray-300 font-semibold">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Interactive Mindmap Canvas (Click Image to View Full 4K Resolution)
            </div>
            <div class="flex items-center gap-3">
              <a
                href="/api/v1/diagrams/mindmap.svg"
                target="_blank"
                rel="noopener noreferrer"
                class="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-[11px]"
              >
                <span>Open Vector SVG</span>
                ${icon('ExternalLink', { className: 'w-3 h-3' })}
              </a>
            </div>
          </div>
          <div class="p-3 flex justify-center items-center overflow-x-auto bg-[#070b13]">
            <a href="/api/v1/diagrams/mindmap.png" target="_blank" rel="noopener noreferrer" class="block cursor-zoom-in" title="Click to view ultra-high-resolution 4K mindmap">
              <img
                src="/api/v1/diagrams/mindmap.svg"
                alt="Personal Library Full Functionality Mindmap"
                class="w-full max-w-[1280px] h-auto rounded-lg border border-gray-800 hover:border-blue-500/60 transition-colors shadow-2xl"
              />
            </a>
          </div>
        </div>

        <!-- 8 Core Pillars Matrix Table -->
        <div class="space-y-3">
          <h4 class="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
            ${icon('Layers', { className: 'w-4 h-4 text-blue-500' })}
            8 Strategic Pillars &amp; Capability Catalog
          </h4>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <!-- Pillar 1 -->
            <div class="p-3 bg-white dark:bg-[#1c232b] rounded-lg border border-l-4 border-gray-200 dark:border-[#2e3b4a] border-l-emerald-500">
              <div class="font-bold text-gray-900 dark:text-white flex items-center justify-between mb-1">
                <span>1. Ingestion &amp; Document Pipeline</span>
                <span class="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px]">Camunda BPMN</span>
              </div>
              <p class="text-gray-500 dark:text-gray-400 text-[11px] mb-2">Automated multi-format document ingestion, tokenization and storage pipeline.</p>
              <ul class="space-y-1 text-gray-600 dark:text-gray-300 text-[11px]">
                <li>• Formats: PDF, DOCX, Markdown, LaTeX, Plain Text with MIME validation</li>
                <li>• Drag-and-drop file upload with client-side BibTeX extraction preview</li>
                <li>• Camunda BPMN 2.0 7-task process with human validation gateway loop</li>
                <li>• SHA-256 fingerprinting for de-duplication and versioned disk archiving</li>
              </ul>
            </div>

            <!-- Pillar 2 -->
            <div class="p-3 bg-white dark:bg-[#1c232b] rounded-lg border border-l-4 border-gray-200 dark:border-[#2e3b4a] border-l-amber-500">
              <div class="font-bold text-gray-900 dark:text-white flex items-center justify-between mb-1">
                <span>2. BibTeX &amp; LaTeX Metadata Engine</span>
                <span class="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px]">AST Lexer</span>
              </div>
              <p class="text-gray-500 dark:text-gray-400 text-[11px] mb-2">Academic citation analysis, regex AST lexing and LaTeX accent sanitization.</p>
              <ul class="space-y-1 text-gray-600 dark:text-gray-300 text-[11px]">
                <li>• Parses @article, @book, @inproceedings, @techreport, @phdthesis, @misc</li>
                <li>• 14 structured attributes: title, author, year, month, DOI, URL, abstract, etc.</li>
                <li>• LaTeX accent sanitization (converting {\"a}, {\'e} to standard UTF-8 characters)</li>
                <li>• In-browser BibTeX editor, clipboard citation copy and faceted filtering</li>
              </ul>
            </div>

            <!-- Pillar 3 -->
            <div class="p-3 bg-white dark:bg-[#1c232b] rounded-lg border border-l-4 border-gray-200 dark:border-[#2e3b4a] border-l-blue-500">
              <div class="font-bold text-gray-900 dark:text-white flex items-center justify-between mb-1">
                <span>3. Dual AI Models &amp; Benchmarking</span>
                <span class="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px]">Spring AI</span>
              </div>
              <p class="text-gray-500 dark:text-gray-400 text-[11px] mb-2">Simultaneous multi-model comparative synthesis and benchmark telemetry.</p>
              <ul class="space-y-1 text-gray-600 dark:text-gray-300 text-[11px]">
                <li>• Ollama Llama 3.3 (70B Instruct): Deep academic synthesis and methodology critique</li>
                <li>• Ollama Mistral Large (2411): Rapid executive summary and core bullet takeaways</li>
                <li>• Google Gemini API cloud integration for multimodal processing fallback</li>
                <li>• Synchronized side-by-side comparator UI with latency/duration telemetry</li>
              </ul>
            </div>

            <!-- Pillar 4 -->
            <div class="p-3 bg-white dark:bg-[#1c232b] rounded-lg border border-l-4 border-gray-200 dark:border-[#2e3b4a] border-l-purple-500">
              <div class="font-bold text-gray-900 dark:text-white flex items-center justify-between mb-1">
                <span>4. Vector RAG &amp; Conversational Chat</span>
                <span class="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[10px]">Qdrant Vector</span>
              </div>
              <p class="text-gray-500 dark:text-gray-400 text-[11px] mb-2">Semantic search, dense vector embeddings and multi-turn grounded conversation.</p>
              <ul class="space-y-1 text-gray-600 dark:text-gray-300 text-[11px]">
                <li>• Semantic chunking: 500-token chunks with 50-token contextual overlap</li>
                <li>• Qdrant library_embeddings collection with Cosine distance metric &amp; HNSW</li>
                <li>• Multi-turn conversational document chat assistant with context memory</li>
                <li>• Grounded citation drawer with exact excerpt quotes and confidence scores</li>
              </ul>
            </div>

            <!-- Pillar 5 -->
            <div class="p-3 bg-white dark:bg-[#1c232b] rounded-lg border border-l-4 border-gray-200 dark:border-[#2e3b4a] border-l-rose-500">
              <div class="font-bold text-gray-900 dark:text-white flex items-center justify-between mb-1">
                <span>5. Version Control &amp; Lineage Tracking</span>
                <span class="px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px]">Audit Immutable</span>
              </div>
              <p class="text-gray-500 dark:text-gray-400 text-[11px] mb-2">Non-destructive version overwriting with persistent root lineage and rollbacks.</p>
              <ul class="space-y-1 text-gray-600 dark:text-gray-300 text-[11px]">
                <li>• In-place multipart version overwrite preserving root document GUID</li>
                <li>• Version lineage pointer chain (versionNumber, previousVersionGuid, rootGuid)</li>
                <li>• Mutation audit trail logging user identity, timestamps, and edited fields</li>
                <li>• Instant rollback capability and raw binary asset download for any prior version</li>
              </ul>
            </div>

            <!-- Pillar 6 -->
            <div class="p-3 bg-white dark:bg-[#1c232b] rounded-lg border border-l-4 border-gray-200 dark:border-[#2e3b4a] border-l-teal-500">
              <div class="font-bold text-gray-900 dark:text-white flex items-center justify-between mb-1">
                <span>6. Enterprise UI5 Frontend Experience</span>
                <span class="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 text-[10px]">SAP Fiori</span>
              </div>
              <p class="text-gray-500 dark:text-gray-400 text-[11px] mb-2">Enterprise-grade UI5 Web Components, reactive stores and internationalization.</p>
              <ul class="space-y-1 text-gray-600 dark:text-gray-300 text-[11px]">
                <li>• ListReport with multi-field FilterBar and adaptive ObjectPage with KPI header</li>
                <li>• Dual theme support: Light and Dark theme</li>
                <li>• 5 Localized languages: English, German, French, Spanish, Romanian</li>
                <li>• Observable reactive stores &amp; gateway facade with REST/Mock driver switching</li>
              </ul>
            </div>

            <!-- Pillar 7 -->
            <div class="p-3 bg-white dark:bg-[#1c232b] rounded-lg border border-l-4 border-gray-200 dark:border-[#2e3b4a] border-l-red-500">
              <div class="font-bold text-gray-900 dark:text-white flex items-center justify-between mb-1">
                <span>7. Security, Identity &amp; Governance</span>
                <span class="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[10px]">Keycloak OIDC</span>
              </div>
              <p class="text-gray-500 dark:text-gray-400 text-[11px] mb-2">OAuth2/OIDC authentication, role-based access control and copyleft licensing.</p>
              <ul class="space-y-1 text-gray-600 dark:text-gray-300 text-[11px]">
                <li>• Keycloak 24+ integration with JWT Bearer tokens and SSO session lifecycle</li>
                <li>• RBAC roles: LIBRARY_ADMIN (Full Write), CHIEF_RESEARCHER (AI &amp; RAG)</li>
                <li>• Security audit logging, path traversal blocking and sanitized filenames</li>
                <li>• GNU AGPL-3.0-or-later license protecting open-source research integrity</li>
              </ul>
            </div>

            <!-- Pillar 8 -->
            <div class="p-3 bg-white dark:bg-[#1c232b] rounded-lg border border-l-4 border-gray-200 dark:border-[#2e3b4a] border-l-indigo-500">
              <div class="font-bold text-gray-900 dark:text-white flex items-center justify-between mb-1">
                <span>8. Architecture, API &amp; Tooling Ecosystem</span>
                <span class="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px]">Full Stack</span>
              </div>
              <p class="text-gray-500 dark:text-gray-400 text-[11px] mb-2">Standards-compliant specifications, diagrams and export automation.</p>
              <ul class="space-y-1 text-gray-600 dark:text-gray-300 text-[11px]">
                <li>• OpenAPI 3.1 REST API specification and interactive Swagger schema viewer</li>
                <li>• Complete C4 diagrams and technology-specific Java + TS UML Class diagrams</li>
                <li>• Automated multi-format export engine: SVG, 4K PNG, Archival PDF, Draw.io</li>
                <li>• Complete repository ZIP exporter and interactive TypeDoc/Javadoc code docs</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the visual diagram viewer featuring image, PDF, and SVG download actions.
   *
   * WHAT: Displays the rendered BPMN process diagram image, high-resolution download links,
   * and vector graphics controls.
   * WHY: Offers immediate, intuitive visual inspection of the workflow without requiring
   * external desktop BPMN software.
   *
   * @returns RawHtml diagram viewer markup.
   */
  private renderDiagramView(): RawHtml {
    return html`
      <div class="space-y-4">
        <!-- Action & Format Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div class="p-3 bg-white dark:bg-[#1c232b] rounded-lg border border-gray-200 dark:border-[#2e3b4a] shadow-xs flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                ${icon('FileText', { className: 'w-3.5 h-3.5 text-blue-600' })}
                High-Res PNG
              </div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400">3480 × 1640 px · 2x Supersampled</p>
            </div>
            <a
              href="/document_ingestion_rag.png"
              target="_blank"
              rel="noopener noreferrer"
              class="px-2 py-1 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-300 rounded text-[11px] font-medium hover:underline flex items-center gap-1"
            >
              <span>View</span>
              ${icon('ExternalLink', { className: 'w-3 h-3' })}
            </a>
          </div>

          <div class="p-3 bg-white dark:bg-[#1c232b] rounded-lg border border-gray-200 dark:border-[#2e3b4a] shadow-xs flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                ${icon('BookOpen', { className: 'w-3.5 h-3.5 text-purple-600' })}
                Architecture PDF
              </div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400">4 Pages · Diagram &amp; Task Catalog</p>
            </div>
            <a
              href="/document_ingestion_rag.pdf"
              target="_blank"
              rel="noopener noreferrer"
              class="px-2 py-1 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 rounded text-[11px] font-medium hover:underline flex items-center gap-1"
            >
              <span>View</span>
              ${icon('ExternalLink', { className: 'w-3 h-3' })}
            </a>
          </div>

          <div class="p-3 bg-white dark:bg-[#1c232b] rounded-lg border border-gray-200 dark:border-[#2e3b4a] shadow-xs flex items-center justify-between">
            <div class="space-y-0.5">
              <div class="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                ${icon('Globe', { className: 'w-3.5 h-3.5 text-teal-600' })}
                Vector SVG
              </div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400">Scalable XML Vector Graphic</p>
            </div>
            <a
              href="/document_ingestion_rag.svg"
              target="_blank"
              rel="noopener noreferrer"
              class="px-2 py-1 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-300 rounded text-[11px] font-medium hover:underline flex items-center gap-1"
            >
              <span>View</span>
              ${icon('ExternalLink', { className: 'w-3 h-3' })}
            </a>
          </div>
        </div>

        <!-- Rendered Image Canvas -->
        <div class="bg-white dark:bg-[#1c232b] rounded-xl border border-gray-200 dark:border-[#2e3b4a] p-3 shadow-xs">
          <div class="flex items-center justify-between pb-2 mb-2 border-b border-gray-100 dark:border-[#2e3b4a] text-[11px] text-gray-500 dark:text-gray-400">
            <span>Camunda BPMN 2.0 Process Diagram · Preview</span>
            <span class="font-mono">1740 × 820 px viewport</span>
          </div>

          <div class="overflow-x-auto rounded-lg border border-gray-100 dark:border-[#273340] bg-[#f8fafc] dark:bg-[#12181f] p-2 text-center">
            <img
              src="/document_ingestion_rag.svg"
              alt="Camunda BPMN 2.0 Document Ingestion and RAG Workflow"
              class="max-w-full h-auto mx-auto rounded shadow-xs"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the visual pipeline flow diagram with step-by-step Camunda task definitions.
   *
   * WHAT: Produces structured swimlane cards depicting Ingestion, Parallel AI, and Persistence tiers.
   * WHY: Allows visual verification of task execution dependencies, retries, and delegates.
   *
   * @returns RawHtml pipeline markup.
   */
  private renderPipelineView(): RawHtml {
    return html`
      <div class="space-y-6">
        <!-- Overview Banner -->
        <div class="bg-gradient-to-r from-teal-50 to-blue-50 dark:from-[#1b2f38] dark:to-[#172b3c] border border-teal-200 dark:border-teal-900/60 rounded-xl p-4 flex items-start gap-3">
          ${icon('Info', { className: 'w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5' })}
          <div class="space-y-1">
            <h3 class="font-bold text-sm text-gray-900 dark:text-white">
              Executable Camunda BPMN 2.0 Process Definition
            </h3>
            <p class="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              This process models the end-to-end ingestion lifecycle executed by Spring AI in the Personal Library.
              It features <strong>4 swimlanes</strong> (UI Client, Spring AI Orchestrator, Ollama AI Models, Qdrant Vector Store),
              <strong>parallel asynchronous branches</strong> for dual-model summarization, a <strong>human review loop</strong> for BibTeX validation,
              and <strong>atomic persistence</strong> into MongoDB and Keycloak.
            </p>
          </div>
        </div>

        <!-- Swimlane 1: Ingestion & Validation -->
        <div class="bg-white dark:bg-[#1c232b] rounded-xl border border-gray-200 dark:border-[#2e3b4a] p-4 space-y-3 shadow-xs">
          <div class="flex items-center justify-between border-b border-gray-100 dark:border-[#2e3b4a] pb-2">
            <span class="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-mono font-bold text-[11px]">1</span>
              Phase 1: Ingestion, Extraction & Human Validation Loop
            </span>
            <span class="text-[10px] text-gray-500 font-mono">Lane: Client &amp; Spring AI Orchestration</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div class="p-3 bg-gray-50 dark:bg-[#232c37] rounded-lg border border-gray-200 dark:border-[#2e3b4a] space-y-1.5">
              <div class="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                ${icon('Upload', { className: 'w-3.5 h-3.5' })}
                <span>Start Event</span>
              </div>
              <div class="font-medium text-gray-900 dark:text-white">Document Upload Received</div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                Form inputs: fileName, fileFormat, fileSize, uploaderUsername.
              </p>
            </div>

            <div class="p-3 bg-gray-50 dark:bg-[#232c37] rounded-lg border border-gray-200 dark:border-[#2e3b4a] space-y-1.5">
              <div class="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                ${icon('FileText', { className: 'w-3.5 h-3.5' })}
                <span>Service Task</span>
              </div>
              <div class="font-medium text-gray-900 dark:text-white">Extract Text &amp; BibTeX</div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 leading-tight font-mono text-[10px]">
                Delegate: ${'${bibTeXExtractionDelegate}'}
              </p>
              <span class="inline-block px-1.5 py-0.5 text-[9px] bg-slate-200 dark:bg-[#2f3d4e] rounded text-slate-700 dark:text-slate-300">
                Apache Tika + Spring AI
              </span>
            </div>

            <div class="p-3 bg-gray-50 dark:bg-[#232c37] rounded-lg border border-gray-200 dark:border-[#2e3b4a] space-y-1.5">
              <div class="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
                ${icon('ShieldCheck', { className: 'w-3.5 h-3.5' })}
                <span>Service Task</span>
              </div>
              <div class="font-medium text-gray-900 dark:text-white">Validate BibTeX Quality</div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 leading-tight font-mono text-[10px]">
                Delegate: ${'${bibTeXValidationDelegate}'}
              </p>
              <span class="inline-block px-1.5 py-0.5 text-[9px] bg-amber-100 dark:bg-amber-950/60 rounded text-amber-800 dark:text-amber-300">
                Mandatory Fields &amp; BNF Check
              </span>
            </div>

            <div class="p-3 bg-gray-50 dark:bg-[#232c37] rounded-lg border border-gray-200 dark:border-[#2e3b4a] space-y-1.5">
              <div class="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold">
                ${icon('User', { className: 'w-3.5 h-3.5' })}
                <span>User Task (Fallback)</span>
              </div>
              <div class="font-medium text-gray-900 dark:text-white">Review &amp; Correct Metadata</div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                Candidate Groups: LIBRARY_ADMIN, RESEARCHER. Loops back upon revision.
              </p>
            </div>
          </div>
        </div>

        <!-- Swimlane 2: Parallel Dual AI & Vectorization -->
        <div class="bg-white dark:bg-[#1c232b] rounded-xl border border-gray-200 dark:border-[#2e3b4a] p-4 space-y-3 shadow-xs">
          <div class="flex items-center justify-between border-b border-gray-100 dark:border-[#2e3b4a] pb-2">
            <span class="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-mono font-bold text-[11px]">2</span>
              Phase 2: Parallel Dual AI Summarization &amp; Qdrant Vector Chunking
            </span>
            <span class="text-[10px] text-gray-500 font-mono">Parallel Fork $\rightarrow$ Join Pattern (AND-Gateway)</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <!-- Branch 1: Llama -->
            <div class="p-3.5 bg-gradient-to-b from-blue-50/50 to-white dark:from-[#212d3a] dark:to-[#1c232b] rounded-lg border border-blue-200 dark:border-blue-900/60 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  ${icon('Sparkles', { className: 'w-3.5 h-3.5' })}
                  Branch A: Llama 3.3 (70B)
                </span>
                <span class="text-[9px] font-mono bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-1 rounded">
                  asyncBefore=true
                </span>
              </div>
              <div class="font-semibold text-gray-900 dark:text-white text-xs">
                Analytical Deep Dive
              </div>
              <p class="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                Executes structural critique, research methodologies, and quantitative data synthesis.
              </p>
              <div class="pt-2 border-t border-blue-100 dark:border-blue-900/40 text-[10px] font-mono text-gray-500 dark:text-gray-400">
                Delegate: ${'${llamaSummarizationDelegate}'}
                <br />Retries: R3/PT10S
              </div>
            </div>

            <!-- Branch 2: Mistral -->
            <div class="p-3.5 bg-gradient-to-b from-emerald-50/50 to-white dark:from-[#1e2e2a] dark:to-[#1c232b] rounded-lg border border-emerald-200 dark:border-emerald-900/60 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  ${icon('Sparkles', { className: 'w-3.5 h-3.5' })}
                  Branch B: Mistral Large
                </span>
                <span class="text-[9px] font-mono bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1 rounded">
                  asyncBefore=true
                </span>
              </div>
              <div class="font-semibold text-gray-900 dark:text-white text-xs">
                Executive Synthesis
              </div>
              <p class="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                Synthesizes high-level takeaways, conclusions, and operational recommendations.
              </p>
              <div class="pt-2 border-t border-emerald-100 dark:border-emerald-900/40 text-[10px] font-mono text-gray-500 dark:text-gray-400">
                Delegate: ${'${mistralSummarizationDelegate}'}
                <br />Retries: R3/PT10S
              </div>
            </div>

            <!-- Branch 3: Qdrant -->
            <div class="p-3.5 bg-gradient-to-b from-purple-50/50 to-white dark:from-[#292233] dark:to-[#1c232b] rounded-lg border border-purple-200 dark:border-purple-900/60 space-y-2">
              <div class="flex items-center justify-between">
                <span class="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                  ${icon('Database', { className: 'w-3.5 h-3.5' })}
                  Branch C: Qdrant RAG
                </span>
                <span class="text-[9px] font-mono bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-1 rounded">
                  asyncBefore=true
                </span>
              </div>
              <div class="font-semibold text-gray-900 dark:text-white text-xs">
                Paragraph Chunking &amp; Embedding
              </div>
              <p class="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                Splits text on ~350 char boundaries, generates dense vectors, and upserts to collection.
              </p>
              <div class="pt-2 border-t border-purple-100 dark:border-purple-900/40 text-[10px] font-mono text-gray-500 dark:text-gray-400">
                Delegate: ${'${vectorRagDelegate}'}
                <br />Collection: library_embeddings
              </div>
            </div>
          </div>
        </div>

        <!-- Swimlane 3: Persistence & Governance -->
        <div class="bg-white dark:bg-[#1c232b] rounded-xl border border-gray-200 dark:border-[#2e3b4a] p-4 space-y-3 shadow-xs">
          <div class="flex items-center justify-between border-b border-gray-100 dark:border-[#2e3b4a] pb-2">
            <span class="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-2">
              <span class="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-mono font-bold text-[11px]">3</span>
              Phase 3: Persistence, Keycloak Audit &amp; Reactive Broadcast
            </span>
            <span class="text-[10px] text-gray-500 font-mono">Synchronous Finalization &amp; Client Notification</span>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div class="p-3 bg-gray-50 dark:bg-[#232c37] rounded-lg border border-gray-200 dark:border-[#2e3b4a] space-y-1.5">
              <div class="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 font-semibold">
                ${icon('Database', { className: 'w-3.5 h-3.5' })}
                <span>Service Task</span>
              </div>
              <div class="font-medium text-gray-900 dark:text-white">MongoDB Record Persistence</div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                Writes DocumentEntity with both SummaryRecords and chunks atomically.
              </p>
              <span class="text-[10px] font-mono text-gray-400">Delegate: ${'${documentPersistenceDelegate}'}</span>
            </div>

            <div class="p-3 bg-gray-50 dark:bg-[#232c37] rounded-lg border border-gray-200 dark:border-[#2e3b4a] space-y-1.5">
              <div class="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
                ${icon('ShieldCheck', { className: 'w-3.5 h-3.5' })}
                <span>Service Task</span>
              </div>
              <div class="font-medium text-gray-900 dark:text-white">Keycloak Security Audit Log</div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                Records event into realm audit trail with user identity and JWT claims.
              </p>
              <span class="text-[10px] font-mono text-gray-400">Delegate: ${'${securityAuditDelegate}'}</span>
            </div>

            <div class="p-3 bg-gray-50 dark:bg-[#232c37] rounded-lg border border-gray-200 dark:border-[#2e3b4a] space-y-1.5">
              <div class="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                ${icon('Send', { className: 'w-3.5 h-3.5' })}
                <span>Send Task &amp; End Event</span>
              </div>
              <div class="font-medium text-gray-900 dark:text-white">Broadcast Event &amp; Complete</div>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">
                Dispatches event to SAP UI5 EventBus, refreshing catalog and displaying Toast.
              </p>
              <span class="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">End: Document Indexed &amp; RAG-Ready</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders the raw syntax-highlighted BPMN 2.0 XML code viewer.
   *
   * WHAT: Displays XML content within a monospace scrolling container with copy action.
   * WHY: Enables engineers to copy, inspect, or pipe the exact XML into Camunda Modeler.
   *
   * @returns RawHtml XML viewer markup.
   */
  private renderXmlView(): RawHtml {
    if (this.loading) {
      return html`
        <div class="flex flex-col items-center justify-center h-64 gap-3 text-gray-500">
          <div class="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading Camunda BPMN 2.0 XML definition...</span>
        </div>
      `;
    }

    return html`
      <div class="space-y-3">
        <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Source: <code>src/main/resources/bpmn/document_ingestion_rag.bpmn</code></span>
          <span>BPMN 2.0 Specification · Camunda 7 &amp; Camunda 8 Compatible</span>
        </div>
        <pre class="p-4 bg-[#1e293b] text-[#e2e8f0] rounded-xl font-mono text-xs overflow-x-auto leading-relaxed border border-slate-700 shadow-inner select-all max-h-[580px]"><code>${this.xmlContent}</code></pre>
      </div>
    `;
  }

  /**
   * Renders architecture and deployment instructions for Camunda 7 (Spring Boot) and Camunda 8 (Zeebe).
   *
   * WHAT: Generates code examples demonstrating how to bind Java delegates or Zeebe workers to the BPMN process.
   * WHY: Provides practical implementation guidance for production enterprise integration.
   *
   * @returns RawHtml deployment guide.
   */
  private renderDeploymentView(): RawHtml {
    return html`
      <div class="space-y-6 text-xs text-gray-800 dark:text-gray-200">
        <!-- Camunda 7 -->
        <div class="bg-white dark:bg-[#1c232b] rounded-xl border border-gray-200 dark:border-[#2e3b4a] p-5 space-y-3 shadow-xs">
          <div class="flex items-center justify-between border-b border-gray-100 dark:border-[#2e3b4a] pb-2">
            <h4 class="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              ${icon('Cpu', { className: 'w-4 h-4 text-[#0070f2]' })}
              Camunda 7 Spring Boot Starter Integration
            </h4>
            <span class="px-2 py-0.5 text-[10px] font-mono bg-blue-50 dark:bg-blue-950/60 text-[#0070f2] rounded border border-blue-200 dark:border-blue-900/60">
              camunda-bpm-spring-boot-starter:7.21.0
            </span>
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-300">
            For Camunda 7 in Spring Boot, place <code>document_ingestion_rag.bpmn</code> in <code>src/main/resources/bpmn/</code>.
            Each service task resolves its <code>camunda:delegateExpression</code> automatically through Spring Bean dependency injection:
          </p>
          <pre class="p-3 bg-[#1e293b] text-[#e2e8f0] rounded-lg font-mono text-[11px] overflow-x-auto border border-slate-700"><code>@Component("llamaSummarizationDelegate")
public class LlamaSummarizationDelegate implements JavaDelegate {
    @Autowired
    private AiSummarizationService summarizationService;

    @Override
    public void execute(DelegateExecution execution) throws Exception {
        String documentTitle = (String) execution.getVariable("documentTitle");
        String fullContent = (String) execution.getVariable("fullContent");

        SummaryRecord summary = summarizationService.generateLlamaSummary(documentTitle, fullContent);
        execution.setVariable("llamaSummary", summary);
    }
}</code></pre>
        </div>

        <!-- Camunda 8 -->
        <div class="bg-white dark:bg-[#1c232b] rounded-xl border border-gray-200 dark:border-[#2e3b4a] p-5 space-y-3 shadow-xs">
          <div class="flex items-center justify-between border-b border-gray-100 dark:border-[#2e3b4a] pb-2">
            <h4 class="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              ${icon('Server', { className: 'w-4 h-4 text-emerald-600' })}
              Camunda 8 (Zeebe Cloud / Self-Managed) Integration
            </h4>
            <span class="px-2 py-0.5 text-[10px] font-mono bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded border border-emerald-200 dark:border-emerald-900/60">
              spring-zeebe-starter:8.5.0
            </span>
          </div>
          <p class="text-xs text-gray-600 dark:text-gray-300">
            For Camunda 8 Zeebe, deploy the BPMN file via zbctl or Web Modeler. Implement non-blocking async job workers using the <code>@JobWorker</code> annotation:
          </p>
          <pre class="p-3 bg-[#1e293b] text-[#e2e8f0] rounded-lg font-mono text-[11px] overflow-x-auto border border-slate-700"><code>@Component
public class QdrantVectorizationWorker {
    @Autowired
    private VectorRagService vectorService;

    @JobWorker(type = "qdrant-vectorization-task", autoComplete = true)
    public Map&lt;String, Object&gt; handleVectorization(final ActivatedJob job) {
        String documentId = (String) job.getVariablesAsMap().get("documentId");
        String content = (String) job.getVariablesAsMap().get("fullContent");

        int chunksIndexed = vectorService.chunkAndIndex(documentId, content);
        return Map.of("chunksCount", chunksIndexed, "vectorStatus", "INDEXED");
    }
}</code></pre>
        </div>
      </div>
    `;
  }

  /**
   * Binds click and tab switching events using declarative component delegated event listeners.
   *
   * WHAT: Attaches handlers to tab switching buttons and copy XML button via `this.on()`.
   * WHY: Delegated event binding ensures handlers remain attached across template renders without manual DOM queries.
   */
  protected bind(): void {
    this.on('[data-action="tab-mindmap"]', 'click', () => {
      this.switchTab('mindmap');
    });

    this.on('[data-action="tab-diagram"]', 'click', () => {
      this.switchTab('diagram');
    });

    this.on('[data-action="tab-pipeline"]', 'click', () => {
      this.switchTab('pipeline');
    });

    this.on('[data-action="tab-xml"]', 'click', () => {
      this.switchTab('xml');
    });

    this.on('[data-action="tab-deployment"]', 'click', () => {
      this.switchTab('deployment');
    });

    this.on('[data-action="copy-bpmn"]', 'click', () => {
      this.copyXml();
    });
  }
}
