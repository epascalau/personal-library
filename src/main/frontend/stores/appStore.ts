/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Vanilla replacement for the orchestration state that used to live in
 * `App.tsx`. Every `useState` from the React implementation has a 1:1
 * counterpart here, and the `useEffect`/`useCallback` refetch behaviour is
 * reproduced by `scheduleFetch()`.
 */

import { Store } from '../core/store';
import { backendBus, requestBackend } from '../services/backend';
import { DocumentRecord, FilterState, UserProfile } from '../types';

export type AppView = 'list' | 'object';
export type SummaryModel = 'llama' | 'mistral';
export type ToastType = 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

export interface AppState {
  // Navigation
  currentView: AppView;
  selectedDocGuid: string | null;
  activeDocument: DocumentRecord | null;

  // Authentication (Keycloak / OIDC)
  user: UserProfile;
  authModalOpen: boolean;

  // Documents catalog & List Report
  documents: DocumentRecord[];
  totalCount: number;
  loadingDocs: boolean;
  fetchError: string | null;

  // Filtering
  filters: FilterState;

  // Sorting & pagination
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';

  // Modals & action states
  uploadModalOpen: boolean;
  versionModalOpen: boolean;
  deleteConfirmDoc: DocumentRecord | null;
  deleting: boolean;
  openApiModalOpen: boolean;
  bpmnModalOpen: boolean;
  backendSettingsOpen: boolean;
  summarizingModel: SummaryModel | null;
  summarizingModels: Record<SummaryModel, boolean>;

  // Toast notification
  toast: Toast | null;
}

export const EMPTY_FILTERS: FilterState = {
  fileName: '',
  title: '',
  author: '',
  edition: '',
  format: 'all',
  content: ''
};

const DEFAULT_USER: UserProfile = {
  id: 'usr-keycloak-101',
  username: 'emilian.pascalau',
  email: 'emilian.pascalau@gmail.com',
  name: 'Emilian Pascalau',
  roles: ['LIBRARY_ADMIN', 'CHIEF_RESEARCHER'],
  realm: 'personal-library-realm',
  authenticatedAt: new Date().toISOString()
};

const TOAST_DURATION_MS = 3500;

const readInitialUser = (): UserProfile => {
  const saved = localStorage.getItem('personal_library_user');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return DEFAULT_USER;
};

class AppStore extends Store<AppState> {
  private fetchToken = 0;

  private fetchScheduled = false;

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  private toastSeq = 0;

  /**
   * Initializes the application store with default navigation, catalog, and session state.
   *
   * WHAT: Sets the initial state with empty documents, default pagination, and stored or default user credentials.
   * WHY: Providing complete default state avoids null-pointer checks throughout the UI floorplans
   * and ensures immediate deterministic first render.
   */
  constructor() {
    super({
      currentView: 'list',
      selectedDocGuid: null,
      activeDocument: null,

      user: readInitialUser(),
      authModalOpen: false,

      documents: [],
      totalCount: 0,
      loadingDocs: true,
      fetchError: null,

      filters: { ...EMPTY_FILTERS },

      page: 1,
      pageSize: 10,
      sortBy: 'uploadDate',
      sortOrder: 'desc',

      uploadModalOpen: false,
      versionModalOpen: false,
      deleteConfirmDoc: null,
      deleting: false,
      openApiModalOpen: false,
      bpmnModalOpen: false,
      backendSettingsOpen: false,
      summarizingModel: null,
      summarizingModels: {
        llama: false,
        mistral: false
      },

      toast: null
    });
  }

  /**
   * Activates application store event listeners and triggers initial data load.
   *
   * WHAT: Subscribes to `backend:adapter:changed` on the event bus and initiates the first document fetch.
   * WHY: Decouples backend driver switching (e.g. toggling from in-memory mock to Spring Boot :8080)
   * from the view layer; whenever the adapter swaps, `scheduleFetch()` automatically queries the new backend.
   */
  start(): void {
    backendBus.subscribe('backend:adapter:changed', () => this.scheduleFetch());
    void this.fetchDocuments();
  }

  // ------------------------------------------------------------------
  // Toast
  // ------------------------------------------------------------------

