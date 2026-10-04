/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Vanilla + UI5 replacement for `components/ListReport.tsx`.
 *
 * The SAP Fiori "List Report" floorplan is preserved 1:1: filter bar with
 * collapse + active-filter counter, sortable eight-column table, the three
 * error-recovery actions and the pagination bar. Native `<input>`/`<select>`
 * controls are replaced by `ui5-input` / `ui5-select`, and the hand-rolled
 * spinner by `ui5-busy-indicator`; all Tailwind layout classes are unchanged.
 */

import { Component } from '../core/component';
import { cx, html, raw, RawHtml, toMarkup } from '../core/html';
import { shallowEqual, watch } from '../core/store';
import { appStore } from '../stores/appStore';
import { backendStore } from '../stores/backendStore';
import { i18nStore } from '../stores/i18nStore';
import { icon } from '../ui5/icons';
import type { DocumentRecord, FilterState } from '../types';
import type Input from '@ui5/webcomponents/dist/Input.js';
import type Select from '@ui5/webcomponents/dist/Select.js';

/** The five free-text filters, rendered by a single loop. */
type TextFilterKey = Extract<
  keyof FilterState,
  'fileName' | 'title' | 'author' | 'edition' | 'content'
>;

interface TextFilterSpec {
  key: TextFilterKey;
  label: string;
  placeholder: string;
}

interface SortableColumn {
  key: string;
  label: string;
  /** Tailwind classes for the `<th>`, matching the original per-column padding. */
  thClass: string;
  alignEnd?: boolean;
}

const FORMAT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'pdf', label: 'PDF Document (.pdf)' },
  { value: 'docx', label: 'Word Document (.docx, .doc)' },
  { value: 'md', label: 'Markdown (.md)' },
  { value: 'txt', label: 'Plain Text (.txt)' },
  { value: 'xlsx', label: 'Spreadsheet (.xlsx, .xls)' },
  { value: 'pptx', label: 'Presentation (.pptx, .ppt)' }
];

const PAGE_SIZES = [5, 10, 20, 50];

/** Mirrors `getFormatIcon` from the React component. */
const formatBadge = (format: string): RawHtml => {
  const f = format.toLowerCase();
  const base = 'px-1.5 py-0.5 text-[10px] font-bold rounded border';
  if (f === 'pdf') {
    return html`<span class="${base} bg-red-100 text-red-700 border-red-200">PDF</span>`;
  }
  if (f === 'docx' || f === 'doc') {
    return html`<span class="${base} bg-blue-100 text-blue-700 border-blue-200">DOC</span>`;
  }
  if (f === 'md' || f === 'txt') {
    return html`<span class="${base} bg-gray-100 text-gray-700 border-gray-300">MD</span>`;
  }
  if (f === 'xls' || f === 'xlsx') {
    return html`<span class="${base} bg-green-100 text-green-700 border-green-200">XLS</span>`;
  }
  if (f === 'ppt' || f === 'pptx') {
    return html`<span class="${base} bg-orange-100 text-orange-700 border-orange-200">PPT</span>`;
  }
  return html`<span class="${base} bg-slate-100 text-slate-700 border-slate-200"
    >${format.toUpperCase()}</span
  >`;
};

const formatUploadDate = (value: string): string =>
  new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

/** Formats edition and year for the List Report table column. */
const renderEditionYear = (edition?: string, year?: string): RawHtml | string => {
  const e = (edition || '').trim();
  const y = (year || '').trim();
  if (e && y && e !== y) {
    return html`<div class="flex items-center gap-1.5 whitespace-nowrap">
      <span class="font-medium text-gray-800 dark:text-gray-200">${e}</span>
      <span class="text-gray-500 dark:text-gray-400 font-mono text-[11px]">(${y})</span>
    </div>`;
  }
  if (e) {
    return html`<span class="font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">${e}</span>`;
  }
  if (y) {
    return html`<span class="text-gray-600 dark:text-gray-300 font-mono text-xs whitespace-nowrap">${y}</span>`;
  }
  return '—';
};

export class ListReportView extends Component {
  /** Local UI state, the counterpart of the former `useState` in ListReport. */
  private filterBarExpanded = true;
  private filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingFilters: Partial<Record<TextFilterKey, string>> = {};

