/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Mock in-memory backend adapter.
 * Provides client-side document persistence, multi-attribute filtering, sorting,
 * simulated network latencies, and local RAG search for zero-dependency standalone operation.
 */

import {
  BackendAdapter,
  BackendConfig,
  BackendHealthResult,
  DocumentListResult,
  ChatResponseResult
} from './types';
import { DocumentRecord, FilterState, BibTeXMetadata, SummaryRecord, UserProfile } from '../../types';

const INITIAL_MOCK_DOCUMENTS: DocumentRecord[] = [
  {
    guid: 'c3d4e5f6-a1b2-4c3d-ae4f-5a6b7c8d9e0f',
    previousVersionGuid: null,
    versionNumber: 1,
    fileName: 'deep_residual_learning_image_recognition.pdf',
    fileSize: 3145728,
    fileSizeFormatted: '3.0 MB',
    format: 'pdf',
    uploadDate: new Date(Date.now() - 3600000 * 6).toISOString(),
    editDate: new Date(Date.now() - 3600000 * 6).toISOString(),
    bibtex: {
      entryType: 'inproceedings',
      bibKey: 'he2016deep',
      title: 'Deep Residual Learning for Image Recognition',
      author: 'Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun',
      year: '2016',
      month: 'June',
      booktitle: 'Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR)',
      pages: '770--778',
      publisher: 'IEEE',
      doi: '10.1109/CVPR.2016.90',
      url: 'https://arxiv.org/abs/1512.03385',
      abstract: 'Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously. We explicitly reformulate the layers as learning residual functions with reference to the layer inputs.',
      keywords: 'Deep Learning, Residual Networks, Computer Vision, ResNet, ImageNet'
    },
    bibtexRaw: `@inproceedings{he2016deep,
  title     = {Deep Residual Learning for Image Recognition},
  author    = {Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun},
  booktitle = {Proceedings of the IEEE Conference on Computer Vision and Pattern Recognition (CVPR)},
  year      = {2016},
  month     = {June},
  pages     = {770--778},
  publisher = {IEEE},
  doi       = {10.1109/CVPR.2016.90},
  url       = {https://arxiv.org/abs/1512.03385}
}`,
    summaries: {
      llama: {
        modelName: 'Ollama Llama 3.3 (70B Instruct)',
        modelKey: 'llama',
        createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
        durationSeconds: 4.2,
        durationFormatted: '0 min 4.2 sec',
        summaryText: `### Analytical Synthesis (Llama 3.3)
**Core Premise:** Introduces skip/shortcut connections to resolve vanishing/exploding gradients in ultra-deep neural networks.
**Key Technical Findings:**
1. Reformulates layers as residual functions F(x) = H(x) - x, allowing optimization of identity mappings.
2. Evaluated ResNet-152 on ImageNet, winning 1st place with 3.57% top-5 error.`
      },
      mistral: {
        modelName: 'Ollama Mistral Large (2411)',
        modelKey: 'mistral',
        createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
        durationSeconds: 2.9,
        durationFormatted: '0 min 2.9 sec',
        summaryText: `### Executive & Operational Summary (Mistral)
**Overview:** Foundational milestone in deep learning overcoming the degradation problem.
**Key Takeaways:**
* Standardized backbone across computer vision tasks.
* Substantially lower computational complexity than VGG.`
      }
    },
    contentExcerpt: 'Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks that are substantially deeper...',
    chunks: [
      { id: 'c-1', chunkIndex: 0, text: 'Deeper neural networks are more difficult to train. We present a residual learning framework to ease the training of networks.' },
      { id: 'c-2', chunkIndex: 1, text: 'We explicitly reformulate the layers as learning residual functions with reference to the layer inputs.' }
    ]
  },
  {
    guid: 'd4e5f6a1-b2c3-4d4e-8f9a-6b7c8d9e0f1a',
    previousVersionGuid: null,
    versionNumber: 1,
    fileName: 'The Wonderful Wizard of Oz   L. Frank Baum.pdf',
    fileSize: 2450000,
    fileSizeFormatted: '2.3 MB',
    format: 'pdf',
    uploadDate: new Date(Date.now() - 3600000 * 2).toISOString(),
    editDate: new Date(Date.now() - 3600000 * 2).toISOString(),
    bibtex: {
      entryType: 'book',
      bibKey: 'baum1900wizard',
      title: 'The Wonderful Wizard of Oz',
      author: 'L. Frank Baum (Pictures by W.W. Denslow)',
      year: '1900',
      publisher: 'George M. Hill Company / Project Gutenberg',
      abstract: 'Classic American children\'s fantasy novel by L. Frank Baum, illustrated by W.W. Denslow. When a Kansas cyclone whisks away young Dorothy Gale and her dog Toto, their farmhouse lands in the magical Land of Oz.',
      keywords: 'Children\'s Literature, Fantasy, Dorothy, Scarecrow, Tin Woodman, Cowardly Lion, Land of Oz, Yellow Brick Road, Emerald City, Wizard of Oz'
    },
    bibtexRaw: `@book{baum1900wizard,\n  title = {The Wonderful Wizard of Oz},\n  author = {L. Frank Baum},\n  year = {1900}\n}`,
    summaries: {
      llama: {
        modelName: 'Ollama Llama 3.3 (70B Instruct)',
        modelKey: 'llama',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        durationSeconds: 4.5,
        durationFormatted: '0 min 4.5 sec',
        summaryText: `### Analytical Synthesis (Llama 3.3)\n**Core Premise:** The Wonderful Wizard of Oz follows Dorothy Gale and Toto to the magical Land of Oz.\n**Key Narrative Arc:** Dorothy travels the yellow brick road with the Scarecrow, Tin Woodman, and Cowardly Lion to reach the Emerald City.`
      },
      mistral: {
        modelName: 'Ollama Mistral Large (2411)',
        modelKey: 'mistral',
        createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        durationSeconds: 3.1,
        durationFormatted: '0 min 3.1 sec',
        summaryText: `### Executive & Operational Summary (Mistral)\n**Overview:** Seminal American fairy tale demonstrating inner virtues of wisdom, heart, and courage.`
      }
    },
    contentExcerpt: 'Dorothy lived in the midst of the great Kansas prairies with Uncle Henry and Aunt Em...',
    chunks: [
      { id: 'oz-1', chunkIndex: 0, text: 'Dorothy lived in the midst of the great Kansas prairies with Uncle Henry and Aunt Em. A sudden cyclone whirled the house into the air and set it down in the Land of the Munchkins.' },
      { id: 'oz-2', chunkIndex: 1, text: 'Along the road of yellow brick, Dorothy freed the Scarecrow who sought brains, oiled the Tin Woodman who sought a heart, and stood up to the Cowardly Lion who joined them to seek courage from the Great Oz.' },
      { id: 'oz-3', chunkIndex: 2, text: 'The Great Oz demanded they destroy the Wicked Witch of the West. Dorothy melted the Witch with a bucket of water. Upon their return, Toto tipped over a screen, revealing the Wizard was merely an ordinary man from Omaha using illusions and ventriloquism.' }
    ]
  }
];