  /**
   * Displays a temporary notification toast message to the user.
   *
   * WHAT: Clears any active timer, increments the sequence ID, updates the `toast` state slice,
   * and schedules automatic dismissal after 3.5 seconds.
   * WHY:
   * 1. Monotonic sequence counter (`toastSeq`): Guarantees that subsequent toasts with identical text
   *    are recognized as distinct DOM updates by child components and screen readers.
   * 2. Single-timer reuse: Prevents stale timeouts from prematurely dismissing newly opened toasts.
   *
   * @param message Text to display in the toast banner.
   * @param type Semantic visual style ('success' or 'error').
   */
  showToast(message: string, type: ToastType = 'success'): void {
    if (this.toastTimer !== null) {
      clearTimeout(this.toastTimer);
    }
    this.toastSeq += 1;
    this.setState({ toast: { id: this.toastSeq, message, type } });
    this.toastTimer = setTimeout(() => {
      this.toastTimer = null;
      this.setState({ toast: null });
    }, TOAST_DURATION_MS);
  }

  // ------------------------------------------------------------------
  // Document list
  // ------------------------------------------------------------------

  /**
   * Coalesces multiple rapid filter or pagination changes into a single network query per microtask.
   *
   * WHAT: Sets a boolean flag and schedules `fetchDocuments()` in `queueMicrotask`.
   * WHY: If the user changes multiple filter inputs, modifies sort direction, or when multiple
   * stores update in the same event loop tick, microtask coalescing ensures that only one HTTP
   * request is dispatched across the network, eliminating redundant roundtrips.
   */
  private scheduleFetch(): void {
    if (this.fetchScheduled) {
      return;
    }
    this.fetchScheduled = true;
    queueMicrotask(() => {
      this.fetchScheduled = false;
      void this.fetchDocuments();
    });
  }

  /**
   * Queries documents from the active backend adapter according to current filters, sort, and pagination.
   *
   * WHAT: Dispatches `getDocuments` via `requestBackend`, tracks loading indicators, and updates `documents`.
   * WHY: Uses a monotonically incremented `fetchToken` concurrency guard. If the user rapidly modifies
   * search queries while a previous HTTP request is still in flight, responses from older, slower requests
   * are safely discarded if `token !== this.fetchToken`, preventing race conditions and stale UI data.
   */
  async fetchDocuments(): Promise<void> {
    const token = (this.fetchToken += 1);
    const { page, pageSize, sortBy, sortOrder, filters } = this.state;

    this.setState({ loadingDocs: true, fetchError: null });

    try {
      const data = await requestBackend('getDocuments', {
        page,
        pageSize,
        sortBy,
        sortOrder,
        filters
      });
      if (token !== this.fetchToken) {
        return;
      }
      this.setState({
        documents: data.items || [],
        totalCount: data.totalCount || 0,
        fetchError: null,
        loadingDocs: false
      });
    } catch (err: any) {
      if (token !== this.fetchToken) {
        return;
      }
      const msg = err?.message || 'Error fetching document list';
      this.setState({ fetchError: msg, loadingDocs: false });
      this.showToast(msg, 'error');
    }
  }

  // ------------------------------------------------------------------
  // Navigation
  // ------------------------------------------------------------------

  /**
   * Loads complete details for a single document and navigates to the Object Page floorplan.
   *
   * WHAT: Calls `requestBackend('getDocument', { guid })`, sets `activeDocument`, and switches `currentView: 'object'`.
   * WHY: The List Report query only fetches metadata needed for table rendering. Drilling down
   * requires full document details (including raw content, chunks for RAG, and analytical summaries).
   *
   * @param guid Unique GUID identifier of the target document.
   */
  async loadSingleDocument(guid: string): Promise<void> {
    try {
      const doc = await requestBackend('getDocument', { guid });
      this.setState({
        activeDocument: doc,
        selectedDocGuid: guid,
        currentView: 'object'
      });
    } catch (err: any) {
      this.showToast(err?.message, 'error');
    }
  }

  /**
   * Navigates back to the root List Report without triggering a background catalog refetch.
   *
   * WHAT: Resets `currentView: 'list'` and clears `activeDocument`.
   * WHY: Used for instant breadcrumb navigation when the catalog data has not been modified.
   */
  goHome(): void {
    this.setState({ currentView: 'list', activeDocument: null });
  }

  /**
   * Returns from the Object Page to the List Report and refetches the catalog.
   *
   * WHAT: Switches view to 'list', clears active document, and triggers `fetchDocuments()`.
   * WHY: If the user regenerated AI summaries, modified BibTeX metadata, or updated versions
   * while inside the Object Page, returning to the list must immediately display the refreshed data.
   */
  backToList(): void {
    this.setState({ currentView: 'list', activeDocument: null });
    void this.fetchDocuments();
  }

