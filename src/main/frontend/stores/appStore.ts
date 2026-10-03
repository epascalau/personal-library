/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
  backendSettingsOpen: boolean;
  summarizingModel: SummaryModel | null;

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
      backendSettingsOpen: false,
      summarizingModel: null,

      toast: null
    });
  }

  /** Mirrors the `useEffect` that refetched whenever the adapter changed. */
  start(): void {
    backendBus.subscribe('backend:adapter:changed', () => this.scheduleFetch());
    void this.fetchDocuments();
  }

  // ------------------------------------------------------------------
  // Toast
  // ------------------------------------------------------------------

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
   * Coalesces the "dependencies changed" refetches (page, pageSize, sortBy,
   * sortOrder, filters, adapter) into a single request per microtask, the way
   * React batched state updates before re-running the effect.
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

  goHome(): void {
    this.setState({ currentView: 'list', activeDocument: null });
  }

  /** Back from the Object Page also refreshes the list, as in `App.tsx`. */
  backToList(): void {
    this.setState({ currentView: 'list', activeDocument: null });
    void this.fetchDocuments();
  }

  // ------------------------------------------------------------------
  // Filtering, sorting, pagination
  // ------------------------------------------------------------------

  setFilters(filters: FilterState): void {
    this.setState({ filters });
    this.scheduleFetch();
  }

  patchFilter<K extends keyof FilterState>(key: K, value: FilterState[K]): void {
    this.setFilters({ ...this.state.filters, [key]: value });
  }

  applyFilters(): void {
    this.setState({ page: 1 });
    this.scheduleFetch();
  }

  resetFilters(): void {
    this.setState({ filters: { ...EMPTY_FILTERS }, page: 1 });
    this.scheduleFetch();
  }

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

  setPage(page: number): void {
    this.setState({ page });
    this.scheduleFetch();
  }

  setPageSize(pageSize: number): void {
    this.setState({ pageSize, page: 1 });
    this.scheduleFetch();
  }

  // ------------------------------------------------------------------
  // Dialogs
  // ------------------------------------------------------------------

  openUpload(): void {
    this.setState({ uploadModalOpen: true });
  }

  closeUpload(): void {
    this.setState({ uploadModalOpen: false });
  }

  openVersionModal(): void {
    this.setState({ versionModalOpen: true });
  }

  closeVersionModal(): void {
    this.setState({ versionModalOpen: false });
  }

  requestDelete(doc: DocumentRecord | null): void {
    this.setState({ deleteConfirmDoc: doc });
  }

  openOpenApi(): void {
    this.setState({ openApiModalOpen: true });
  }

  closeOpenApi(): void {
    this.setState({ openApiModalOpen: false });
  }

  openBackendSettings(): void {
    this.setState({ backendSettingsOpen: true });
  }

  closeBackendSettings(): void {
    this.setState({ backendSettingsOpen: false });
  }

  openAuth(): void {
    this.setState({ authModalOpen: true });
  }

  closeAuth(): void {
    this.setState({ authModalOpen: false });
  }

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------

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

  async regenerateSummary(model: SummaryModel): Promise<void> {
    const activeDocument = this.state.activeDocument;
    if (!activeDocument) {
      return;
    }
    this.setState({ summarizingModel: model });
    try {
      const summaryRecord = await requestBackend('regenerateSummary', {
        guid: activeDocument.guid,
        modelKey: model
      });

      const prev = this.state.activeDocument;
      if (prev) {
        this.setState({
          activeDocument: {
            ...prev,
            summaries: {
              ...prev.summaries,
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
      this.setState({ summarizingModel: null });
    }
  }

  setActiveDocument(doc: DocumentRecord): void {
    this.setState({ activeDocument: doc });
  }

  // ------------------------------------------------------------------
  // Authentication
  // ------------------------------------------------------------------

  handleLoginSuccess(newUser: UserProfile, token: string): void {
    this.setState({ user: newUser });
    localStorage.setItem('personal_library_user', JSON.stringify(newUser));
    localStorage.setItem('personal_library_token', token);
    this.showToast(`Signed in to Keycloak realm as ${newUser.name}`);
  }

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