  /**
   * Initializes the List Report view component with SAP Horizon container classes.
   *
   * WHAT: Calls `super(...)` with max-width responsive grid layout classes.
   * WHY: Provides responsive horizontal margins and spacing matching the SAP Fiori design system.
   */
  constructor() {
    super(undefined, 'div', 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5');
  }

  /**
   * Subscribes the view to relevant slices of application state and internationalization.
   *
   * WHAT:
   * 1. Watches table query state (documents, counts, loading, page, sort) to trigger surgical table updates.
   * 2. Watches filter state to synchronize UI inputs and update the active filter badge.
   * 3. Subscribes to i18n store to re-render localized column labels and text upon language change.
   *
   * WHY:
   * Fine-grained slicing via `watch()` decouples table re-rendering from filter typing. Typing in a search
   * input updates `appStore.filters` without touching the table until the debounce interval expires,
   * avoiding wasted renders and preserving input focus.
   */
  protected onMount(): void {
    this.track(
      watch(
        appStore,
        (state) => [
          state.documents,
          state.totalCount,
          state.loadingDocs,
          state.fetchError,
          state.page,
          state.pageSize,
          state.sortBy,
          state.sortOrder
        ],
        () => this.updateTableCard(),
        shallowEqual
      )
    );
    this.track(
      watch(
        appStore,
        (state) => [state.filters],
        () => {
          this.syncInputsFromState();
          this.updateActiveFilterBadge();
        },
        shallowEqual
      )
    );
    this.track(i18nStore.subscribe(() => this.render()));
  }

  /**
   * Cleans up pending debounce timers during view destruction.
   *
   * WHAT: Cancels `filterDebounceTimer` if active.
   * WHY: Prevents scheduled filter evaluations from triggering network fetches after navigation away.
   */
  protected onDestroy(): void {
    if (this.filterDebounceTimer) {
      clearTimeout(this.filterDebounceTimer);
      this.filterDebounceTimer = null;
    }
  }

  // ------------------------------------------------------------------
  // Template
  // ------------------------------------------------------------------

  /**
   * Generates the root markup containing dedicated filter and table card containers.
   *
   * WHAT: Returns markup with `[data-ref="filter-container"]` and `[data-ref="table-container"]`.
   * WHY: Segregating the filter bar and table card into separate containers allows surgical,
   * non-destructive DOM updates where the table can refresh without touching the filter inputs.
   */
  protected template(): RawHtml {
    return html`
      <div data-ref="filter-container">
        ${this.filterBar()}
      </div>
      <div data-ref="table-container">
        ${this.tableCard()}
      </div>
    `;
  }

  /**
   * Computes the number of non-empty search filters currently applied.
   *
   * WHAT: Counts all filter attributes having non-whitespace values (ignoring format 'all').
   * WHY: Drives the numeric badge count in the Filter Bar header, informing the user how many filters are active.
   */
  private get activeFilterCount(): number {
    const filters = appStore.state.filters;
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'format') {
        return value !== 'all';
      }
      return Boolean(value && String(value).trim());
    }).length;
  }

  /**
   * Calculates total pagination pages based on total document count and page size.
   *
   * WHAT: Returns `Math.max(1, Math.ceil(totalCount / pageSize))`.
   * WHY: Guarantees at least 1 page exists to prevent empty pagination controls.
   */
  private get totalPages(): number {
    const { totalCount, pageSize } = appStore.state;
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }

  /**
   * Renders the SAP Horizon Filter Bar card with toggle button, input fields, and action buttons.
   *
   * WHAT: Generates collapsible card with inputs for file name, title, author, edition, format, and content keywords.
   * WHY: Follows the SAP Fiori List Report pattern: researchers can filter by single or combined fields,
   * collapse the bar to gain vertical screen space, and trigger manual or debounced search.
   */
  private filterBar(): RawHtml {
    const t = i18nStore.state.t;
    const { filters } = appStore.state;
    const activeCount = this.activeFilterCount;

    const textFilters: TextFilterSpec[] = [
      {
        key: 'fileName',
        label: t.listReport.fileName,
        placeholder: t.listReport.fileNamePlaceholder
      },
      {
        key: 'title',
        label: t.listReport.documentTitle,
        placeholder: t.listReport.titlePlaceholder
      },
      { key: 'author', label: t.listReport.author, placeholder: t.listReport.authorPlaceholder },
      { key: 'edition', label: t.listReport.edition, placeholder: t.listReport.editionPlaceholder }
    ];

    return html`
      <div
        class="bg-white dark:bg-[#1c232b] rounded-lg shadow-sm border border-[#e2e8f0] dark:border-[#2e3b4a] overflow-hidden transition-all duration-200"
      >
        <div
          class="px-5 py-3 border-b border-[#edf2f7] dark:border-[#2e3b4a] bg-[#f8fafc] dark:bg-[#232c37] flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            ${icon('Filter', { className: 'w-4 h-4 text-[#0070f2]' })}
            <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200">${t.listReport.filterArea}</h2>
            <span data-ref="active-filter-badge">
              ${activeCount > 0
                ? html`<span
                    class="ml-1.5 px-2 py-0.5 text-xs font-medium bg-[#0070f2] text-white rounded-full"
                    >${String(activeCount)} ${t.listReport.activeFilters}</span
                  >`
                : ''}
            </span>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              data-action="toggle-filter-bar"
              aria-expanded="${this.filterBarExpanded ? 'true' : 'false'}"
              class="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 px-2.5 py-1 rounded hover:bg-gray-200/60 transition-colors cursor-pointer"
            >
              ${this.filterBarExpanded ? t.listReport.hideFilters : t.listReport.showFilters}
              ${icon(this.filterBarExpanded ? 'ChevronUp' : 'ChevronDown', {
                className: 'w-3.5 h-3.5'
              })}
            </button>
          </div>
        </div>

        ${this.filterBarExpanded
          ? html`
              <div class="p-5 space-y-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  ${raw(
                    textFilters
                      .map((spec) => this.textFilterField(spec, filters[spec.key]))
                      .join('')
                  )}

                  <div>
                    <label class="block text-xs font-semibold text-gray-600 mb-1"
                      >${t.listReport.format}</label
                    >
                    <ui5-select
                      class="plib-input w-full text-xs"
                      data-filter="format"
                      data-focus-key="filter-format"
                      accessible-name="${t.listReport.format}"
                    >
                      <ui5-option
                        value="all"
                        ${filters.format === 'all' ? raw('selected') : ''}
                        >${t.listReport.allFormats} (*.*)</ui5-option
                      >
                      ${raw(
                        FORMAT_OPTIONS.map(
                          (option) =>
                            toMarkupOption(option.value, option.label, filters.format === option.value)
                        ).join('')
                      )}
                    </ui5-select>
                  </div>

                  <div>
                    <label
                      class="block text-xs font-semibold text-gray-600 mb-1 flex items-center justify-between"
                    >
                      <span class="flex items-center gap-1 text-[#0070f2]">
                        ${icon('Sparkles', { className: 'w-3.5 h-3.5' })}
                        ${t.listReport.contentKeywords}
                      </span>
                      <span class="text-[10px] text-gray-400">Qdrant Vector DB</span>
                    </label>
                    <ui5-input
                      class="plib-input plib-input--semantic w-full text-xs"
                      data-filter="content"
                      data-focus-key="filter-content"
                      icon-name-placement="start"
                      placeholder="${t.listReport.contentPlaceholder}"
                      value="${filters.content}"
                      accessible-name="${t.listReport.contentKeywords}"
                    >
                      ${icon('Search', { className: 'w-3.5 h-3.5 text-[#0070f2]' })}
                    </ui5-input>
                  </div>
                </div>

                <div class="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <ui5-button
                    class="plib-button"
                    design="Transparent"
                    data-action="reset-filters"
                    icon="undo"
                    >${t.common.reset}</ui5-button
                  >
                  <ui5-button class="plib-button" design="Emphasized" data-action="apply-filters" icon="search"
                    >${t.common.go}</ui5-button
                  >
                </div>
              </div>
            `
          : ''}
      </div>
    `;
  }

  /**
   * Renders a labeled text filter input with persistent focus tracking.
   *
   * WHAT: Generates a `<ui5-input>` element configured with placeholder, accessible label, and focus tracking key.
   * WHY: Binds input changes to reactive filter slices while preserving caret positions across re-renders.
   *
   * @param spec Text filter configuration.
   * @param value Current filter string value.
   * @returns Rendered input markup string.
   */
  private textFilterField(spec: TextFilterSpec, value: string): string {
    return html`
      <div>
        <label class="block text-xs font-semibold text-gray-600 mb-1">${spec.label}</label>
        <ui5-input
          class="plib-input w-full text-xs"
          data-filter="${spec.key}"
          data-focus-key="filter-${spec.key}"
          placeholder="${spec.placeholder}"
          value="${value}"
          accessible-name="${spec.label}"
        ></ui5-input>
      </div>
    `.toString();
  }

  /**
   * Renders the primary SAP Horizon data table container and card shell.
   *
   * WHAT: Assembles table header bar, responsive table structure, and bottom pagination bar.
   * WHY: Encapsulates the entire List Report data grid within a unified SAP Horizon card container.
   *
   * @returns RawHtml markup for the complete table card.
   */
  private tableCard(): RawHtml {
    const t = i18nStore.state.t;
    const { totalCount } = appStore.state;

    return html`
      <div class="bg-white rounded-lg shadow-sm border border-[#e2e8f0] overflow-hidden">
        <div
          class="px-5 py-3.5 border-b border-[#edf2f7] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div class="flex items-center gap-3">
            <h3 class="font-semibold text-sm text-gray-900 flex items-center gap-2">
              ${icon('BookOpen', { className: 'w-4 h-4 text-[#0070f2]' })}
              ${t.listReport.catalogTitle}
              <span class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-mono"
                >${String(totalCount)}</span
              >
            </h3>
            <span class="text-xs text-gray-400 hidden sm:inline">|</span>
            <span class="text-xs text-gray-500 hidden sm:inline"
              >${t.listReport.inspectTooltip}</span
            >
          </div>

          <div class="flex items-center gap-2">
            <ui5-button
              class="plib-button"
              design="Emphasized"
              icon="upload"
              data-action="open-upload"
              >${t.listReport.uploadButton}</ui5-button
            >
          </div>
        </div>

        <div class="overflow-x-auto" data-scroll-key="list-table">
          <table class="w-full text-left border-collapse text-xs">
            <thead>
              ${this.tableHead()}
            </thead>
            <tbody class="bg-white dark:bg-[#1c232b]">
              ${this.tableBody()}
            </tbody>
          </table>
        </div>

        ${this.paginationBar()}
      </div>
    `;
  }

  /**
   * Generates the table header row with sortable column headers.
   *
   * WHAT: Maps Column definitions across file name, title, author, edition, format, size, and date into `<th>` elements.
   * WHY: Centralizes table header definitions and labels following SAP Fiori List Report layout standards.
   *
   * @returns RawHtml representing the table header `<tr>`.
   */
  private tableHead(): RawHtml {
    const t = i18nStore.state.t;
    const columns: SortableColumn[] = [
      { key: 'fileName', label: t.listReport.colFileName, thClass: 'py-3 px-4' },
      { key: 'title', label: t.listReport.colTitleDetails, thClass: 'py-3 px-4' },
      { key: 'author', label: t.listReport.colAuthor, thClass: 'py-3 px-4' },
      { key: 'edition', label: t.listReport.edition, thClass: 'py-3 px-3' },
      { key: 'format', label: t.listReport.colFormat, thClass: 'py-3 px-3' },
      {
        key: 'fileSize',
        label: t.objectPage.fileSize,
        thClass: 'py-3 px-3 text-right',
        alignEnd: true
      },
      { key: 'uploadDate', label: t.listReport.colUploadDate, thClass: 'py-3 px-4' }
    ];

    return html`
      <tr
        class="bg-[#f8fafc] border-b border-gray-200 text-gray-700 uppercase tracking-wider text-[11px] select-none font-semibold"
      >
        ${raw(columns.map((column) => this.sortableHeader(column)).join(''))}
        <th class="py-3 px-4 text-center w-20">${t.listReport.colActions}</th>
      </tr>
    `;
  }

  /**
   * Renders a sortable column header element with click targets and visual indicators.
   *
   * WHAT: Generates a `<th>` tag with data-sort attribute and sort chevron icon.
   * WHY: Allows users to click column headers to toggle ascending/descending order across all query attributes.
   *
   * @param column Column definition object.
   * @returns Header HTML string.
   */
  private sortableHeader(column: SortableColumn): string {
    return html`
      <th
        data-sort="${column.key}"
        class="${cx(column.thClass, 'cursor-pointer hover:bg-gray-100 transition group')}"
      >
        <span class="${cx('flex items-center', column.alignEnd && 'justify-end')}">
          ${column.label}${this.sortIndicator(column.key)}
        </span>
      </th>
    `.toString();
  }

  /**
   * Renders sort order glyph indicators (up/down/unsorted) next to header titles.
   *
   * WHAT: Renders ArrowUp, ArrowDown, or dual ArrowUpDown depending on active sort column and direction.
   * WHY: Provides clear visual cues to users regarding current sort column and direction.
   *
   * @param columnKey Target column key identifier.
   * @returns RawHtml sort icon glyph.
   */
  private sortIndicator(columnKey: string): RawHtml {
    const { sortBy, sortOrder } = appStore.state;
    if (sortBy !== columnKey) {
      return icon('ArrowUpDown', {
        className: 'w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 inline ml-1'
      });
    }
    return icon(sortOrder === 'asc' ? 'ArrowUp' : 'ArrowDown', {
      className: 'w-3.5 h-3.5 text-[#0070f2] inline ml-1 font-bold'
    });
  }

  /**
   * Evaluates loading, error, empty, and data states to render table rows.
   *
   * WHAT: Inspects store states (loadingDocs, fetchError, documents) and branches to loading spinner, errorRow, emptyRow, or documentRow list.
   * WHY: Encapsulates all asynchronous UI states in the table body while preserving column alignment.
   *
   * @returns RawHtml representing table body content.
   */
  private tableBody(): RawHtml {
    const { loadingDocs, fetchError, documents } = appStore.state;

    if (loadingDocs) {
      return html`
        <tr>
          <td colspan="8" class="py-12 text-center text-gray-500">
            <div class="flex flex-col items-center justify-center gap-2">
              <ui5-busy-indicator class="plib-busy" active size="M" delay="0"></ui5-busy-indicator>
              <span class="text-xs">Loading documents from MongoDB &amp; Qdrant...</span>
            </div>
          </td>
        </tr>
      `;
    }

    if (fetchError) {
      return this.errorRow(fetchError);
    }

    if (documents.length === 0) {
      return this.emptyRow();
    }

    return raw(documents.map((doc) => this.documentRow(doc)).join(''));
  }

  /**
   * Renders the communication error state banner with recovery actions.
   *
   * WHAT: Displays an alert card with error details, retry button, offline engine switch, and settings shortcut.
   * WHY: Provides actionable self-healing options when remote backend or network connections encounter failures.
   *
   * @param message Error description string.
   * @returns RawHtml error row markup.
   */
  private errorRow(message: string): RawHtml {
    return html`
      <tr>
        <td colspan="8" class="py-12 px-4 text-center">
          <div
            class="max-w-md mx-auto p-6 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col items-center gap-3"
          >
            <div
              class="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700"
            >
              ${icon('AlertTriangle', { className: 'w-5 h-5' })}
            </div>
            <div class="text-center">
              <h4 class="font-bold text-gray-900 text-sm">Backend Communication Issue</h4>
              <p class="text-xs text-amber-800 mt-1 font-mono">${message}</p>
              <p class="text-[11px] text-gray-500 mt-2">
                The backend service did not complete the request in time or may still be
                initializing.
              </p>
            </div>
            <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
              <ui5-button
                class="plib-button"
                design="Emphasized"
                icon="refresh"
                data-action="retry"
                >Retry Connection</ui5-button
              >
              <ui5-button class="plib-button" icon="it-host" data-action="switch-offline"
                >Switch to Offline Engine</ui5-button
              >
              <ui5-button class="plib-button" data-action="open-backend-settings"
                >Backend Settings</ui5-button
              >
            </div>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Renders empty state guidance when no documents match active filter queries.
   *
   * WHAT: Displays an empty document graphic with reset filter action shortcut.
   * WHY: Informs users that search criteria yielded 0 results and provides a one-click reset action.
   *
   * @returns RawHtml empty state row markup.
   */
  private emptyRow(): RawHtml {
    return html`
      <tr>
        <td colspan="8" class="py-12 text-center text-gray-500">
          <div class="flex flex-col items-center justify-center gap-2">
            ${icon('FileText', { className: 'w-8 h-8 text-gray-300' })}
            <span class="font-medium text-gray-700"
              >No documents match the current filter criteria</span
            >
            <p class="text-xs text-gray-400">
              Try adjusting your filters or upload a new document to the library.
            </p>
            <button
              type="button"
              data-action="reset-filters"
              class="mt-2 text-xs text-[#0070f2] font-semibold hover:underline cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        </td>
      </tr>
    `;
  }

  /**
   * Renders a single data row displaying document metadata and action buttons.
   *
   * WHAT: Generates a table row `<tr>` formatted with document badges, bibliographic title, author,
   * edition, format extension, byte size, ingestion date, and delete action button.
   * WHY: Implements the interactive List Report floorplan row with full clickability for Object Page navigation.
   *
   * @param doc The document record to render.
   * @returns Table row HTML string.
   */
  private documentRow(doc: DocumentRecord): string {
    return html`
      <tr
        data-guid="${doc.guid}"
        class="hover:bg-[#f1f5f9]/70 dark:hover:bg-[#26313e] cursor-pointer transition-colors group"
      >
        <td class="py-3 px-4">
          <div class="flex items-center gap-2 font-mono text-[11px] text-gray-800">
            ${formatBadge(doc.format)}
            <span
              class="truncate max-w-[180px] font-medium group-hover:text-[#0070f2] transition-colors"
              >${doc.fileName}</span
            >
          </div>
        </td>

        <td class="py-3 px-4">
          <div
            class="font-semibold text-gray-900 group-hover:text-[#0070f2] transition-colors line-clamp-1 max-w-[240px]"
          >
            ${doc.bibtex.title || 'Untitled Document'}
          </div>
          <div class="text-[11px] text-gray-400 font-mono">
            @${doc.bibtex.entryType}: ${doc.bibtex.bibKey}
          </div>
        </td>

        <td class="py-3 px-4 text-gray-600 line-clamp-1 max-w-[160px]">
          ${doc.bibtex.author || '—'}
        </td>

        <td class="py-3 px-3 text-gray-600 dark:text-gray-300">
          ${renderEditionYear(doc.bibtex.edition, doc.bibtex.year)}
        </td>

        <td class="py-3 px-3 text-gray-600 uppercase font-mono text-[11px]">${doc.format}</td>

        <td class="py-3 px-3 text-right text-gray-600 font-mono whitespace-nowrap">
          ${doc.fileSizeFormatted}
        </td>

        <td class="py-3 px-4 text-gray-500 whitespace-nowrap text-[11px]">
          ${formatUploadDate(doc.uploadDate)}
        </td>

        <td class="py-3 px-4 text-center" data-cell="actions">
          <ui5-button
            class="plib-button plib-button--icon"
            design="Transparent"
            icon="delete"
            data-action="delete"
            tooltip="Delete Document"
            accessible-name="Delete Document"
          ></ui5-button>
        </td>
      </tr>
    `.toString();
  }

  /**
   * Renders the SAP Horizon pagination bar with row count indicators and navigation controls.
   *
   * WHAT: Generates page status labels ("Showing X to Y of Z"), page size selector (`ui5-select`),
   * and directional paging buttons (first, previous, next, last).
   * WHY: Enables intuitive navigation across large datasets while maintaining server-side slice bounds.
   *
   * @returns RawHtml pagination bar markup.
   */
  private paginationBar(): RawHtml {
    const t = i18nStore.state.t;
    const { page, pageSize, totalCount, documents } = appStore.state;
    const totalPages = this.totalPages;
    const firstRow = documents.length > 0 ? (page - 1) * pageSize + 1 : 0;
    const lastRow = Math.min(page * pageSize, totalCount);

    const navButton = (
      action: string,
      iconKey: Parameters<typeof icon>[0],
      title: string,
      disabled: boolean
    ): string =>
      html`<ui5-button
        class="plib-button plib-button--icon"
        design="Transparent"
        data-action="${action}"
        ${disabled ? raw('disabled') : ''}
        tooltip="${title}"
        accessible-name="${title}"
        >${icon(iconKey, { className: 'w-4 h-4' })}</ui5-button
      >`.toString();

    return html`
      <div
        class="px-5 py-3 border-t border-[#edf2f7] bg-[#f8fafc] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600"
      >
        <div class="flex items-center gap-2">
          <span>${t.listReport.rowsPerPage}</span>
          <ui5-select class="plib-input plib-input--compact" data-action="page-size" accessible-name="${t.listReport.rowsPerPage}">
            ${raw(
              PAGE_SIZES.map((size) =>
                toMarkupOption(String(size), String(size), size === pageSize)
              ).join('')
            )}
          </ui5-select>
          <span class="text-gray-400 ml-2">
            ${String(firstRow)} - ${String(lastRow)} ${t.common.of} ${String(totalCount)}
          </span>
        </div>

        <div class="flex items-center gap-1">
          ${raw(navButton('page-first', 'ChevronsLeft', 'First Page', page <= 1))}
          ${raw(navButton('page-prev', 'ChevronLeft', 'Previous Page', page <= 1))}
          <span class="px-3 py-1 font-semibold text-gray-800 bg-white border border-gray-200 rounded">
            ${t.common.page} ${String(page)} ${t.common.of} ${String(totalPages)}
          </span>
          ${raw(navButton('page-next', 'ChevronRight', 'Next Page', page >= totalPages))}
          ${raw(navButton('page-last', 'ChevronsRight', 'Last Page', page >= totalPages))}
        </div>
      </div>
    `;
  }

  // ------------------------------------------------------------------
  // Behaviour
  // ------------------------------------------------------------------

  /**
   * Post-render lifecycle callback that wires event listeners for filter inputs and table interactions.
   *
   * WHAT: Invokes `bindFilterEvents()` and `bindTableEvents()`.
   * WHY: Required after initial template render to attach UI5 Web Component and native DOM listeners.
   */
  protected afterRender(): void {
    this.bindFilterEvents();
    this.bindTableEvents();
  }

  /**
   * Surgically re-renders the Filter Bar container without modifying the table.
   *
   * WHAT: Replaces `[data-ref="filter-container"]` innerHTML and re-binds filter event listeners.
   * WHY: Invoked when the filter bar is expanded or collapsed. Keeping this isolated avoids
   * refreshing or re-scrolling the table underneath.
   */
  private updateFilterBar(): void {
    const container = this.$<HTMLElement>('[data-ref="filter-container"]');
    if (!container) return;
    container.innerHTML = toMarkup(this.filterBar());
    this.bindFilterEvents();
  }

  /**
   * Surgically re-renders the Table Card container while preserving table scroll positions.
   *
   * WHAT:
   * 1. Records horizontal and vertical scroll offsets from `[data-scroll-key="list-table"]`.
   * 2. Replaces `[data-ref="table-container"]` innerHTML with freshly computed markup.
   * 3. Re-binds table event handlers.
   * 4. Restores scroll offsets to the new container.
   *
   * WHY:
   * Crucial architectural optimization: By updating only the table container, the filter bar's
   * DOM nodes remain completely untouched. This guarantees that typing in a search filter never
   * drops keyboard focus, resets the text cursor, or cancels IME composition during catalog refreshes.
   */
  private updateTableCard(): void {
    const container = this.$<HTMLElement>('[data-ref="table-container"]');
    if (!container) return;
    const scrollContainer = this.$<HTMLElement>('[data-scroll-key="list-table"]');
    const scrollLeft = scrollContainer?.scrollLeft ?? 0;
    const scrollTop = scrollContainer?.scrollTop ?? 0;

    container.innerHTML = toMarkup(this.tableCard());
    this.bindTableEvents();

    const newScrollContainer = this.$<HTMLElement>('[data-scroll-key="list-table"]');
    if (newScrollContainer) {
      newScrollContainer.scrollLeft = scrollLeft;
      newScrollContainer.scrollTop = scrollTop;
    }
  }

  /**
   * Binds event listeners for filter inputs, dropdowns, and search triggers.
   *
   * WHAT:
   * 1. Toggle button: Expands/collapses filter bar.
   * 2. Text inputs: Implements 3-character threshold + 350ms debounce.
   * 3. Keydown Enter: Immediately triggers search without waiting for debounce.
   * 4. Format select: Updates format filter immediately.
   * 5. Reset button: Clears all inputs and resets store filters.
   * 6. Go button: Dispatches current filter criteria immediately.
   *
   * WHY:
   * The 3-character threshold prevents sending noisy queries to MongoDB and Qdrant for single
   * letters, while the 350ms debounce ensures smooth typing without network lag.
   */
  private bindFilterEvents(): void {
    this.on('[data-action="toggle-filter-bar"]', 'click', () => {
      this.filterBarExpanded = !this.filterBarExpanded;
      this.updateFilterBar();
    });

    // 3-character threshold with debounce:
    // User typing fewer than 3 characters does NOT start search.
    // Typing >= 3 characters (or clearing to 0) debounces 350ms before searching.
    // The filter input is NEVER re-rendered, keeping focus active until the user changes it!
    this.onAll('ui5-input[data-filter]', 'input', (event) => {
      const input = event.currentTarget as Input;
      const key = input.dataset.filter as TextFilterKey;
      if (!key) return;
      const val = input.value;
      const trimmed = val.trim();

      this.pendingFilters[key] = val;

      if (this.filterDebounceTimer) {
        clearTimeout(this.filterDebounceTimer);
        this.filterDebounceTimer = null;
      }

      // If user typed 1 or 2 characters: keep value in input, but do NOT trigger search
      if (trimmed.length > 0 && trimmed.length < 3) {
        return;
      }

      // If user cleared the input (0 chars) or entered at least 3 characters:
      // Debounce by 350ms before executing the search
      this.filterDebounceTimer = setTimeout(() => {
        this.filterDebounceTimer = null;
        this.applyDebouncedFilters();
      }, 350);
    });

    this.onAll('ui5-input[data-filter]', 'keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Enter') {
        if (this.filterDebounceTimer) {
          clearTimeout(this.filterDebounceTimer);
          this.filterDebounceTimer = null;
        }
        this.applyDirectFilters();
      }
    });

    this.on('ui5-select[data-filter="format"]', 'change', (event) => {
      const select = event.currentTarget as Select;
      appStore.patchFilter('format', select.selectedOption?.value ?? 'all');
    });

    this.onAll('[data-action="reset-filters"]', 'click', () => {
      if (this.filterDebounceTimer) {
        clearTimeout(this.filterDebounceTimer);
        this.filterDebounceTimer = null;
      }
      this.pendingFilters = {};
      this.$$<Input>('ui5-input[data-filter]').forEach((input) => {
        input.value = '';
      });
      const formatSelect = this.$<Select>('ui5-select[data-filter="format"]');
      if (formatSelect) {
        formatSelect.value = 'all';
      }
      appStore.resetFilters();
    });

    this.on('[data-action="apply-filters"]', 'click', () => {
      if (this.filterDebounceTimer) {
        clearTimeout(this.filterDebounceTimer);
        this.filterDebounceTimer = null;
      }
      this.applyDirectFilters();
    });
  }

  /**
   * Evaluates input fields and commits debounced filters to the store.
   *
   * WHAT: Compares each input value against store filters and invokes `appStore.setFilters` if changed.
   * WHY: Only dispatches a store update if an actual change occurred, preventing unnecessary network queries.
   */
  private applyDebouncedFilters(): void {
    const nextFilters: FilterState = { ...appStore.state.filters };
    let changed = false;

    this.$$<Input>('ui5-input[data-filter]').forEach((input) => {
      const key = input.dataset.filter as TextFilterKey;
      if (!key) return;
      const val = input.value;
      const trimmed = val.trim();
      const currentStored = nextFilters[key] || '';

      // Only apply if length >= 3 or length === 0
      const targetVal = trimmed.length >= 3 ? val : (trimmed.length === 0 ? '' : '');
      if (targetVal !== currentStored) {
        nextFilters[key] = targetVal;
        changed = true;
      }
    });

    if (changed) {
      appStore.setFilters(nextFilters);
    }
  }

  /**
   * Immediately commits all input values to the filter store.
   *
   * WHAT: Reads all input and select values directly and calls `appStore.setFilters`.
   * WHY: Invoked on Enter keypress or "Go" button click to bypass debounce delays.
   */
  private applyDirectFilters(): void {
    const nextFilters: FilterState = { ...appStore.state.filters };
    this.$$<Input>('ui5-input[data-filter]').forEach((input) => {
      const key = input.dataset.filter as TextFilterKey;
      if (!key) return;
      const val = input.value;
      const trimmed = val.trim();
      nextFilters[key] = trimmed.length >= 3 ? val : (trimmed.length === 0 ? '' : val);
    });
    const formatSelect = this.$<Select>('ui5-select[data-filter="format"]');
    if (formatSelect) {
      nextFilters.format = formatSelect.selectedOption?.value ?? 'all';
    }
    appStore.setFilters(nextFilters);
  }

  /**
   * Synchronizes input elements with store filter state when updated externally.
   *
   * WHAT: Checks if the input is currently focused before setting `input.value`.
   * WHY: If the user is actively typing in a field, overwriting `input.value` would reset their cursor.
   * The focus check ensures that only unfocused inputs are updated when external filters change (e.g. on Reset).
   */
  private syncInputsFromState(): void {
    const active = document.activeElement;
    const { filters } = appStore.state;
    this.$$<Input>('ui5-input[data-filter]').forEach((input) => {
      const key = input.dataset.filter as TextFilterKey;
      if (!key) return;
      const isFocused = input === active || input.contains(active);
      if (!isFocused && input.value !== (filters[key] || '')) {
        input.value = filters[key] || '';
      }
    });
    const formatSelect = this.$<Select>('ui5-select[data-filter="format"]');
    if (formatSelect && formatSelect.value !== (filters.format || 'all')) {
      formatSelect.value = filters.format || 'all';
    }
  }

  /**
   * Surgically updates the active filter badge in the Filter Bar header.
   *
   * WHAT: Replaces the innerHTML of `[data-ref="active-filter-badge"]`.
   * WHY: Provides immediate visual feedback for active filter count without re-rendering the filter inputs.
   */
  private updateActiveFilterBadge(): void {
    const badgeContainer = this.$('[data-ref="active-filter-badge"]');
    if (!badgeContainer) return;
    const count = this.activeFilterCount;
    badgeContainer.innerHTML = count > 0
      ? `<span class="ml-1.5 px-2 py-0.5 text-xs font-medium bg-[#0070f2] text-white rounded-full">${count} ${i18nStore.state.t.listReport.activeFilters}</span>`
      : '';
  }

  /**
   * Binds interaction listeners for table actions, pagination, sorting, and drilldown.
   *
   * WHAT: Wires row clicks for navigation, sort headers, upload modal, delete dialog, and pagination buttons.
   * WHY: Centralizes table interactivity and uses `event.stopPropagation()` on action cells to prevent
   * opening the Object Page when clicking the delete icon.
   */
  private bindTableEvents(): void {
    this.on('[data-action="open-upload"]', 'click', () => appStore.openUpload());

    this.on('[data-action="retry"]', 'click', () => void appStore.fetchDocuments());
    this.on('[data-action="switch-offline"]', 'click', () => backendStore.switchPreset('mock'));
    this.on('[data-action="open-backend-settings"]', 'click', () =>
      appStore.openBackendSettings()
    );

    this.onAll('th[data-sort]', 'click', (event) => {
      const th = event.currentTarget as HTMLElement;
      appStore.setSort(th.dataset.sort as string);
    });

    this.onAll('tbody tr[data-guid]', 'click', (event) => {
      const row = event.currentTarget as HTMLElement;
      void appStore.loadSingleDocument(row.dataset.guid as string);
    });

    // Keeps the row click from navigating when the delete action is used.
    this.onAll('td[data-cell="actions"]', 'click', (event) => event.stopPropagation());

    this.onAll('ui5-button[data-action="delete"]', 'click', (event) => {
      const row = (event.currentTarget as HTMLElement).closest<HTMLElement>('tr[data-guid]');
      const doc = appStore.state.documents.find((item) => item.guid === row?.dataset.guid);
      if (doc) {
        appStore.requestDelete(doc);
      }
    });

    this.on('ui5-select[data-action="page-size"]', 'change', (event) => {
      const select = event.currentTarget as Select;
      appStore.setPageSize(Number(select.selectedOption?.value ?? 10));
    });

    const totalPages = this.totalPages;
    this.on('[data-action="page-first"]', 'click', () => appStore.setPage(1));
    this.on('[data-action="page-prev"]', 'click', () =>
      appStore.setPage(Math.max(1, appStore.state.page - 1))
    );
    this.on('[data-action="page-next"]', 'click', () =>
      appStore.setPage(Math.min(totalPages, appStore.state.page + 1))
    );
    this.on('[data-action="page-last"]', 'click', () => appStore.setPage(totalPages));
  }
}

/** `ui5-option` markup helper — `selected` is a boolean attribute. */
const toMarkupOption = (value: string, label: string, selected: boolean): string =>
  html`<ui5-option value="${value}" ${selected ? raw('selected') : ''}>${label}</ui5-option>`.toString();