  // ------------------------------------------------------------------
  // Filtering, sorting, pagination
  // ------------------------------------------------------------------

  /**
   * Replaces the filter state, resets pagination to page 1, and schedules a query.
   *
   * WHAT: Updates `filters`, sets `page: 1`, and queues `scheduleFetch()`.
   * WHY: Applying new search criteria invalidates existing page offsets (e.g. being on page 5
   * when a new search only returns 2 pages of results). Resetting to page 1 prevents empty-page bugs.
   *
   * @param filters The new filter state object.
   */
  setFilters(filters: FilterState): void {
    this.setState({ filters, page: 1 });
    this.scheduleFetch();
  }

  /**
   * Updates an individual filter criterion.
   *
   * WHAT: Shallow-merges the given key-value pair into `state.filters`.
   * WHY: Allows modular input handlers (title input, format dropdown, author search) to update
   * without needing to reconstruct the full filter object.
   *
   * @param key The filter attribute to update.
   * @param value The new value for the attribute.
   */
  patchFilter<K extends keyof FilterState>(key: K, value: FilterState[K]): void {
    this.setFilters({ ...this.state.filters, [key]: value });
  }

  /**
   * Triggers an immediate re-query using the current filter values.
   *
   * WHAT: Resets page to 1 and schedules a fetch.
   * WHY: Invoked by explicit "Go" or "Search" action buttons in the Filter Bar.
   */
  applyFilters(): void {
    this.setState({ page: 1 });
    this.scheduleFetch();
  }

  /**
   * Clears all filter criteria to empty defaults and schedules a query.
   *
   * WHAT: Replaces `filters` with `EMPTY_FILTERS`, sets `page: 1`, and schedules a fetch.
   * WHY: Provides a one-click reset matching SAP Horizon Filter Bar UX guidelines.
   */
  resetFilters(): void {
    this.setState({ filters: { ...EMPTY_FILTERS }, page: 1 });
    this.scheduleFetch();
  }

  /**
   * Updates table sorting column and order.
   *
   * WHAT: If the same column is clicked, toggles between 'asc' and 'desc'. Otherwise, switches
   * to the new column with 'asc' direction and resets page to 1.
   * WHY: Follows standard table sorting conventions and resets page to 1 so the top sorted records appear.
   *
   * @param columnKey Field key to sort by (e.g. 'title', 'author', 'uploadDate').
   */
  setSort(columnKey: string): void {
    if (this.state.sortBy === columnKey) {
      this.setState({
        sortOrder: this.state.sortOrder === 'asc' ? 'desc' : 'asc',
        page: 1
      });
    } else {
      this.setState({ sortBy: columnKey, sortOrder: 'asc', page: 1 });
    }
    this.scheduleFetch();
  }

  /**
   * Sets the active pagination page index.
   *
   * WHAT: Updates `page` and schedules a document query.
   * WHY: Enables pagination controls to fetch the appropriate offset page.
   *
   * @param page 1-based page index.
   */
  setPage(page: number): void {
    this.setState({ page });
    this.scheduleFetch();
  }

  /**
   * Modifies the page size (items per page).
   *
   * WHAT: Updates `pageSize`, resets `page: 1`, and schedules a document query.
   * WHY: Changing items per page changes total page count; resetting to page 1 prevents out-of-bounds offsets.
   *
   * @param pageSize Number of documents per page (e.g. 10, 25, 50).
   */
  setPageSize(pageSize: number): void {
    this.setState({ pageSize, page: 1 });
    this.scheduleFetch();
  }

  // ------------------------------------------------------------------
  // Dialogs
  // ------------------------------------------------------------------

  /**
   * Opens the document upload dialog.
   *
   * WHAT: Sets `uploadModalOpen: true` in application state.
   * WHY: Triggers reactive visibility of the SAP Horizon document upload floorplan modal.
   */
  openUpload(): void {
    this.setState({ uploadModalOpen: true });
  }

  /**
   * Closes the document upload dialog.
   *
   * WHAT: Sets `uploadModalOpen: false` in application state.
   * WHY: Hides upload dialog and clears modal focus without affecting the document list report.
   */
  closeUpload(): void {
    this.setState({ uploadModalOpen: false });
  }

  /**
   * Opens the version overwrite confirmation modal.
   *
   * WHAT: Sets `versionModalOpen: true` in application state.
   * WHY: Displays version increment confirmation and file replacement dialogue for existing documents.
   */
  openVersionModal(): void {
    this.setState({ versionModalOpen: true });
  }

