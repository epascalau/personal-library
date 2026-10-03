import {
  BackendAdapter,
  BackendConfig,
  BackendHealthResult,
  DocumentListResult,
  ChatResponseResult
} from './types';
import { DocumentRecord, FilterState, BibTeXMetadata, SummaryRecord, UserProfile } from '../../types';

export class RestBackendAdapter implements BackendAdapter {
  readonly id: string;
  readonly name: string;
  readonly config: BackendConfig;

  constructor(config: BackendConfig) {
    this.config = {
      timeoutMs: 120000,
      ...config,
      // Normalize baseUrl: remove trailing slash
      baseUrl: config.baseUrl ? config.baseUrl.replace(/\/+$/, '') : '/api/v1'
    };
    this.id = config.type;
    this.name = config.name;
  }

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
   * Robust HTTP request with configurable timeout and automatic retry on network/timeout errors
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

  async getDocument(guid: string): Promise<DocumentRecord> {
    return this.request<DocumentRecord>(`/documents/${guid}`, { method: 'GET' }, 25000, 2);
  }

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
    // Generous 180-second (3-minute) timeout for full physical upload, Qdrant chunking, and dual Llama/Mistral AI summaries
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
      180000,
      0
    );
  }

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
    // Generous 180-second timeout for version overwrite and re-indexing
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
      180000,
      0
    );
  }

  async deleteDocument(guid: string): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>(
      `/documents/${guid}`,
      { method: 'DELETE' },
      20000,
      0
    );
  }

  async regenerateSummary(guid: string, model: 'llama' | 'mistral'): Promise<SummaryRecord> {
    // 120-second timeout for LLM synthesis
    return this.request<SummaryRecord>(
      `/documents/${guid}/summarize`,
      {
        method: 'POST',
        body: JSON.stringify({ model })
      },
      120000,
      1
    );
  }

  async chatWithDocument(
    guid: string,
    question: string,
    chatHistory: { role: string; text: string }[]
  ): Promise<ChatResponseResult> {
    // 90-second timeout for Qdrant vector retrieval + Llama 3.3 generation
    return this.request<ChatResponseResult>(
      `/documents/${guid}/chat`,
      {
        method: 'POST',
        body: JSON.stringify({ question, chatHistory })
      },
      90000,
      1
    );
  }

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

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' }, 5000, 0);
    } catch (_) {
      // ignore
    }
  }

  getDownloadUrl(guid: string): string {
    return `${this.config.baseUrl}/documents/${guid}/download`;
  }

  async getOpenApiSpec(): Promise<string> {
    return this.request<string>('/openapi.yaml', { method: 'GET' }, 8000, 2);
  }

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
