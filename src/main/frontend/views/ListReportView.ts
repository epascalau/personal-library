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
  /** Passed to `ui5-table-header-cell` — proportional when omitted. */
  width?: string;
  minWidth?: string;
  alignEnd?: boolean;
  /**
   * `ui5-table` drops lower-importance columns into the popin area first when
   * the viewport narrows, which is what replaces the old `overflow-x-auto`
   * horizontal scrollbar.
   */
  importance?: number;
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
   * Initializes the List Report view component with SAP Fiori container classes.
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
   * Renders the SAP Fiori Filter Bar card with toggle button, input fields, and action buttons.
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
   * Renders the primary SAP Fiori data table container and card shell.
   *
   * WHAT: Assembles table header bar, responsive table structure, and bottom pagination bar.
   * WHY: Encapsulates the entire List Report data grid within a unified SAP Fiori card container.
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

        <div data-scroll-key="list-table">
          <ui5-table
            class="plib-table"
            overflow-mode="Popin"
            row-action-count="1"
            ${appStore.state.loadingDocs ? raw('loading') : ''}
            loading-delay="0"
          >
            ${this.tableHead()}
            ${this.noDataSlot()}
            ${this.tableBody()}
          </ui5-table>
        </div>

        ${this.paginationBar()}
      </div>
    `;
  }

  /**
   * Generates the table header row with sortable column headers.
   *
   * WHAT: Maps column definitions across file name, title, author, edition, format, size and date into `<ui5-table-header-cell>` elements.
   * WHY: Centralizes table header definitions and labels following SAP Fiori List Report layout standards.
   *
   * @returns RawHtml representing the `<ui5-table-header-row>`.
   */
  private tableHead(): RawHtml {
    const t = i18nStore.state.t;
    const columns: SortableColumn[] = [
      { key: 'fileName', label: t.listReport.colFileName, minWidth: '11rem' },
      { key: 'title', label: t.listReport.colTitleDetails, minWidth: '14rem', importance: 10 },
      { key: 'author', label: t.listReport.colAuthor, minWidth: '9rem' },
      { key: 'edition', label: t.listReport.edition, minWidth: '7rem', importance: -1 },
      { key: 'format', label: t.listReport.colFormat, width: '6rem', importance: -2 },
      {
        key: 'fileSize',
        label: t.objectPage.fileSize,
        width: '7rem',
        alignEnd: true,
        importance: -3
      },
      { key: 'uploadDate', label: t.listReport.colUploadDate, width: '9rem', importance: -1 }
    ];

    return html`
      <ui5-table-header-row slot="headerRow" sticky>
        ${raw(columns.map((column) => this.sortableHeader(column)).join(''))}
      </ui5-table-header-row>
    `;
  }

  /**
   * Renders a sortable column header element with click targets and visual indicators.
   *
   * WHAT: Generates a `<ui5-table-header-cell>` carrying the data-sort key, the column's
   * responsive width/importance hints and the native sort indicator.
   * WHY: Allows users to click column headers to toggle ascending/descending order across all query attributes.
   *
   * @param column Column definition object.
   * @returns Header HTML string.
   */
  private sortableHeader(column: SortableColumn): string {
    const { sortBy, sortOrder } = appStore.state;
    // `sortIndicator` is a built-in TableHeaderCell property, so the arrow
    // glyphs the view used to draw by hand are now rendered (and announced to
    // screen readers) by the component itself.
    const indicator =
      sortBy === column.key ? (sortOrder === 'asc' ? 'Ascending' : 'Descending') : 'None';

    return html`
      <ui5-table-header-cell
        data-sort="${column.key}"
        class="plib-table-header-cell"
        horizontal-align="${column.alignEnd ? 'End' : 'Start'}"
        sort-indicator="${indicator}"
        importance="${String(column.importance ?? 0)}"
        ${column.width ? raw(`width="${column.width}"`) : ''}
        ${column.minWidth ? raw(`min-width="${column.minWidth}"`) : ''}
        popin-text="${column.label}"
      >
        ${column.label}
      </ui5-table-header-cell>
    `.toString();
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

    // `ui5-table` renders its own busy overlay from the `loading` property and
    // its own placeholder from the `noData` slot, so the view no longer emits
    // spinner or empty rows with hand-counted `colspan` values.
    if (loadingDocs || fetchError || documents.length === 0) {
      return raw('');
    }

    return raw(documents.map((doc) => this.documentRow(doc)).join(''));
  }

  /**
   * Fills the table's `noData` slot for the error and empty-result states.
   *
   * WHAT: Returns the backend-error panel, the "no matches" guidance, or nothing
   * while rows are present or loading.
   * WHY: `ui5-table` owns the placeholder area, so these states no longer need
   * to masquerade as table rows spanning a hardcoded column count — which also
   * means adding or reordering columns can no longer break them.
   */
  private noDataSlot(): RawHtml {
    const { loadingDocs, fetchError, documents } = appStore.state;
    if (loadingDocs) {
      return raw('');
    }
    if (fetchError) {
      return this.errorRow(fetchError);
    }
    if (documents.length === 0) {
      return this.emptyRow();
    }
    return raw('');
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
      <div slot="noData" class="plib-table-nodata">
        <ui5-illustrated-message name="UnableToLoad" design="Scene">
          <ui5-title slot="title" level="H4">Backend Communication Issue</ui5-title>
          <ui5-text slot="subtitle" class="plib-cell-mono">${message}</ui5-text>
          <ui5-button class="plib-button" design="Emphasized" icon="refresh" data-action="retry"
            >Retry Connection</ui5-button
          >
          <ui5-button class="plib-button" icon="it-host" data-action="switch-offline"
            >Switch to Offline Engine</ui5-button
          >
          <ui5-button class="plib-button" data-action="open-backend-settings"
            >Backend Settings</ui5-button
          >
        </ui5-illustrated-message>
      </div>
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
    const hasFilters = this.activeFilterCount > 0;
    return html`
      <div slot="noData" class="plib-table-nodata">
        <ui5-illustrated-message
          name="${hasFilters ? 'NoFilterResults' : 'NoEntries'}"
          design="Scene"
        >
          <ui5-title slot="title" level="H4">
            ${hasFilters
              ? 'No documents match the current filter criteria'
              : 'The library is empty'}
          </ui5-title>
          <ui5-text slot="subtitle">
            ${hasFilters
              ? 'Try adjusting your filters or upload a new document to the library.'
              : 'Upload a document to start building the library.'}
          </ui5-text>
          ${hasFilters
            ? html`<ui5-button class="plib-button" data-action="reset-filters"
                >Reset All Filters</ui5-button
              >`
            : html`<ui5-button
                class="plib-button"
                design="Emphasized"
                icon="upload"
                data-action="open-upload"
                >${i18nStore.state.t.listReport.uploadButton}</ui5-button
              >`}
        </ui5-illustrated-message>
      </div>
    `;
  }

  /**
   * Renders a single data row displaying document metadata and action buttons.
   *
   * WHAT: Generates a `<ui5-table-row>` formatted with document badges, bibliographic title, author,
   * edition, format extension, byte size, ingestion date, and delete action button.
   * WHY: Implements the interactive List Report floorplan row with full clickability for Object Page navigation.
   *
   * @param doc The document record to render.
   * @returns Table row HTML string.
   */
  private documentRow(doc: DocumentRecord): string {
    const t = i18nStore.state.t;
    return html`
      <ui5-table-row row-key="${doc.guid}" data-guid="${doc.guid}" interactive>
        <ui5-table-row-action
          slot="actions"
          icon="delete"
          text="${t.common.delete}"
          data-action="delete"
        ></ui5-table-row-action>

        <ui5-table-cell class="plib-table-cell">
          <div class="plib-cell plib-cell-inline">
            ${formatBadge(doc.format)}
            <span class="plib-cell-filename">${doc.fileName}</span>
          </div>
        </ui5-table-cell>

        <ui5-table-cell class="plib-table-cell">
          <div class="plib-cell">
            <span class="plib-cell-title">${doc.bibtex.title || 'Untitled Document'}</span>
            <span class="plib-cell-meta">@${doc.bibtex.entryType}: ${doc.bibtex.bibKey}</span>
          </div>
        </ui5-table-cell>

        <ui5-table-cell class="plib-table-cell">
          <span class="plib-cell-text">${doc.bibtex.author || '—'}</span>
        </ui5-table-cell>

        <ui5-table-cell class="plib-table-cell">${renderEditionYear(doc.bibtex.edition, doc.bibtex.year)}</ui5-table-cell>

        <ui5-table-cell class="plib-table-cell">
          <span class="plib-cell-format">${doc.format}</span>
        </ui5-table-cell>

        <ui5-table-cell class="plib-table-cell">
          <span class="plib-cell-size">${doc.fileSizeFormatted}</span>
        </ui5-table-cell>

        <ui5-table-cell class="plib-table-cell">
          <span class="plib-cell-date">${formatUploadDate(doc.uploadDate)}</span>
        </ui5-table-cell>
      </ui5-table-row>
    `.toString();
  }

  /**
   * Renders the SAP Fiori pagination bar with row count indicators and navigation controls.
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
    // Rendered both in the toolbar and in the empty-state placeholder.
    this.onAll('[data-action="open-upload"]', 'click', () => appStore.openUpload());

    this.on('[data-action="retry"]', 'click', () => void appStore.fetchDocuments());
    this.on('[data-action="switch-offline"]', 'click', () => backendStore.switchPreset('mock'));
    this.on('[data-action="open-backend-settings"]', 'click', () =>
      appStore.openBackendSettings()
    );

    this.onAll('ui5-table-header-cell[data-sort]', 'click', (event) => {
      const cell = event.currentTarget as HTMLElement;
      appStore.setSort(cell.dataset.sort as string);
    });

    // `row-click` fires once per interactive row, including keyboard
    // activation, which the old `<tr>` click handler never supported. It also
    // already excludes the row-action area, so the separate stopPropagation
    // guard the actions cell needed is gone.
    this.on('ui5-table.plib-table', 'row-click', (event) => {
      const { row } = (event as CustomEvent<{ row: HTMLElement }>).detail;
      const guid = row?.getAttribute('row-key');
      if (guid) {
        void appStore.loadSingleDocument(guid);
      }
    });

    this.on('ui5-table.plib-table', 'row-action-click', (event) => {
      const { row } = (event as CustomEvent<{ row: HTMLElement; action: HTMLElement }>).detail;
      const guid = row?.getAttribute('row-key');
      const doc = appStore.state.documents.find((item) => item.guid === guid);
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