  /**
   * Closes the version overwrite confirmation modal.
   *
   * WHAT: Sets `versionModalOpen: false` in application state.
   * WHY: Cancels or concludes version update workflows and returns focus to the Object Page.
   */
  closeVersionModal(): void {
    this.setState({ versionModalOpen: false });
  }

  /**
   * Sets the document targeted for deletion and opens the confirmation dialog.
   *
   * WHAT: Assigns `deleteConfirmDoc: doc`.
   * WHY: Explicitly holding the target record ensures the confirmation dialog displays
   * the exact document title and file name being permanently removed.
   *
   * @param doc Target document record or null to cancel.
   */
  requestDelete(doc: DocumentRecord | null): void {
    this.setState({ deleteConfirmDoc: doc });
  }

  /**
   * Opens the interactive OpenAPI 3.0 specification modal.
   *
   * WHAT: Sets `openApiModalOpen: true` in application state.
   * WHY: Provides developers with quick in-app access to REST contracts and Swagger schemas.
   */
  openOpenApi(): void {
    this.setState({ openApiModalOpen: true });
  }

  /**
   * Closes the OpenAPI modal.
   *
   * WHAT: Sets `openApiModalOpen: false` in application state.
   * WHY: Closes the API contract inspection overlay and restores background page interactivity.
   */
  closeOpenApi(): void {
    this.setState({ openApiModalOpen: false });
  }

  /**
   * Opens the interactive Camunda BPMN 2.0 process model viewer modal.
   *
   * WHAT: Sets `bpmnModalOpen: true` in application state.
   * WHY: Provides process engineers and architects with direct access to the Camunda BPMN 2.0 workflow,
   * task delegates, diagram visualizer, and export download.
   */
  openBpmnModal(): void {
    this.setState({ bpmnModalOpen: true });
  }

  /**
   * Closes the Camunda BPMN modal.
   *
   * WHAT: Sets `bpmnModalOpen: false` in application state.
   * WHY: Dismisses the workflow inspection dialogue and restores user interface focus.
   */
  closeBpmnModal(): void {
    this.setState({ bpmnModalOpen: false });
  }

  /**
   * Opens the Backend Gateway / Driver runtime configuration modal.
   *
   * WHAT: Sets `backendSettingsOpen: true` in application state.
   * WHY: Allows switching between Spring Boot REST, Cloud Gateway, and Offline mock drivers on the fly.
   */
  openBackendSettings(): void {
    this.setState({ backendSettingsOpen: true });
  }

  /**
   * Closes the Backend Gateway configuration modal.
   *
   * WHAT: Sets `backendSettingsOpen: false` in application state.
   * WHY: Concludes driver adjustment without triggering full page reloads.
   */
  closeBackendSettings(): void {
    this.setState({ backendSettingsOpen: false });
  }

  /**
   * Opens the Keycloak authentication dialog.
   *
   * WHAT: Sets `authModalOpen: true` in application state.
   * WHY: Prompts user login for testing Keycloak OIDC authentication and token exchange.
   */
  openAuth(): void {
    this.setState({ authModalOpen: true });
  }

  /**
   * Closes the Keycloak authentication dialog.
   *
   * WHAT: Sets `authModalOpen: false` in application state.
   * WHY: Dismisses login modal and resumes user interaction.
   */
  closeAuth(): void {
    this.setState({ authModalOpen: false });
  }

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

  /**
   * Confirms and executes permanent deletion of the requested document.
   *
   * WHAT: Dispatches `deleteDocument` to the backend, notifies the user with a toast,
   * resets the active document if it was deleted, and refreshes the catalog table.
   * WHY: Safeguards against orphan navigation (if the user deletes a document while viewing its
   * Object Page, it seamlessly navigates back to the List Report).
   */
  async confirmDelete(): Promise<void> {
    const doc = this.state.deleteConfirmDoc;
    if (!doc) {
      return;
    }
    this.setState({ deleting: true });
    try {
      await requestBackend('deleteDocument', { guid: doc.guid });

      this.showToast(`Document "${doc.bibtex.title || doc.fileName}" deleted`);
      this.setState({ deleteConfirmDoc: null });

      if (this.state.currentView === 'object' && this.state.selectedDocGuid === doc.guid) {
        this.setState({ currentView: 'list', activeDocument: null });
      }
      void this.fetchDocuments();
    } catch (err: any) {
      this.showToast(err?.message, 'error');
    } finally {
      this.setState({ deleting: false });
    }
  }

