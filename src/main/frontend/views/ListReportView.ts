/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
import { cx, html, raw, RawHtml } from '../core/html';
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

export class ListReportView extends Component {
  /** Local UI state, the counterpart of the former `useState` in ListReport. */
  private filterBarExpanded = true;

  constructor() {
    super(undefined, 'div', 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5');
  }

  protected onMount(): void {
    this.track(
      watch(
        appStore,
        (state) => [
          state.documents,
          state.totalCount,
          state.loadingDocs,
          state.fetchError,
          state.filters,
          state.page,
          state.pageSize,
          state.sortBy,
          state.sortOrder
        ],
        () => this.requestRender(),
        shallowEqual
      )
    );
    this.track(i18nStore.subscribe(() => this.requestRender()));
  }

  // ------------------------------------------------------------------
  // Template
  // ------------------------------------------------------------------

  protected template(): RawHtml {
    return html`${this.filterBar()}${this.tableCard()}`;
  }

  private get activeFilterCount(): number {
    const filters = appStore.state.filters;
    return Object.entries(filters).filter(([key, value]) => {
      if (key === 'format') {
        return value !== 'all';
      }
      return Boolean(value && String(value).trim());
    }).length;
  }

  private get totalPages(): number {
    const { totalCount, pageSize } = appStore.state;
    return Math.max(1, Math.ceil(totalCount / pageSize));
  }

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
        class="bg-white rounded-lg shadow-sm border border-[#e2e8f0] overflow-hidden transition-all duration-200"
      >
        <div
          class="px-5 py-3 border-b border-[#edf2f7] bg-[#f8fafc] flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            ${icon('Filter', { className: 'w-4 h-4 text-[#0070f2]' })}
            <h2 class="text-sm font-semibold text-gray-800">${t.listReport.filterArea}</h2>
            ${activeCount > 0
              ? html`<span
                  class="ml-1.5 px-2 py-0.5 text-xs font-medium bg-[#0070f2] text-white rounded-full"
                  >${String(activeCount)} ${t.listReport.activeFilters}</span
                >`
              : ''}
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
            <tbody class="divide-y divide-gray-100">
              ${this.tableBody()}
            </tbody>
          </table>
        </div>

        ${this.paginationBar()}
      </div>
    `;
  }

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

  private documentRow(doc: DocumentRecord): string {
    return html`
      <tr
        data-guid="${doc.guid}"
        class="hover:bg-[#f1f5f9]/70 cursor-pointer transition-colors group"
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

        <td class="py-3 px-3 text-gray-500 whitespace-nowrap">${doc.bibtex.edition || '—'}</td>

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

  protected afterRender(): void {
    this.on('[data-action="toggle-filter-bar"]', 'click', () => {
      this.filterBarExpanded = !this.filterBarExpanded;
      this.render();
    });

    // Free-text filters refetch on every keystroke, exactly as the React
    // implementation did by keeping `filters` in the effect dependency array.
    this.onAll('ui5-input[data-filter]', 'input', (event) => {
      const input = event.currentTarget as Input;
      const key = input.dataset.filter as TextFilterKey;
      appStore.patchFilter(key, input.value);
    });

    this.onAll('ui5-input[data-filter]', 'keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Enter') {
        appStore.applyFilters();
      }
    });

    this.on('ui5-select[data-filter="format"]', 'change', (event) => {
      const select = event.currentTarget as Select;
      appStore.patchFilter('format', select.selectedOption?.value ?? 'all');
    });

    this.onAll('[data-action="reset-filters"]', 'click', () => appStore.resetFilters());
    this.on('[data-action="apply-filters"]', 'click', () => appStore.applyFilters());
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
