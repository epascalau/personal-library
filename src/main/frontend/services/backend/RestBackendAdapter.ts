/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * REST backend adapter.
 * Connects the SAP UI5 frontend to the Spring Boot REST services, handling
 * Keycloak OIDC bearer token injection, multi-attribute document queries,
 * file uploads with multipart encoding, BibTeX metadata updates, and Ollama RAG conversational search.
 */

import {
  BackendAdapter,
  BackendConfig,
  BackendHealthResult,
  DocumentListResult,
  ChatResponseResult,
  LLM_TIMEOUT_MS
} from './types';
import { DocumentRecord, FilterState, BibTeXMetadata, SummaryRecord, UserProfile, DocumentVersionSnapshot } from '../../types';

export class RestBackendAdapter implements BackendAdapter {
  readonly id: string;
  readonly name: string;
  readonly config: BackendConfig;

  /**
   * Initializes the REST adapter with endpoint configuration and timeout defaults.
   *
   * WHAT: Merges user config with a default `LLM_TIMEOUT_MS` timeout and strips trailing slashes from baseUrl.
   * WHY: Normalizing baseUrl avoids double-slash errors (`//documents`) when building resource paths,
   * while a generous default timeout accommodates long-running, CPU-bound local LLM and RAG vector operations.
   *
   * @param config The backend configuration record.
   */
  constructor(config: BackendConfig) {
    this.config = {
      timeoutMs: LLM_TIMEOUT_MS,
      ...config,
      // Normalize baseUrl: remove trailing slash
      baseUrl: config.baseUrl ? config.baseUrl.replace(/\/+$/, '') : '/api/v1'
    };
    this.id = config.type;
    this.name = config.name;
  }

  /**
   * Assembles HTTP request headers including authentication tokens and custom headers.
   *
   * WHAT: Sets `Content-Type: application/json`, appends user-defined custom headers,
   * and injects the Keycloak OIDC `Authorization: Bearer <token>` header from config or localStorage.
   * WHY: Centralizes authentication token injection so individual REST methods do not need
   * to manually look up tokens or worry about Bearer prefix formatting.
   *
   * @param extra Optional extra headers to merge.
   * @returns Complete headers record.
   */
  private getHeaders(extra?: HeadersInit): HeadersInit {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(this.config.customHeaders || {})
    };

    const token = this.config.authToken || localStorage.getItem('personal_library_token');
    if (token) {
      headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    }

    if (extra) {
      Object.assign(headers, extra);
    }