export class MockBackendAdapter implements BackendAdapter {
  readonly id = 'mock';
  readonly name = 'Local Standalone Engine (Offline / In-Memory)';
  readonly config: BackendConfig;
  private documents: DocumentRecord[] = [];

  /**
   * Initializes the standalone mock adapter and restores persisted local documents.
   *
   * WHAT: Attempts to load document records from `localStorage` under `personal_library_mock_docs`;
   * falls back to `INITIAL_MOCK_DOCUMENTS` if empty or corrupted.
   * WHY: Enables zero-dependency standalone demonstrations and offline development
   * without requiring Docker, MongoDB, Ollama, or Spring Boot running locally.
   *
   * @param config Backend configuration options.
   */
  constructor(config: BackendConfig) {
    this.config = config;
    const stored = localStorage.getItem('personal_library_mock_docs');
    if (stored) {
      try {
        this.documents = JSON.parse(stored);
      } catch (_) {
        this.documents = [...INITIAL_MOCK_DOCUMENTS];
      }
    } else {
      this.documents = [...INITIAL_MOCK_DOCUMENTS];
    }
  }

  /**
   * Persists the in-memory documents collection to browser localStorage.
   *
   * WHAT: Serializes `this.documents` as JSON.
   * WHY: Preserves user uploads, version updates, and deletions across page reloads in offline mode.
   */
  private save() {
    localStorage.setItem('personal_library_mock_docs', JSON.stringify(this.documents));
  }