  /**
   * Regenerates an analytical AI summary for the active document using Ollama (Llama 3.3 or Mistral Large).
   *
   * WHAT:
   * 1. Checks if the requested model is already generating, short-circuiting duplicate clicks.
   * 2. Sets model-specific loading flags in `summarizingModels`.
   * 3. Dispatches `regenerateSummary` through the backend gateway.
   * 4. Updates the active document's summary and timestamp immutably upon completion.
   * 5. Displays formatted latency duration metrics in a toast and refreshes the catalog.
   *
   * WHY:
   * Tracking model activity via `summarizingModels: Record<SummaryModel, boolean>` allows Llama and
   * Mistral to be regenerated independently or simultaneously without mutual blocking or state overwriting.
   *
   * @param model Key identifying the target LLM ('llama' or 'mistral').
   */
  async regenerateSummary(model: SummaryModel): Promise<void> {
    const activeDocument = this.state.activeDocument;
    if (!activeDocument) {
      return;
    }
    // Prevent duplicate in-flight requests for the exact same model
    if (this.state.summarizingModels[model]) {
      return;
    }

    const nextSummarizing = {
      ...this.state.summarizingModels,
      [model]: true
    };
    this.setState({
      summarizingModels: nextSummarizing,
      summarizingModel: model
    });

    try {
      const summaryRecord = await requestBackend('regenerateSummary', {
        guid: activeDocument.guid,
        modelKey: model
      });

      const current = this.state.activeDocument;
      if (current && current.guid === activeDocument.guid) {
        this.setState({
          activeDocument: {
            ...current,
            summaries: {
              ...current.summaries,
              [model]: summaryRecord
            },
            editDate: new Date().toISOString()
          }
        });
      }

      this.showToast(
        `${model === 'llama' ? 'Llama 3.3' : 'Mistral'} summary successfully regenerated in ${summaryRecord.durationFormatted}! Timestamp: ${summaryRecord.timestamp || summaryRecord.createdAt}`
      );
      void this.fetchDocuments();
    } catch (err: any) {
      this.showToast(err?.message, 'error');
    } finally {
      const updatedSummarizing = {
        ...this.state.summarizingModels,
        [model]: false
      };
      const activeRunningModel = (Object.keys(updatedSummarizing) as SummaryModel[]).find(
        (m) => updatedSummarizing[m]
      ) || null;

      this.setState({
        summarizingModels: updatedSummarizing,
        summarizingModel: activeRunningModel
      });
    }
  }

  /**
   * Directly sets the active document record.
   *
   * WHAT: Updates `activeDocument: doc`.
   * WHY: Used by child views (e.g. BibTeX metadata inline editors or version uploads)
   * to update the loaded document model in place.
   *
   * @param doc Updated document record.
   */
  setActiveDocument(doc: DocumentRecord): void {
    this.setState({ activeDocument: doc });
  }

  // ------------------------------------------------------------------
  // Authentication
  // ------------------------------------------------------------------

  /**
   * Handles successful user login and session establishment.
   *
   * WHAT: Stores user profile in memory and persists profile and JWT token into `localStorage`.
   * WHY: Preserves user authentication across browser reloads while immediately updating
   * user avatar, name, and role badges in the ShellBar.
   *
   * @param newUser Authenticated user profile.
   * @param token OIDC Bearer token string.
   */
  handleLoginSuccess(newUser: UserProfile, token: string): void {
    this.setState({ user: newUser });
    localStorage.setItem('personal_library_user', JSON.stringify(newUser));
    localStorage.setItem('personal_library_token', token);
    this.showToast(`Signed in to Keycloak realm as ${newUser.name}`);
  }

  /**
   * Logs out the current user session and clears stored credentials.
   *
   * WHAT: Dispatches `logout` to the backend gateway, clears `localStorage` keys,
   * shows confirmation toast, and opens the auth modal.
   * WHY: Fully purges tokens to prevent session hijacking and invites re-authentication.
   */
  async logout(): Promise<void> {
    try {
      await requestBackend('logout', {});
    } catch {
      // ignore
    }
    localStorage.removeItem('personal_library_user');
    localStorage.removeItem('personal_library_token');
    this.showToast('Signed out from Keycloak realm', 'success');
    this.setState({ authModalOpen: true });
  }
}

export const appStore = new AppStore();