    return headers;
  }

  /**
   * Dispatches an HTTP request with configurable timeout and automatic network retry.
   *
   * WHAT:
   * 1. Constructs absolute URL from endpoint.
   * 2. Sets up an `AbortController` timeout for the requested duration.
   * 3. Executes `fetch`.
   * 4. If a GET request fails due to temporary network error, applies exponential backoff and retries.
   * 5. Unpacks JSON or plain-text payload according to response `Content-Type`.
   *
   * WHY:
   * 1. AbortController: Prevents hanging sockets from permanently freezing UI loading spinners.
   * 2. Safe retries: Restricts automatic retries to idempotent GET requests to prevent duplicate
   *    resource creations on mutations.
   * 3. Dynamic content-type handling: Transparently supports both JSON DTOs and raw YAML files.
   *
   * @param endpoint Resource path or full URL.
   * @param options Fetch options.
   * @param customTimeoutMs Optional timeout override in milliseconds.
   * @param retries Number of retry attempts on network error (defaults to 2).
   * @returns Promise resolving to parsed response payload.
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    customTimeoutMs?: number,
    retries = 2
  ): Promise<T> {
    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : `${this.config.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers = this.getHeaders(options.headers);
    const timeoutDuration = customTimeoutMs || this.config.timeoutMs || 10000;

    let lastError: any = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutDuration);

      try {
        const res = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          let errMsg = `Backend error ${res.status}: ${res.statusText}`;
          try {
            const errBody = await res.json();
            if (errBody && (errBody.error || errBody.message)) {
              errMsg = errBody.error || errBody.message;
            }
          } catch (_) {
            // ignore parsing error
          }
          throw new Error(errMsg);
        }

        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          return (await res.json()) as T;
        }
        return (await res.text()) as unknown as T;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastError = err;

        const isTimeout = err.name === 'AbortError';
        const isNetworkErr = err instanceof TypeError || isTimeout;

        // If it was a network error or timeout and we have retries left, wait briefly and retry
        if (isNetworkErr && attempt < retries && (options.method === undefined || options.method === 'GET')) {
          await new Promise(res => setTimeout(res, 500 * (attempt + 1)));
          continue;
        }

        if (isTimeout) {
          throw new Error(`Request to ${url} timed out after ${timeoutDuration}ms`);
        }
        throw err;
      }
    }

    throw lastError || new Error(`Request to ${url} failed after ${retries} retries`);
  }

  /**
   * Queries the document catalog matching pagination, sort criteria, and multi-attribute filters.
   *
   * WHAT: Serializes filter parameters into query string attributes and issues a GET to `/documents`.
   * WHY: Sending query parameters over standard URL search strings allows server-side MongoDB
   * indexes and custom regex queries to filter records without transferring entire collections over the wire.
   *
   * @param params Pagination, sorting, and filter state.
   * @returns Paginated document records and total count.
   */
  async getDocuments(params: {
    page: number;
    pageSize: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    filters: FilterState;
  }): Promise<DocumentListResult> {
    const query = new URLSearchParams({
      page: params.page.toString(),
      pageSize: params.pageSize.toString(),
      sortBy: params.sortBy,
      sortOrder: params.sortOrder
    });

    const f = params.filters;
    if (f.fileName) query.set('fileName', f.fileName);
    if (f.title) query.set('title', f.title);
    if (f.author) query.set('author', f.author);
    if (f.edition) query.set('edition', f.edition);
    if (f.format && f.format !== 'all') query.set('format', f.format);
    if (f.content) query.set('content', f.content);

    // Timeout of 25 seconds with 2 automatic retries for documents query
    const data = await this.request<{ items: DocumentRecord[]; totalCount: number }>(
      `/documents?${query.toString()}`,
      { method: 'GET' },
      25000,
      2
    );

    return {
      items: data.items || [],
      totalCount: data.totalCount || 0
    };
  }

  /**
   * Fetches the complete document entity including raw text content, chunks, and summaries.
   *
   * WHAT: Issues a GET to `/documents/{guid}`.
   * WHY: Object Page views require complete document representation for RAG chat and summary analysis.
   *
   * @param guid Unique document GUID.
   * @returns Complete DocumentRecord.
   */
  async getDocument(guid: string): Promise<DocumentRecord> {
    return this.request<DocumentRecord>(`/documents/${guid}`, { method: 'GET' }, 25000, 2);
  }

  /**
   * Ingests a new document into the library with automated BibTeX extraction and dual-model AI summarization.
   *
   * WHAT: Issues a POST to `/documents` with file payload, base64 data, and metadata.
   * WHY: Ingestion is a computationally intensive pipeline involving file storage, text extraction,
   * chunk vectorization into Qdrant, and dual LLM synthesis (Llama 3.3 and Mistral Large).
   * A generous 180-second timeout prevents premature disconnection, while 0 retries ensures
   * that documents are never accidentally ingested twice.
   *
   * @param payload Upload payload including file metadata and contents.
   * @returns Newly created DocumentRecord.
   */
  async uploadDocument(payload: {
    file: File;
    fileName: string;
    fileFormat: string;
    fileSize: number;
    fileContent?: string;
    fileData?: string;
    mimeType?: string;
    bibtex: BibTeXMetadata;
  }): Promise<DocumentRecord> {
    // Generous timeout for full physical upload, Qdrant chunking, and dual Llama/Mistral AI summaries
    // on CPU-bound local Ollama inference, which can take several minutes per model.
    return this.request<DocumentRecord>(
      '/documents',
      {
        method: 'POST',
        body: JSON.stringify({
          fileName: payload.fileName,
          fileFormat: payload.fileFormat,
          fileSize: payload.fileSize,
          fileContent: payload.fileContent,
          fileData: payload.fileData,
          mimeType: payload.mimeType,
          bibtex: payload.bibtex
        })
      },
      LLM_TIMEOUT_MS,
      0
    );
  }

  /**
   * Overwrites the physical content and metadata of an existing document while preserving its persistent GUID.
   *
   * WHAT: Issues a PUT to `/documents/{guid}` with `isNewVersion: true`.
   * WHY: Preserving the persistent GUID across version updates maintains citation stability,
   * permalinks, and bookmark references while updating physical file contents, re-indexing vector embeddings,
   * and regenerating summaries.
   *
   * @param guid Persistent GUID of the document being updated.
   * @param payload Updated file data and metadata.
   * @returns Updated DocumentRecord.
   */
  async overwriteVersion(
    guid: string,
    payload: {
      file?: File | null;
      fileName?: string;
      fileFormat?: string;
      fileSize?: number;
      fileContent?: string;
      fileData?: string;
      mimeType?: string;
      bibtex?: BibTeXMetadata;
    }
  ): Promise<DocumentRecord> {
    // Generous timeout for version overwrite, re-indexing, and local LLM re-summarization
    return this.request<DocumentRecord>(
      `/documents/${guid}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          isNewVersion: true,
          fileName: payload.fileName,
          fileFormat: payload.fileFormat,
          fileSize: payload.fileSize,
          fileContent: payload.fileContent,
          fileData: payload.fileData,
          mimeType: payload.mimeType,
          bibtex: payload.bibtex
        })
      },
      LLM_TIMEOUT_MS,
      0
    );
  }

  /**
   * Permanently deletes a document and its associated vector embeddings.
   *
   * WHAT: Issues a DELETE to `/documents/{guid}`.
   * WHY: Purges MongoDB entities, physical storage assets, and Qdrant vector index collections.
   *
   * @param guid GUID of the document to remove.
   * @returns Confirmation record.
   */
  async deleteDocument(guid: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      `/documents/${guid}`,
      { method: 'DELETE' },
      20000,
      0
    );
  }

  /**
   * Triggers an on-demand re-summarization of a document using a specific LLM model.
   *
   * WHAT: Issues a POST to `/documents/{guid}/summarize` specifying the model key.
   * WHY: Allows researchers to independently re-evaluate summaries with newer prompt instructions
   * or alternative models (Llama 3.3 vs Mistral Large) without re-uploading the document.
   *
   * @param guid Document GUID.
   * @param model 'llama' or 'mistral'.
   * @returns Generated SummaryRecord with execution duration and timestamp.
   */
  async regenerateSummary(guid: string, model: 'llama' | 'mistral'): Promise<SummaryRecord> {
    // Generous timeout for LLM synthesis on CPU-bound local Ollama inference (can take several
    // minutes per model). Retries disabled: a slow-but-successful summarization should not be
    // aborted and re-run, doubling wall-clock cost.
    return this.request<SummaryRecord>(
      `/documents/${guid}/summarize`,
      {
        method: 'POST',
        body: JSON.stringify({ model })
      },
      LLM_TIMEOUT_MS,
      0
    );
  }

  /**
   * Executes a conversational RAG question-and-answer exchange grounded in the document's indexed content.
   *
   * WHAT: Issues a POST to `/documents/{guid}/chat` with the question and prior conversation history.
   * WHY: Queries Qdrant vectors to find the most relevant document chunks, constructs an augmented prompt,
   * and invokes the LLM to generate an accurate, grounded answer with cited context chunks.
   *
   * @param guid Target document GUID.
   * @param question User question.
   * @param chatHistory Prior chat turns for multi-turn conversational context.
   * @returns Answer text, execution duration, and context chunk references.
   */
  async chatWithDocument(
    guid: string,
    question: string,
    chatHistory: { role: string; text: string }[]
  ): Promise<ChatResponseResult> {
    // Generous timeout for Qdrant vector retrieval plus local LLM generation. Retries disabled
    // to avoid re-running an expensive, slow-but-in-progress generation call.
    return this.request<ChatResponseResult>(
      `/documents/${guid}/chat`,
      {
        method: 'POST',
        body: JSON.stringify({ question, chatHistory })
      },
      LLM_TIMEOUT_MS,
      0
    );
  }

  /**
   * Extracts structured BibTeX bibliographic metadata from a file or sample content.
   *
   * WHAT: Issues a POST to `/documents/extract-metadata` with file name, sample text, or binary data.
   * WHY: Pre-fills upload dialogs with automatically resolved title, author, year, and entry type,
   * saving researcher time and reducing cataloging errors.
   *
   * @param fileName File name.
   * @param sampleContent Optional sample text snippet.
   * @param fileData Optional base64 file data.
   * @param mimeType Optional MIME type.
   * @returns Extracted BibTeX metadata record and full extracted text.
   */
  async extractMetadata(
    fileName: string,
    sampleContent?: string,
    fileData?: string,
    mimeType?: string
  ): Promise<BibTeXMetadata & { extractedText?: string }> {
    // 60-second timeout for AI metadata extraction
    return this.request<BibTeXMetadata & { extractedText?: string }>(
      '/documents/extract-metadata',
      {
        method: 'POST',
        body: JSON.stringify({ fileName, contentSample: sampleContent, fileData, mimeType })
      },
      60000,
      1
    );
  }

  /**
   * Authenticates user credentials with Keycloak / OIDC identity provider.
   *
   * WHAT: Issues a POST to `/auth/login` and receives Bearer access token and user profile.
   * WHY: Establishes security principal and roles for Role-Based Access Control (RBAC).
   *
   * @param username Username or email.
   * @param password Password.
   * @param realm Target Keycloak realm.
   * @returns Access token and UserProfile.
   */
  async login(
    username: string,
    password?: string,
    realm?: string
  ): Promise<{ accessToken: string; user: UserProfile }> {
    return this.request<{ accessToken: string; user: UserProfile }>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ username, password, realm })
      },
      25000,
      1
    );
  }

  /**
   * Terminates active authentication session.
   *
   * WHAT: Issues a POST to `/auth/logout`.
   * WHY: Informs Keycloak session manager to invalidate the server-side session token.
   */
  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' }, 5000, 0);
    } catch (_) {
      // ignore
    }
  }

  /**
   * Generates the direct download URL for a document's physical file asset.
   *
   * WHAT: Constructs the full `/documents/{guid}/download` URL.
   * WHY: Allows native browser anchor tags and download managers to stream binary attachments.
   *
   * @param guid Unique document GUID.
   * @returns Complete download URL string.
   */
  getDownloadUrl(guid: string): string {
    return `${this.config.baseUrl}/documents/${guid}/download`;
  }

  /**
   * Retrieves the historical version snapshot list for a document.
   */
  async getVersionHistory(guid: string): Promise<DocumentVersionSnapshot[]> {
    return this.request<DocumentVersionSnapshot[]>(
      `/documents/${guid}/versions`,
      { method: 'GET' },
      10000,
      1
    );
  }

  /**
   * Rolls back the document to a specific historical version snapshot.
   */
  async rollbackVersion(guid: string, targetVersion: number): Promise<DocumentRecord> {
    return this.request<DocumentRecord>(
      `/documents/${guid}/rollback/${targetVersion}`,
      { method: 'POST' },
      15000,
      1
    );
  }

  /**
   * Generates a download URL for a specific historical version asset.
   */
  getHistoricalDownloadUrl(guid: string, versionNumber: number): string {
    return `${this.config.baseUrl}/documents/${guid}/versions/${versionNumber}/download`;
  }

  /**
   * Retrieves the raw OpenAPI 3.0 specification in YAML format.
   *
   * WHAT: Fetches `/openapi.yaml`.
   * WHY: Powers the interactive OpenAPI schema viewer and developer documentation modals.
   *
   * @returns Raw OpenAPI YAML string.
   */
  async getOpenApiSpec(): Promise<string> {
    return this.request<string>('/openapi.yaml', { method: 'GET' }, 8000, 2);
  }

  /**
   * Performs a comprehensive latency and availability health check against the backend.
   *
   * WHAT: Probes `/health` first; if unavailable, probes `/documents?pageSize=1`, measuring roundtrip ms.
   * WHY: Dual-level probing ensures that even if custom health endpoints are unavailable,
   * basic REST database query functionality is tested, giving researchers an accurate status pill.
   *
   * @returns Measured BackendHealthResult.
   */
  async testHealth(): Promise<BackendHealthResult> {
    const start = performance.now();
    try {
      // First try dedicated /health status endpoint
      try {
        const healthData = await this.request<any>('/health', { method: 'GET' }, 5000, 1);
        const latencyMs = Math.round(performance.now() - start);
        return {
          ok: true,
          latencyMs,
          message: `Backend & Models Online (${latencyMs}ms)`,
          details: healthData
        };
      } catch (_) {
        // Fallback to documents probe
      }

      const res = await this.getDocuments({
        page: 1,
        pageSize: 1,
        sortBy: 'uploadDate',
        sortOrder: 'desc',
        filters: { fileName: '', title: '', author: '', edition: '', format: 'all', content: '' }
      });

      const latencyMs = Math.round(performance.now() - start);
      return {
        ok: true,
        latencyMs,
        message: `Connected successfully (${latencyMs}ms, ${res.totalCount} documents)`,
        details: { totalCount: res.totalCount }
      };
    } catch (err: any) {
      const latencyMs = Math.round(performance.now() - start);
      return {
        ok: false,
        latencyMs,
        message: `Connection failed: ${err.message}`
      };
    }
  }
}