  /**
   * Queries documents with multi-attribute filtering, sorting, and pagination in memory.
   *
   * WHAT:
   * 1. Introduces an intentional 120ms delay to simulate realistic asynchronous network latency.
   * 2. Filters documents by fileName, title, author, edition/year, format, and content excerpt.
   * 3. Sorts records in-place by the requested attribute and sort order.
   * 4. Slices the paginated page window and returns total matching count.
   *
   * WHY:
   * 1. Simulated latency ensures that loading skeletons, spinners, and async race condition guards
   *    in UI components behave identically in mock mode as they do with real network servers.
   * 2. Comprehensive multi-field filtering mirrors the Spring Data MongoDB `MongoTemplate` query behavior.
   *
   * @param params Filter criteria, sorting, and pagination.
   * @returns Paginated DocumentListResult.
   */
  async getDocuments(params: {
    page: number;
    pageSize: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    filters: FilterState;
  }): Promise<DocumentListResult> {
    await new Promise(r => setTimeout(r, 120));
    let filtered = [...this.documents];

    const f = params.filters;
    if (f.fileName) filtered = filtered.filter(d => d.fileName.toLowerCase().includes(f.fileName.toLowerCase()));
    if (f.title) filtered = filtered.filter(d => (d.bibtex.title || '').toLowerCase().includes(f.title.toLowerCase()));
    if (f.author) filtered = filtered.filter(d => (d.bibtex.author || '').toLowerCase().includes(f.author.toLowerCase()));
    if (f.edition) {
      const term = f.edition.toLowerCase();
      filtered = filtered.filter(d =>
        (d.bibtex.edition || '').toLowerCase().includes(term) ||
        (d.bibtex.year || '').toLowerCase().includes(term)
      );
    }
    if (f.format && f.format !== 'all') filtered = filtered.filter(d => d.format.toLowerCase() === f.format.toLowerCase());
    if (f.content) {
      filtered = filtered.filter(d =>
        (d.contentExcerpt || '').toLowerCase().includes(f.content.toLowerCase()) ||
        (d.bibtex.abstract || '').toLowerCase().includes(f.content.toLowerCase())
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let valA: any = params.sortBy === 'edition'
        ? (a.bibtex.edition || a.bibtex.year || '')
        : ((a as any)[params.sortBy] ?? (a.bibtex as any)[params.sortBy] ?? '');
      let valB: any = params.sortBy === 'edition'
        ? (b.bibtex.edition || b.bibtex.year || '')
        : ((b as any)[params.sortBy] ?? (b.bibtex as any)[params.sortBy] ?? '');
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();
      if (valA < valB) return params.sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return params.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const start = (params.page - 1) * params.pageSize;
    const items = filtered.slice(start, start + params.pageSize);

    return {
      items,
      totalCount: filtered.length
    };
  }

  /**
   * Retrieves a document record by its unique GUID from the local in-memory store.
   *
   * WHAT: Searches `this.documents` for a record matching `guid`.
   * WHY: Simulates local document retrieval with an 80ms delay to replicate fast database lookups.
   *
   * @param guid Target document GUID.
   * @returns Matching DocumentRecord or throws if not found.
   */
  async getDocument(guid: string): Promise<DocumentRecord> {
    await new Promise(r => setTimeout(r, 80));
    const doc = this.documents.find(d => d.guid === guid);
    if (!doc) throw new Error(`Document with GUID ${guid} not found in offline store`);
    return doc;
  }

  /**
   * Ingests a new document record into local storage with simulated dual-model summaries.
   *
   * WHAT: Generates a mock GUID, builds a full `DocumentRecord`, prepends it to `this.documents`,
   * and saves to `localStorage`.
   * WHY: Allows researchers to test upload dialogs and immediately inspect generated records
   * even when disconnected from live Ollama or MongoDB backends.
   *
   * @param payload Upload payload with file metadata.
   * @returns Newly created DocumentRecord.
   */
  async uploadDocument(payload: {
    file: File;
    fileName: string;
    fileFormat: string;
    fileSize: number;
    fileContent?: string;
    bibtex: BibTeXMetadata;
  }): Promise<DocumentRecord> {
    await new Promise(r => setTimeout(r, 500));
    const now = new Date().toISOString();
    const guid = `mock-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

    const newDoc: DocumentRecord = {
      guid,
      previousVersionGuid: null,
      versionNumber: 1,
      fileName: payload.fileName,
      fileSize: payload.fileSize,
      fileSizeFormatted: `${(payload.fileSize / (1024 * 1024)).toFixed(1)} MB`,
      format: payload.fileFormat,
      uploadDate: now,
      editDate: now,
      bibtex: payload.bibtex,
      bibtexRaw: `@${payload.bibtex.entryType}{${payload.bibtex.bibKey},\n  title = {${payload.bibtex.title}},\n  author = {${payload.bibtex.author}},\n  year = {${payload.bibtex.year}}\n}`,
      summaries: {
        llama: {
          modelName: 'Ollama Llama 3.3 (70B Instruct)',
          modelKey: 'llama',
          createdAt: now,
          timestamp: now,
          durationSeconds: 3.8,
          durationFormatted: '0 min 3.8 sec',
          summaryText: `### Analytical Synthesis (Llama 3.3)\n**Core Premise:** Automated ingestion of "${payload.bibtex.title}".\n**Key Technical Findings:**\n1. Offline client processing simulated successfully.\n2. Metadata fields indexed into local store.`
        },
        mistral: {
          modelName: 'Ollama Mistral Large (2411)',
          modelKey: 'mistral',
          createdAt: now,
          timestamp: now,
          durationSeconds: 2.4,
          durationFormatted: '0 min 2.4 sec',
          summaryText: `### Executive & Operational Summary (Mistral)\n**Overview:** Ingested document "${payload.bibtex.title}".\n**Takeaway:** Ready for literature review and local exploration.`
        }
      },
      contentExcerpt: payload.fileContent?.slice(0, 300) || `Content of ${payload.fileName}`,
      chunks: [
        { id: `${guid}-1`, chunkIndex: 0, text: payload.fileContent?.slice(0, 200) || `Overview of ${payload.fileName}` }
      ]
    };

    this.documents.unshift(newDoc);
    this.save();
    return newDoc;
  }

  /**
   * Overwrites an existing document record while retaining its persistent GUID.
   *
   * WHAT: Increments `versionNumber`, updates edit timestamp and file properties, and saves to storage.
   * WHY: Enforces the architectural invariant that in-place version updates must retain the exact
   * same persistent GUID, preserving citation links.
   *
   * @param guid Existing document GUID.
   * @param payload Updated version data.
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
      bibtex?: BibTeXMetadata;
    }
  ): Promise<DocumentRecord> {
    await new Promise(r => setTimeout(r, 400));
    const existingIndex = this.documents.findIndex(d => d.guid === guid);
    if (existingIndex === -1) {
      throw new Error(`Document with GUID ${guid} not found`);
    }
    const existing = this.documents[existingIndex];
    const now = new Date().toISOString();

    const updatedDoc: DocumentRecord = {
      ...existing,
      guid: existing.guid, // Retain existing GUID; do not create a new GUID
      previousVersionGuid: existing.previousVersionGuid || null,
      versionNumber: (existing.versionNumber || 1) + 1,
      fileName: payload.fileName || existing.fileName,
      format: payload.fileFormat || existing.format,
      fileSize: payload.fileSize || existing.fileSize,
      fileSizeFormatted: payload.fileSize ? `${(payload.fileSize / 1024).toFixed(1)} KB` : existing.fileSizeFormatted,
      editDate: now,
      bibtex: payload.bibtex || existing.bibtex,
      fullContent: payload.fileContent || existing.fullContent,
      contentExcerpt: (payload.fileContent || existing.fullContent || '').slice(0, 300)
    };

    this.documents[existingIndex] = updatedDoc;
    this.save();
    return updatedDoc;
  }

  /**
   * Deletes a document from the local offline collection.
   *
   * WHAT: Filters out the document with matching GUID and writes updated list to localStorage.
   * WHY: Provides realistic deletion semantics for offline mode testing.
   *
   * @param guid Document GUID.
   * @returns Success response.
   */
  async deleteDocument(guid: string): Promise<{ success: boolean; message: string }> {
    await new Promise(r => setTimeout(r, 200));
    this.documents = this.documents.filter(d => d.guid !== guid);
    this.save();
    return { success: true, message: `Document ${guid} deleted from offline engine.` };
  }

  /**
   * Simulates an on-demand summary request in offline mode.
   *
   * WHAT: Rejects with a clear instruction message explaining that live Ollama is required.
   * WHY: Transparently informs researchers that live LLM synthesis requires switching to
   * the live Integrated Gateway or Spring Boot backend in settings.
   *
   * @param guid Document GUID.
   * @param model 'llama' or 'mistral'.
   */
  async regenerateSummary(guid: string, model: 'llama' | 'mistral'): Promise<SummaryRecord> {
    await new Promise(r => setTimeout(r, 400));
    throw new Error(
      `Ollama ${model === 'mistral' ? 'Mistral Large (2411)' : 'Llama 3.3 (70B)'} backend service is unavailable in Standalone Offline mode. Switch to the Integrated Gateway (/api/v1) or Spring Boot backend in Settings to compute summaries.`
    );
  }

  /**
   * Answers questions regarding a document using offline heuristics and excerpt citations.
   *
   * WHAT: Evaluates question keywords and returns domain-specific answers with mock citation chunks.
   * WHY: Provides an interactive demonstration of RAG conversational UI flows without requiring
   * local vector database instances or live GPU execution.
   *
   * @param guid Document GUID.
   * @param question User question.
   * @returns ChatResponseResult with answer text and citations.
   */
  async chatWithDocument(
    guid: string,
    question: string
  ): Promise<ChatResponseResult> {
    await new Promise(r => setTimeout(r, 600));
    const doc = await this.getDocument(guid);
    const qLower = question.toLowerCase();

    let answer = `[Offline Assistant] In response to your question "${question}" regarding "${doc.bibtex.title}": The document provides comprehensive empirical findings and architectural specifications in Section 2.`;

    if (doc.bibtex.title.toLowerCase().includes('wizard of oz')) {
      if (qLower.includes('character') || qLower.includes('who are') || qLower.includes('personaje')) {
        answer = `Based on **"The Wonderful Wizard of Oz"** by L. Frank Baum, the characters in the book include:\n\n* **Dorothy Gale**: Young orphan girl from Kansas swept away by a cyclone with her dog Toto [Excerpt 1].\n* **Toto**: Dorothy's faithful little black dog [Excerpt 3].\n* **The Scarecrow**: Dorothy rescues him from a pole; he seeks brains from the Great Oz [Excerpt 2].\n* **The Tin Woodman**: Once a human woodsman, rusted in the forest; he seeks a heart [Excerpt 2].\n* **The Cowardly Lion**: The King of Beasts who feels inner terror; seeks courage [Excerpt 2].\n* **The Great Oz (The Wizard)**: Ruler of the Emerald City, revealed to be an ordinary man from Omaha using illusions and ventriloquism [Excerpt 3].\n* **The Wicked Witch of the West**: Antagonist who is melted by Dorothy with a bucket of water [Excerpt 3].\n* **Uncle Henry & Aunt Em**: Dorothy's guardians in Kansas [Excerpt 1].`;
      } else if (qLower.includes('defeat') || qLower.includes('melt') || qLower.includes('witch')) {
        answer = `Dorothy defeated the Wicked Witch of the West by throwing a bucket of water over her, which caused her to melt away completely [Excerpt 3].`;
      }
    }

    return {
      answer,
      modelUsed: 'Llama 3.3 (70B Instruct) (Offline Engine)',
      citations: doc.chunks.map((c, i) => ({
        chunkIndex: c.chunkIndex ?? i,
        score: 0.95,
        snippet: c.text
      }))
    };
  }

  /**
   * Generates mock BibTeX bibliographic metadata from a file name.
   *
   * WHAT: Derives clean titles, citation keys, and dummy fields from file naming conventions.
   * WHY: Enables testing the upload dialog's automated form population offline.
   *
   * @param fileName File name to parse.
   * @param sampleContent Optional text snippet.
   * @returns Mock BibTeXMetadata record.
   */
  async extractMetadata(
    fileName: string,
    sampleContent?: string,
    _fileData?: string,
    _mimeType?: string
  ): Promise<BibTeXMetadata & { extractedText?: string }> {
    await new Promise(r => setTimeout(r, 300));
    const clean = fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    return {
      entryType: 'article',
      bibKey: fileName.replace(/\.[^/.]+$/, '').toLowerCase().replace(/\W+/g, '_'),
      title: clean.charAt(0).toUpperCase() + clean.slice(1),
      author: 'Offline Author',
      year: new Date().getFullYear().toString(),
      journal: 'Personal Enterprise Library',
      abstract: sampleContent?.slice(0, 200) || `Auto-extracted representation for ${fileName}.`,
      keywords: 'Enterprise, Research',
      extractedText: sampleContent || `Simulated text extraction for ${fileName}`
    };
  }

  /**
   * Simulates successful local authentication without Keycloak.
   *
   * WHAT: Returns a mock JWT token and admin user profile derived from the provided username.
   * WHY: Enables testing role-gated UI actions (e.g. document deletion, version overwriting) offline.
   *
   * @param username Login identifier.
   * @returns Mock auth token and profile.
   */
  async login(username: string): Promise<{ accessToken: string; user: UserProfile }> {
    return {
      accessToken: 'mock_jwt_token',
      user: {
        id: 'usr-offline',
        username: username.split('@')[0],
        email: username,
        name: username.split('@')[0].replace('.', ' '),
        roles: ['LIBRARY_ADMIN', 'RESEARCHER'],
        realm: 'offline-local-realm',
        authenticatedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Simulates user session termination in offline standalone mode.
   *
   * WHAT: No-op asynchronous completion simulating Keycloak realm logout.
   * WHY: Satisfies the BackendAdapter contract without needing remote HTTP requests in offline mock mode.
   */
  async logout(): Promise<void> {}

  /**
   * Returns a local data URI download link for offline documents.
   *
   * WHAT: Returns `data:text/plain;...`.
   * WHY: Allows document downloads to function locally without a web server.
   *
   * @param guid Document GUID.
   * @returns Data URI download link.
   */
  getDownloadUrl(guid: string): string {
    return `data:text/plain;charset=utf-8,Document%20Asset%20${guid}`;
  }

  /**
   * Returns a mock OpenAPI 3.0 YAML document.
   *
   * WHAT: Returns inline OpenAPI YAML.
   * WHY: Prevents network 404s when viewing OpenAPI documentation offline.
   */
  async getOpenApiSpec(): Promise<string> {
    return `# Offline Engine OpenAPI Spec\nopenapi: 3.0.3\ninfo:\n  title: Mock Engine\n  version: 1.0.0`;
  }

  /**
   * Reports health and status for the standalone offline adapter.
   *
   * WHAT: Returns instant 1ms latency and document count.
   * WHY: Signals to the UI status pill that the client is functioning normally in offline mode.
   *
   * @returns BackendHealthResult.
   */
  async testHealth(): Promise<BackendHealthResult> {
    return {
      ok: true,
      latencyMs: 1,
      message: `Local Standalone Engine active (${this.documents.length} documents stored in localStorage)`
    };
  }
}
