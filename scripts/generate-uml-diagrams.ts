/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * UML Class Diagram Generator for Java and TypeScript Architecture.
 * Generates:
 * 1. Java Backend UML Class Diagram (.puml, .mmd, .drawio, .svg, .png)
 * 2. TypeScript Frontend UML Class Diagram (.puml, .mmd, .drawio, .svg, .png)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// @ts-ignore
import { Resvg } from '@resvg/resvg-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// =============================================================================
// 1. JAVA PLANTUML
// =============================================================================
export function generateJavaPuml(): string {
  return `@startuml Java_Backend_UML_Class_Diagram
!theme plain
skinparam roundCorner 8
skinparam classFontSize 11
skinparam defaultFontName Inter
skinparam packageStyle frame
skinparam classAttributeIconSize 0

title Personal Library - Java Spring Boot Backend Architecture (UML Class Diagram)

package "com.personallibrary.controller" {
  class DocumentController <<RestController>> {
    - documentService: DocumentService
    - extractionService: BibTeXExtractionService
    - summarizationService: AiSummarizationService
    - vectorRagService: VectorRagService
    - storageService: StorageService
    - jsonMapper: JsonMapper
    + getDocuments(fileName, title, author, edition, format, content, page, pageSize, sortBy, sortOrder): ResponseEntity<PaginatedResponse<DocumentResponse>>
    + getDocument(guid: String): ResponseEntity<DocumentResponse>
    + uploadDocument(file: MultipartFile, metadata: String): ResponseEntity<DocumentResponse>
    + extractMetadata(payload: Map<String, String>): ResponseEntity<BibTeXMetadata>
    + overwriteVersion(guid: String, file: MultipartFile, metadata: String): ResponseEntity<DocumentResponse>
    + deleteDocument(guid: String): ResponseEntity<Map<String, Object>>
    + regenerateSummary(guid: String, request: SummarizeRequest): ResponseEntity<SummaryRecord>
    + chatWithDocument(guid: String, request: ChatRequest): ResponseEntity<ChatResponse>
  }

  class AuthController <<RestController>> {
    + getCurrentUserProfile(principal: Principal): ResponseEntity<UserProfileResponse>
    + login(): ResponseEntity<Map<String, String>>
    + logout(): ResponseEntity<Map<String, String>>
  }
}

package "com.personallibrary.service" {
  class DocumentService <<Service>> {
    - documentRepository: DocumentRepository
    - storageService: StorageService
    - extractionService: BibTeXExtractionService
    - summarizationService: AiSummarizationService
    - vectorRagService: VectorRagService
    + uploadDocument(file: MultipartFile, userBibtex: BibTeXMetadata): DocumentResponse
    + overwriteDocument(existingGuid: String, newFile: MultipartFile, updatedBibtex: BibTeXMetadata): DocumentResponse
    + getDocumentByGuid(guid: String): DocumentResponse
    + getEntityByGuid(guid: String): DocumentEntity
    + deleteDocument(guid: String): void
    + searchDocuments(criteria: DocumentQueryCriteria, pageable: Pageable): PaginatedResponse<DocumentResponse>
  }

  class AiSummarizationService <<Service>> {
    - llamaChatClient: ChatClient
    - mistralChatClient: ChatClient
    + generateDualSummaries(title: String, content: String, bibtex: BibTeXMetadata): Map<String, SummaryRecord>
    + generateSummaryForModel(modelKey: String, title: String, content: String, bibtex: BibTeXMetadata): SummaryRecord
  }

  class VectorRagService <<Service>> {
    - vectorStore: VectorStore
    - llamaChatClient: ChatClient
    + indexDocumentChunks(docGuid: String, text: String): List<DocumentChunk>
    + chatWithDocument(docEntity: DocumentEntity, request: ChatRequest): ChatResponse
  }

  class BibTeXExtractionService <<Service>> {
    - chatClient: ChatClient
    - jsonMapper: JsonMapper
    + extractMetadata(fileName: String, sampleContent: String): BibTeXMetadata
  }

  class StorageService <<Service>> {
    - rootLocation: Path
    - tika: Tika
    + storeFile(file: MultipartFile, guid: String): Path
    + extractTextContent(filePath: Path): String
    + deletePhysicalAsset(guid: String): void
  }
}

package "com.personallibrary.repository" {
  interface DocumentRepository <<Repository>> {
    + findByGuid(guid: String): Optional<DocumentEntity>
    + findByPreviousVersionGuid(previousVersionGuid: String): List<DocumentEntity>
  }

  interface DocumentRepositoryCustom {
    + searchDocuments(fileName, title, author, edition, format, content: String, pageable: Pageable): Page<DocumentEntity>
  }

  class DocumentRepositoryCustomImpl {
    - mongoTemplate: MongoTemplate
    + searchDocuments(fileName, title, author, edition, format, content: String, pageable: Pageable): Page<DocumentEntity>
  }

  DocumentRepository --|> DocumentRepositoryCustom
  DocumentRepositoryCustomImpl ..|> DocumentRepositoryCustom
}

package "com.personallibrary.model" {
  class DocumentEntity <<Document>> {
    - id: String
    - guid: String
    - previousVersionGuid: String
    - versionNumber: int
    - fileName: String
    - fileSize: long
    - fileSizeFormatted: String
    - format: String
    - uploadDate: Instant
    - editDate: Instant
    - bibtex: BibTeXMetadata
    - bibtexRaw: String
    - summaries: Map<String, SummaryRecord>
    - contentExcerpt: String
    - fullContent: String
    - chunks: List<DocumentChunk>
    - versionHistory: List<DocumentVersionSnapshot>
  }

  class DocumentVersionSnapshot {
    - snapshotGuid: String
    - versionNumber: int
    - fileName: String
    - fileSize: long
    - fileSizeFormatted: String
    - format: String
    - savedAt: Instant
    - bibtex: BibTeXMetadata
    - bibtexRaw: String
    - summaries: Map<String, SummaryRecord>
    - contentExcerpt: String
    - fullContent: String
    - chunksCount: int
    - note: String
  }

  class BibTeXMetadata {
    - entryType: BibTeXType
    - bibKey: String
    - title: String
    - author: String
    - year: String
    - month: String
    - journal: String
    - booktitle: String
    - volume: String
    - pages: String
    - publisher: String
    - doi: String
    - url: String
    - abstractText: String
    - keywords: String
    + toRawBibTeX(): String
  }

  enum BibTeXType {
    ARTICLE
    BOOK
    INPROCEEDINGS
    TECHREPORT
    PHDTHESIS
    MISC
  }

  class SummaryRecord {
    - modelName: String
    - modelKey: String
    - summaryText: String
    - createdAt: Instant
    - durationSeconds: double
    - durationFormatted: String
  }

  class DocumentChunk {
    - id: String
    - chunkIndex: int
    - text: String
  }

  DocumentEntity *-- BibTeXMetadata
  BibTeXMetadata --> BibTeXType
  DocumentEntity *-- SummaryRecord
  DocumentEntity *-- DocumentChunk
  DocumentEntity *-- DocumentVersionSnapshot
}

package "com.personallibrary.config" {
  class SecurityConfig <<Configuration>> {
    + securityFilterChain(http: HttpSecurity): SecurityFilterChain
    + jwtAuthenticationConverter(): JwtAuthenticationConverter
  }

  class OllamaConfig <<Configuration>> {
    + llamaChatModel(): OllamaChatModel
    + mistralChatModel(): OllamaChatModel
    + llamaChatClient(): ChatClient
    + mistralChatClient(): ChatClient
    + embeddingModel(): EmbeddingModel
  }

  class OpenApiConfig <<Configuration>> {
    + personalLibraryOpenApi(): OpenAPI
  }
}

DocumentController --> DocumentService
DocumentController --> BibTeXExtractionService
DocumentController --> AiSummarizationService
DocumentController --> VectorRagService
DocumentController --> StorageService

DocumentService --> DocumentRepository
DocumentService --> StorageService
DocumentService --> BibTeXExtractionService
DocumentService --> AiSummarizationService
DocumentService --> VectorRagService

DocumentRepository ..> DocumentEntity
@enduml
`;
}

// =============================================================================
// 2. TYPESCRIPT PLANTUML
// =============================================================================
export function generateTypeScriptPuml(): string {
  return `@startuml TypeScript_Frontend_UML_Class_Diagram
!theme plain
skinparam roundCorner 8
skinparam classFontSize 11
skinparam defaultFontName Inter
skinparam packageStyle frame
skinparam classAttributeIconSize 0

title Personal Library - TypeScript Frontend & Gateway Architecture (UML Class Diagram)

package "core (Reactive Micro-Framework)" {
  abstract class Component {
    # root: HTMLElement
    - cleanupFns: Array<() => void>
    + mount(container: HTMLElement): void
    + unmount(): void
    # onMount(): void
    # onUnmount(): void
    # requestRender(): void
    # on(selector: String, event: String, handler: EventListener): void
    # track(cleanup: () => void): void
    # template(): RawHtml
  }

  class "Store<T>" as Store {
    - _state: T
    - listeners: Set<(state: T) => void>
    + state: T
    + set(updater: (state: T) => void): void
    + subscribe(listener: (state: T) => void): () => void
  }

  class "EventBus<T>" as EventBus {
    - handlers: Map<String, Set<Function>>
    + subscribe(event: String, fn: Function): () => void
    + publish(event: String, payload: T): void
    + clear(): void
  }
}

package "stores" {
  class AppStore extends Store {
    + setDocuments(docs: DocumentRecord[]): void
    + setActiveDocument(doc: DocumentRecord): void
    + setFilters(filters: Partial<FilterState>): void
    + setPage(page: number): void
    + openUploadDialog(): void
    + openBpmnModal(): void
    + rollbackDocument(guid: String, targetVersion: number): Promise<void>
  }

  class BackendStore extends Store {
    + setMode(mode: 'rest' | 'mock'): void
    + setHealth(status: 'online' | 'offline'): void
  }

  class ThemeStore extends Store {
    + setTheme(theme: 'sap_horizon' | 'sap_horizon_dark'): void
    + toggleTheme(): void
  }

  class I18nStore extends Store {
    + setLocale(locale: 'en' | 'de' | 'fr' | 'es' | 'ro'): void
    + t(key: String, params?: Object): String
  }
}

package "views (SAP Fiori Horizon)" {
  class AppView extends Component {
    - shellBarView: ShellBarView
    - listReportView: ListReportView
    - objectPageView: ObjectPageView
    - footerView: FooterView
  }

  class ShellBarView extends Component {
    - onSearchInput(query: String): void
    - onThemeToggle(): void
    - onModeSwitch(mode: String): void
  }

  class ListReportView extends Component {
    - renderFilterBar(): RawHtml
    - renderTable(): RawHtml
    - onRowSelect(guid: String): void
    - onSort(column: String): void
  }

  class ObjectPageView extends Component {
    - activeTab: 'info' | 'summaries' | 'chat' | 'history'
    - renderHeader(): RawHtml
    - renderSummaryCards(): RawHtml
    - renderChatDrawer(): RawHtml
    - renderHistoryTab(): RawHtml
    - onSendChatMessage(prompt: String): Promise<void>
    - onRollbackVersion(targetVersion: number): Promise<void>
  }

  abstract class DialogView extends Component {
    # isOpen(): boolean
    # requestClose(): void
    # header(): RawHtml
    # body(): RawHtml
    # footer(): RawHtml
  }

  class UploadDialogView extends DialogView {
    - selectedFiles: File[]
    - uploadProgress: number
    - onDropFiles(e: DragEvent): void
    - onStartIngestion(): Promise<void>
  }

  class BpmnModalView extends DialogView {
    - activeTab: 'diagram' | 'pipeline' | 'xml' | 'deployment'
    - xmlContent: String
    - loadBpmnXml(): Promise<void>
  }

  class BackendSettingsModalView extends DialogView {}
  class AuthModalView extends DialogView {}
  class VersionOverwriteDialogView extends DialogView {}
  class DeleteConfirmDialogView extends DialogView {}

  DialogView --|> Component
  UploadDialogView --|> DialogView
  BpmnModalView --|> DialogView
  BackendSettingsModalView --|> DialogView
  AuthModalView --|> DialogView
  VersionOverwriteDialogView --|> DialogView
  DeleteConfirmDialogView --|> DialogView
}

package "services/backend" {
  class BackendGateway {
    - activeAdapter: BackendAdapter
    + dispatchBackend<T>(op: BackendOperations, payload: any): Promise<T>
    + requestBackend<T>(op: BackendOperations, payload: any): Promise<T>
  }

  interface BackendAdapter {
    + testHealth(): Promise<BackendHealthResult>
    + getDocuments(params: DocumentQueryParams): Promise<DocumentListResult>
    + getDocument(guid: String): Promise<DocumentRecord>
    + uploadDocument(req: DocumentUploadPayload): Promise<DocumentRecord>
    + overwriteVersion(guid: String, req: DocumentUploadPayload): Promise<DocumentRecord>
    + deleteDocument(guid: String): Promise<{success: boolean, message: String}>
    + extractMetadata(fileName: String, sampleContent: String): Promise<BibTeXMetadata>
    + regenerateSummary(guid: String, modelKey: String): Promise<SummaryRecord>
    + chatWithDocument(guid: String, req: ChatRequestPayload): Promise<ChatResponseResult>
    + login(username: String, password: String): Promise<...>
    + logout(): Promise<void>
    + getDownloadUrl(guid: String): String
    + getVersionHistory(guid: String): Promise<DocumentVersionSnapshot[]>
    + rollbackVersion(guid: String, targetVersion: number): Promise<DocumentRecord>
    + getHistoricalDownloadUrl(guid: String, versionNumber: number): String
    + getOpenApiSpec(): Promise<String>
  }

  interface DocumentVersionSnapshot {
    snapshotGuid: String
    versionNumber: number
    fileName: String
    fileSize: number
    fileSizeFormatted: String
    format: String
    savedAt: String
    bibtex: BibTeXMetadata
    summaries: Object
    note?: String
  }

  class RestBackendAdapter implements BackendAdapter {
    - baseUrl: String
    - buildHeaders(): Headers
    - request<T>(path: String, init: RequestInit): Promise<T>
  }

  class MockBackendAdapter implements BackendAdapter {
    - localDatabase: DocumentRecord[]
    - simulateDelay(): Promise<void>
  }

  BackendGateway o-- BackendAdapter
}

AppView *-- ShellBarView
AppView *-- ListReportView
AppView *-- ObjectPageView
ListReportView ..> BackendGateway
ObjectPageView ..> BackendGateway
UploadDialogView ..> BackendGateway

AppView ..> AppStore
ListReportView ..> AppStore
ObjectPageView ..> AppStore
@enduml
`;
}

// =============================================================================
// 3. JAVA MERMAID CLASS DIAGRAM
// =============================================================================
export function generateJavaMermaid(): string {
  return `classDiagram
    direction TB
    
    class DocumentController {
      -DocumentService documentService
      -BibTeXExtractionService extractionService
      -AiSummarizationService summarizationService
      -VectorRagService vectorRagService
      -StorageService storageService
      +getDocuments()
      +getDocument(guid)
      +uploadDocument(file, metadata)
      +extractMetadata(payload)
      +overwriteVersion(guid, file, metadata)
      +deleteDocument(guid)
      +regenerateSummary(guid, request)
      +chatWithDocument(guid, request)
    }

    class DocumentService {
      -DocumentRepository documentRepository
      -StorageService storageService
      -BibTeXExtractionService extractionService
      -AiSummarizationService summarizationService
      -VectorRagService vectorRagService
      +uploadDocument(file, bibtex)
      +overwriteDocument(existingGuid, newFile, bibtex)
      +getDocumentByGuid(guid)
      +getEntityByGuid(guid)
      +deleteDocument(guid)
      +searchDocuments(criteria, pageable)
    }

    class AiSummarizationService {
      -ChatClient llamaChatClient
      -ChatClient mistralChatClient
      +generateDualSummaries(title, content, bibtex)
      +generateSummaryForModel(modelKey, title, content, bibtex)
    }

    class VectorRagService {
      -VectorStore vectorStore
      -ChatClient llamaChatClient
      +indexDocumentChunks(docGuid, text)
      +chatWithDocument(docEntity, request)
    }

    class BibTeXExtractionService {
      -ChatClient chatClient
      -JsonMapper jsonMapper
      +extractMetadata(fileName, sampleContent)
    }

    class StorageService {
      -Path rootLocation
      -Tika tika
      +storeFile(file, guid)
      +extractTextContent(path)
      +deletePhysicalAsset(guid)
    }

    class DocumentRepository {
      <<interface>>
      +findByGuid(guid)
      +findByPreviousVersionGuid(previousVersionGuid)
    }

    class DocumentEntity {
      +String guid
      +String previousVersionGuid
      +int versionNumber
      +String fileName
      +long fileSize
      +String format
      +BibTeXMetadata bibtex
      +Map summaries
      +List chunks
      +List versionHistory
    }

    class DocumentVersionSnapshot {
      +String snapshotGuid
      +int versionNumber
      +String fileName
      +String savedAt
      +BibTeXMetadata bibtex
      +Map summaries
      +String note
    }

    class BibTeXMetadata {
      +BibTeXType entryType
      +String bibKey
      +String title
      +String author
      +String year
      +String publisher
      +toRawBibTeX()
    }

    DocumentController --> DocumentService
    DocumentController --> AiSummarizationService
    DocumentController --> VectorRagService
    DocumentService --> DocumentRepository
    DocumentService --> StorageService
    DocumentService --> BibTeXExtractionService
    DocumentService --> AiSummarizationService
    DocumentService --> VectorRagService
    DocumentRepository ..> DocumentEntity
    DocumentEntity *-- BibTeXMetadata
    DocumentEntity *-- DocumentVersionSnapshot
`;
}

// =============================================================================
// 4. TYPESCRIPT MERMAID CLASS DIAGRAM
// =============================================================================
export function generateTypeScriptMermaid(): string {
  return `classDiagram
    direction TB

    class Component {
      <<abstract>>
      #HTMLElement root
      +mount(container)
      +unmount()
      #requestRender()
      #on(selector, event, handler)
      #template()
    }

    class Store {
      -state T
      +subscribe(fn)
      +set(updater)
    }

    class AppStore {
      +setDocuments(docs)
      +setActiveDocument(doc)
      +setFilters(filters)
      +setPage(page)
      +rollbackDocument(guid, version)
    }

    class ListReportView {
      -renderFilterBar()
      -renderTable()
      -onRowSelect(guid)
    }

    class ObjectPageView {
      -renderHeader()
      -renderSummaryCards()
      -renderChatDrawer()
      -renderHistoryTab()
      -onSendChatMessage(prompt)
      -onRollbackVersion(version)
    }

    class DialogView {
      <<abstract>>
      #isOpen()
      #requestClose()
      #header()
      #body()
    }

    class UploadDialogView {
      -onDropFiles(event)
      -onStartIngestion()
    }

    class BackendGateway {
      -BackendAdapter activeAdapter
      +dispatchBackend(op, payload)
      +requestBackend(op, payload)
    }

    class BackendAdapter {
      <<interface>>
      +getDocuments(params)
      +getDocument(guid)
      +uploadDocument(payload)
      +overwriteVersion(guid, payload)
      +extractMetadata(fileName, content)
      +regenerateSummary(guid, modelKey)
      +chatWithDocument(guid, payload)
      +getVersionHistory(guid)
      +rollbackVersion(guid, version)
    }

    class RestBackendAdapter {
      -String baseUrl
      +getDocuments(params)
      +uploadDocument(payload)
      +getVersionHistory(guid)
      +rollbackVersion(guid, version)
    }

    class MockBackendAdapter {
      -DocumentRecord[] localDatabase
      +getDocuments(params)
      +uploadDocument(payload)
      +getVersionHistory(guid)
      +rollbackVersion(guid, version)
    }

    class DocumentVersionSnapshot {
      +String snapshotGuid
      +number versionNumber
      +String fileName
      +String savedAt
    }

    Component <|-- ListReportView
    Component <|-- ObjectPageView
    Component <|-- DialogView
    DialogView <|-- UploadDialogView
    Store <|-- AppStore
    BackendAdapter <|.. RestBackendAdapter
    BackendAdapter <|.. MockBackendAdapter
    BackendGateway o-- BackendAdapter
    ListReportView ..> BackendGateway
    ObjectPageView ..> BackendGateway
`;
}

// =============================================================================
// 5. VECTOR SVG RENDERING ENGINES
// =============================================================================
export function generateJavaUmlSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1100" width="1600" height="1100" style="background:#0f172a; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <linearGradient id="java-card-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
    <marker id="uml-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" />
    </marker>
    <marker id="uml-arrow-amber" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#f59e0b" />
    </marker>
    <marker id="uml-arrow-purple" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#c084fc" />
    </marker>
    <marker id="uml-inherits" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <polygon points="0,1.5 10,5 0,8.5" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5" />
    </marker>
    <filter id="box-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000000" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Title -->
  <rect x="30" y="20" width="1540" height="65" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
  <text x="50" y="52" font-size="20" font-weight="800" fill="#f8fafc">Java Spring Boot 4 Backend — UML Class Diagram</text>
  <text x="50" y="72" font-size="12" font-weight="500" fill="#94a3b8">Spring Boot 4.1.1 • Spring AI 2.0.1 Dual Models (Llama 3.3 &amp; Mistral) • MongoDB Repository • Qdrant Vector Retrieval</text>

  <!-- Package: Controller -->
  <rect x="30" y="105" width="750" height="340" rx="8" fill="#1e293b" fill-opacity="0.4" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="45" y="125" font-size="12" font-weight="700" fill="#60a5fa">PACKAGE: com.personallibrary.controller</text>

  <!-- DocumentController Class Box -->
  <g filter="url(#box-shadow)">
    <rect x="45" y="135" width="720" height="295" rx="6" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5" />
    <rect x="45" y="135" width="720" height="32" rx="6" fill="#1e3a8a" />
    <text x="405" y="148" font-size="10" font-style="italic" fill="#bfdbfe" text-anchor="middle">&lt;&lt;RestController&gt;&gt;</text>
    <text x="405" y="161" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">DocumentController</text>

    <!-- Attributes -->
    <line x1="45" y1="167" x2="765" y2="167" stroke="#3b82f6" stroke-width="1" />
    <text x="55" y="182" font-size="10" font-family="monospace" fill="#94a3b8">- documentService: DocumentService</text>
    <text x="55" y="196" font-size="10" font-family="monospace" fill="#94a3b8">- extractionService: BibTeXExtractionService</text>
    <text x="55" y="210" font-size="10" font-family="monospace" fill="#94a3b8">- summarizationService: AiSummarizationService</text>
    <text x="55" y="224" font-size="10" font-family="monospace" fill="#94a3b8">- vectorRagService: VectorRagService</text>
    <text x="55" y="238" font-size="10" font-family="monospace" fill="#94a3b8">- storageService: StorageService</text>

    <!-- Operations -->
    <line x1="45" y1="246" x2="765" y2="246" stroke="#3b82f6" stroke-width="1" />
    <text x="55" y="262" font-size="10" font-family="monospace" fill="#e2e8f0">+ getDocuments(fileName, title, author, edition, format, content, page, pageSize, sortBy, sortOrder): ResponseEntity&lt;PaginatedResponse&gt;</text>
    <text x="55" y="278" font-size="10" font-family="monospace" fill="#e2e8f0">+ getDocument(guid: String): ResponseEntity&lt;DocumentResponse&gt;</text>
    <text x="55" y="294" font-size="10" font-family="monospace" fill="#e2e8f0">+ uploadDocument(file: MultipartFile, metadataJson: String): ResponseEntity&lt;DocumentResponse&gt;</text>
    <text x="55" y="310" font-size="10" font-family="monospace" fill="#e2e8f0">+ overwriteDocumentVersion(guid: String, file: MultipartFile, metadata: String): ResponseEntity&lt;DocumentResponse&gt;</text>
    <text x="55" y="326" font-size="10" font-family="monospace" fill="#e2e8f0">+ extractMetadata(payload: Map&lt;String, String&gt;): ResponseEntity&lt;BibTeXMetadata&gt;</text>
    <text x="55" y="342" font-size="10" font-family="monospace" fill="#e2e8f0">+ deleteDocument(guid: String): ResponseEntity&lt;Map&lt;String, Object&gt;&gt;</text>
    <text x="55" y="358" font-size="10" font-family="monospace" fill="#e2e8f0">+ regenerateSummary(guid: String, request: SummarizeRequest): ResponseEntity&lt;SummaryRecord&gt;</text>
    <text x="55" y="374" font-size="10" font-family="monospace" fill="#e2e8f0">+ chatWithDocument(guid: String, request: ChatRequest): ResponseEntity&lt;ChatResponse&gt;</text>
  </g>

  <!-- Package: Service -->
  <rect x="815" y="105" width="755" height="520" rx="8" fill="#1e293b" fill-opacity="0.4" stroke="#10b981" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="830" y="125" font-size="12" font-weight="700" fill="#34d399">PACKAGE: com.personallibrary.service</text>

  <!-- DocumentService Class Box -->
  <g filter="url(#box-shadow)">
    <rect x="830" y="135" width="725" height="190" rx="6" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
    <rect x="830" y="135" width="725" height="30" rx="6" fill="#064e3b" />
    <text x="1192" y="147" font-size="10" font-style="italic" fill="#a7f3d0" text-anchor="middle">&lt;&lt;Service&gt;&gt;</text>
    <text x="1192" y="159" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">DocumentService</text>
    <line x1="830" y1="165" x2="1555" y2="165" stroke="#10b981" stroke-width="1" />
    <text x="840" y="180" font-size="10" font-family="monospace" fill="#94a3b8">- documentRepository: DocumentRepository</text>
    <text x="840" y="194" font-size="10" font-family="monospace" fill="#94a3b8">- storageService: StorageService</text>
    <text x="840" y="208" font-size="10" font-family="monospace" fill="#94a3b8">- extractionService: BibTeXExtractionService</text>
    <text x="840" y="222" font-size="10" font-family="monospace" fill="#94a3b8">- summarizationService: AiSummarizationService</text>
    <text x="840" y="236" font-size="10" font-family="monospace" fill="#94a3b8">- vectorRagService: VectorRagService</text>
    <line x1="830" y1="244" x2="1555" y2="244" stroke="#10b981" stroke-width="1" />
    <text x="840" y="260" font-size="10" font-family="monospace" fill="#e2e8f0">+ uploadDocument(file: MultipartFile, userBibtex: BibTeXMetadata): DocumentResponse</text>
    <text x="840" y="276" font-size="10" font-family="monospace" fill="#e2e8f0">+ overwriteDocument(existingGuid: String, newFile: MultipartFile, updatedBibtex: BibTeXMetadata): DocumentResponse</text>
    <text x="840" y="292" font-size="10" font-family="monospace" fill="#e2e8f0">+ searchDocuments(criteria: DocumentQueryCriteria, pageable: Pageable): PaginatedResponse&lt;DocumentResponse&gt;</text>
    <text x="840" y="308" font-size="10" font-family="monospace" fill="#e2e8f0">+ getDocumentByGuid(guid: String): DocumentResponse</text>
  </g>

  <!-- AiSummarizationService -->
  <g filter="url(#box-shadow)">
    <rect x="830" y="340" width="350" height="135" rx="6" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
    <rect x="830" y="340" width="350" height="28" rx="6" fill="#064e3b" />
    <text x="1005" y="358" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">AiSummarizationService</text>
    <line x1="830" y1="368" x2="1180" y2="368" stroke="#10b981" stroke-width="1" />
    <text x="840" y="384" font-size="10" font-family="monospace" fill="#94a3b8">- llamaChatClient: ChatClient</text>
    <text x="840" y="398" font-size="10" font-family="monospace" fill="#94a3b8">- mistralChatClient: ChatClient</text>
    <line x1="830" y1="406" x2="1180" y2="406" stroke="#10b981" stroke-width="1" />
    <text x="840" y="422" font-size="9.5" font-family="monospace" fill="#e2e8f0">+ generateDualSummaries(title, text, bibtex): Map</text>
    <text x="840" y="438" font-size="9.5" font-family="monospace" fill="#e2e8f0">+ generateSummaryForModel(modelKey, title, text, bibtex): SummaryRecord</text>
  </g>

  <!-- VectorRagService -->
  <g filter="url(#box-shadow)">
    <rect x="1195" y="340" width="360" height="135" rx="6" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
    <rect x="1195" y="340" width="360" height="28" rx="6" fill="#064e3b" />
    <text x="1375" y="358" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">VectorRagService</text>
    <line x1="1195" y1="368" x2="1555" y2="368" stroke="#10b981" stroke-width="1" />
    <text x="1205" y="384" font-size="10" font-family="monospace" fill="#94a3b8">- vectorStore: VectorStore</text>
    <text x="1205" y="398" font-size="10" font-family="monospace" fill="#94a3b8">- llamaChatClient: ChatClient</text>
    <line x1="1195" y1="406" x2="1555" y2="406" stroke="#10b981" stroke-width="1" />
    <text x="1205" y="422" font-size="9.5" font-family="monospace" fill="#e2e8f0">+ indexDocumentChunks(docGuid, text): List&lt;Chunk&gt;</text>
    <text x="1205" y="438" font-size="9.5" font-family="monospace" fill="#e2e8f0">+ chatWithDocument(docEntity, request): ChatResponse</text>
  </g>

  <!-- BibTeXExtractionService & StorageService -->
  <g filter="url(#box-shadow)">
    <rect x="830" y="490" width="350" height="120" rx="6" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
    <rect x="830" y="490" width="350" height="26" rx="6" fill="#064e3b" />
    <text x="1005" y="508" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">BibTeXExtractionService</text>
    <line x1="830" y1="516" x2="1180" y2="516" stroke="#10b981" stroke-width="1" />
    <text x="840" y="534" font-size="9.5" font-family="monospace" fill="#e2e8f0">+ extractMetadata(fileName, sampleContent): BibTeXMetadata</text>
  </g>

  <g filter="url(#box-shadow)">
    <rect x="1195" y="490" width="360" height="120" rx="6" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
    <rect x="1195" y="490" width="360" height="26" rx="6" fill="#064e3b" />
    <text x="1375" y="508" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">StorageService</text>
    <line x1="1195" y1="516" x2="1555" y2="516" stroke="#10b981" stroke-width="1" />
    <text x="1205" y="534" font-size="9.5" font-family="monospace" fill="#e2e8f0">+ storeFile(file: MultipartFile, guid: String): Path</text>
    <text x="1205" y="552" font-size="9.5" font-family="monospace" fill="#e2e8f0">+ extractTextContent(path: Path): String</text>
    <text x="1205" y="570" font-size="9.5" font-family="monospace" fill="#e2e8f0">+ deletePhysicalAsset(guid): void</text>
  </g>

  <!-- Package: Repository -->
  <rect x="30" y="465" width="750" height="180" rx="8" fill="#1e293b" fill-opacity="0.4" stroke="#f59e0b" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="45" y="485" font-size="12" font-weight="700" fill="#fbbf24">PACKAGE: com.personallibrary.repository</text>

  <!-- DocumentRepository Interface -->
  <g filter="url(#box-shadow)">
    <rect x="45" y="495" width="350" height="135" rx="6" fill="#1e293b" stroke="#f59e0b" stroke-width="1.5" />
    <rect x="45" y="495" width="350" height="30" rx="6" fill="#78350f" />
    <text x="220" y="507" font-size="9.5" font-style="italic" fill="#fde68a" text-anchor="middle">&lt;&lt;interface&gt;&gt;</text>
    <text x="220" y="520" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">DocumentRepository</text>
    <line x1="45" y1="525" x2="395" y2="525" stroke="#f59e0b" stroke-width="1" />
    <text x="55" y="542" font-size="10" font-family="monospace" fill="#e2e8f0">+ findByGuid(guid: String): Optional&lt;DocumentEntity&gt;</text>
    <text x="55" y="560" font-size="10" font-family="monospace" fill="#e2e8f0">+ findByPreviousVersionGuid(guid): List&lt;DocumentEntity&gt;</text>
  </g>

  <!-- DocumentRepositoryCustomImpl -->
  <g filter="url(#box-shadow)">
    <rect x="415" y="495" width="350" height="135" rx="6" fill="#1e293b" stroke="#f59e0b" stroke-width="1.5" />
    <rect x="415" y="495" width="350" height="30" rx="6" fill="#78350f" />
    <text x="590" y="507" font-size="9.5" font-style="italic" fill="#fde68a" text-anchor="middle">&lt;&lt;CustomMongoRepository&gt;&gt;</text>
    <text x="590" y="520" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">DocumentRepositoryCustomImpl</text>
    <line x1="415" y1="525" x2="765" y2="525" stroke="#f59e0b" stroke-width="1" />
    <text x="425" y="542" font-size="10" font-family="monospace" fill="#94a3b8">- mongoTemplate: MongoTemplate</text>
    <line x1="415" y1="550" x2="765" y2="550" stroke="#f59e0b" stroke-width="1" />
    <text x="425" y="568" font-size="10" font-family="monospace" fill="#e2e8f0">+ searchDocuments(fileName, title, author, edition, format, content, pageable): Page&lt;DocumentEntity&gt;</text>
  </g>

  <!-- Package: Model -->
  <rect x="30" y="665" width="1540" height="400" rx="8" fill="#1e293b" fill-opacity="0.4" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="45" y="685" font-size="12" font-weight="700" fill="#c084fc">PACKAGE: com.personallibrary.model</text>

  <!-- DocumentEntity Class Box -->
  <g filter="url(#box-shadow)">
    <rect x="45" y="695" width="450" height="350" rx="6" fill="#1e293b" stroke="#a855f7" stroke-width="1.5" />
    <rect x="45" y="695" width="450" height="30" rx="6" fill="#581c87" />
    <text x="270" y="707" font-size="9.5" font-style="italic" fill="#e9d5ff" text-anchor="middle">&lt;&lt;Document (collection="documents")&gt;&gt;</text>
    <text x="270" y="720" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">DocumentEntity</text>
    <line x1="45" y1="725" x2="495" y2="725" stroke="#a855f7" stroke-width="1" />
    <text x="55" y="742" font-size="10" font-family="monospace" fill="#94a3b8">- id: String</text>
    <text x="55" y="758" font-size="10" font-family="monospace" fill="#94a3b8">- guid: String</text>
    <text x="55" y="774" font-size="10" font-family="monospace" fill="#94a3b8">- previousVersionGuid: String</text>
    <text x="55" y="790" font-size="10" font-family="monospace" fill="#94a3b8">- versionNumber: int</text>
    <text x="55" y="806" font-size="10" font-family="monospace" fill="#94a3b8">- fileName: String</text>
    <text x="55" y="822" font-size="10" font-family="monospace" fill="#94a3b8">- fileSize: long</text>
    <text x="55" y="838" font-size="10" font-family="monospace" fill="#94a3b8">- fileSizeFormatted: String</text>
    <text x="55" y="854" font-size="10" font-family="monospace" fill="#94a3b8">- format: String</text>
    <text x="55" y="870" font-size="10" font-family="monospace" fill="#94a3b8">- uploadDate: Instant</text>
    <text x="55" y="886" font-size="10" font-family="monospace" fill="#94a3b8">- editDate: Instant</text>
    <text x="55" y="902" font-size="10" font-family="monospace" fill="#94a3b8">- bibtex: BibTeXMetadata</text>
    <text x="55" y="918" font-size="10" font-family="monospace" fill="#94a3b8">- bibtexRaw: String</text>
    <text x="55" y="934" font-size="10" font-family="monospace" fill="#94a3b8">- summaries: Map&lt;String, SummaryRecord&gt;</text>
    <text x="55" y="950" font-size="10" font-family="monospace" fill="#94a3b8">- contentExcerpt: String</text>
    <text x="55" y="966" font-size="10" font-family="monospace" fill="#94a3b8">- fullContent: String</text>
    <text x="55" y="982" font-size="10" font-family="monospace" fill="#94a3b8">- chunks: List&lt;DocumentChunk&gt;</text>
    <text x="55" y="998" font-size="10" font-family="monospace" fill="#94a3b8">- versionHistory: List&lt;DocumentVersionSnapshot&gt;</text>
  </g>

  <!-- BibTeXMetadata Class Box -->
  <g filter="url(#box-shadow)">
    <rect x="525" y="695" width="400" height="350" rx="6" fill="#1e293b" stroke="#a855f7" stroke-width="1.5" />
    <rect x="525" y="695" width="400" height="30" rx="6" fill="#581c87" />
    <text x="725" y="707" font-size="9.5" font-style="italic" fill="#e9d5ff" text-anchor="middle">&lt;&lt;ValueObject&gt;&gt;</text>
    <text x="725" y="720" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">BibTeXMetadata</text>
    <line x1="525" y1="725" x2="925" y2="725" stroke="#a855f7" stroke-width="1" />
    <text x="535" y="742" font-size="10" font-family="monospace" fill="#94a3b8">- entryType: BibTeXType</text>
    <text x="535" y="758" font-size="10" font-family="monospace" fill="#94a3b8">- bibKey: String</text>
    <text x="535" y="774" font-size="10" font-family="monospace" fill="#94a3b8">- title: String</text>
    <text x="535" y="790" font-size="10" font-family="monospace" fill="#94a3b8">- author: String</text>
    <text x="535" y="806" font-size="10" font-family="monospace" fill="#94a3b8">- year: String</text>
    <text x="535" y="822" font-size="10" font-family="monospace" fill="#94a3b8">- journal: String</text>
    <text x="535" y="838" font-size="10" font-family="monospace" fill="#94a3b8">- booktitle: String</text>
    <text x="535" y="854" font-size="10" font-family="monospace" fill="#94a3b8">- volume: String</text>
    <text x="535" y="870" font-size="10" font-family="monospace" fill="#94a3b8">- publisher: String</text>
    <text x="535" y="886" font-size="10" font-family="monospace" fill="#94a3b8">- doi: String</text>
    <text x="535" y="902" font-size="10" font-family="monospace" fill="#94a3b8">- keywords: String</text>
    <line x1="525" y1="915" x2="925" y2="915" stroke="#a855f7" stroke-width="1" />
    <text x="535" y="934" font-size="10" font-family="monospace" fill="#e2e8f0">+ toRawBibTeX(): String</text>
    <text x="535" y="952" font-size="10" font-family="monospace" fill="#e2e8f0">+ validateMandatoryFields(): boolean</text>
  </g>

  <!-- SummaryRecord & DocumentChunk -->
  <g filter="url(#box-shadow)">
    <rect x="955" y="695" width="310" height="190" rx="6" fill="#1e293b" stroke="#a855f7" stroke-width="1.5" />
    <rect x="955" y="695" width="310" height="28" rx="6" fill="#581c87" />
    <text x="1110" y="714" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">SummaryRecord</text>
    <line x1="955" y1="723" x2="1265" y2="723" stroke="#a855f7" stroke-width="1" />
    <text x="965" y="742" font-size="10" font-family="monospace" fill="#94a3b8">- modelName: String</text>
    <text x="965" y="758" font-size="10" font-family="monospace" fill="#94a3b8">- modelKey: String</text>
    <text x="965" y="774" font-size="10" font-family="monospace" fill="#94a3b8">- summaryText: String</text>
    <text x="965" y="790" font-size="10" font-family="monospace" fill="#94a3b8">- createdAt: Instant</text>
    <text x="965" y="806" font-size="10" font-family="monospace" fill="#94a3b8">- durationSeconds: double</text>
    <text x="965" y="822" font-size="10" font-family="monospace" fill="#94a3b8">- durationFormatted: String</text>
  </g>

  <g filter="url(#box-shadow)">
    <rect x="1285" y="695" width="270" height="190" rx="6" fill="#1e293b" stroke="#a855f7" stroke-width="1.5" />
    <rect x="1285" y="695" width="270" height="28" rx="6" fill="#581c87" />
    <text x="1420" y="714" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">DocumentChunk</text>
    <line x1="1285" y1="723" x2="1555" y2="723" stroke="#a855f7" stroke-width="1" />
    <text x="1295" y="742" font-size="10" font-family="monospace" fill="#94a3b8">- id: String</text>
    <text x="1295" y="760" font-size="10" font-family="monospace" fill="#94a3b8">- chunkIndex: int</text>
    <text x="1295" y="778" font-size="10" font-family="monospace" fill="#94a3b8">- text: String</text>
    <text x="1295" y="802" font-size="10" font-family="monospace" fill="#94a3b8">- embeddingVector: float[]</text>
  </g>

  <!-- BibTeXType Enum -->
  <g filter="url(#box-shadow)">
    <rect x="955" y="900" width="310" height="145" rx="6" fill="#1e293b" stroke="#a855f7" stroke-width="1.5" />
    <rect x="955" y="900" width="310" height="26" rx="6" fill="#581c87" />
    <text x="1110" y="918" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">&lt;&lt;enum&gt;&gt; BibTeXType</text>
    <line x1="955" y1="926" x2="1265" y2="926" stroke="#a855f7" stroke-width="1" />
    <text x="965" y="944" font-size="10" font-family="monospace" fill="#e9d5ff">ARTICLE, BOOK, INPROCEEDINGS</text>
    <text x="965" y="962" font-size="10" font-family="monospace" fill="#e9d5ff">TECHREPORT, PHDTHESIS, MISC</text>
  </g>

  <!-- Connecting Lines (Strict 90-degree perpendicular routing, avoiding box occlusions) -->
  <!-- Controller to Service (Horizontal 90-degree entry into DocumentService left wall) -->
  <path d="M 765 240 L 830 240" fill="none" stroke="#38bdf8" stroke-width="2" marker-end="url(#uml-arrow)" />
  <rect x="775" y="228" width="45" height="18" rx="3" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
  <text x="797" y="240" font-size="9" font-weight="700" fill="#38bdf8" text-anchor="middle">calls</text>

  <!-- Service to Custom Repository (Leaves left wall, descends inter-column gap, enters top border perpendicularly) -->
  <path d="M 830 310 L 795 310 L 795 465 L 590 465 L 590 495" fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#uml-arrow-amber)" />
  <rect x="670" y="456" width="105" height="18" rx="3" fill="#0f172a" stroke="#f59e0b" stroke-width="1" />
  <text x="722" y="468" font-size="9" font-weight="700" fill="#f59e0b" text-anchor="middle">persists / queries</text>

  <!-- Custom Repository to MongoRepository (Horizontal 90-degree entry into right wall) -->
  <path d="M 415 560 L 395 560" fill="none" stroke="#f59e0b" stroke-width="2" marker-end="url(#uml-arrow-amber)" />

  <!-- Entity to BibTeX (Horizontal 90-degree entry into left wall) -->
  <path d="M 495 780 L 525 780" fill="none" stroke="#c084fc" stroke-width="2" marker-end="url(#uml-arrow-purple)" />

  <!-- Entity to Summary (Routes cleanly below BibTeX box, enters bottom border perpendicularly) -->
  <path d="M 495 850 L 510 850 L 510 1065 L 1110 1065 L 1110 885" fill="none" stroke="#c084fc" stroke-width="2" marker-end="url(#uml-arrow-purple)" />
</svg>`;
}

export function generateTypeScriptUmlSvg(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1100" width="1600" height="1100" style="background:#0f172a; font-family:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <marker id="ts-arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" />
    </marker>
    <marker id="ts-arrow-purple" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#a855f7" />
    </marker>
    <marker id="ts-inherits" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto">
      <polygon points="0,1.5 10,5 0,8.5" fill="#ffffff" stroke="#94a3b8" stroke-width="1.5" />
    </marker>
    <filter id="box-shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#000000" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Title -->
  <rect x="30" y="20" width="1540" height="65" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1.5" />
  <text x="50" y="52" font-size="20" font-weight="800" fill="#f8fafc">TypeScript Frontend &amp; Gateway — UML Class Diagram</text>
  <text x="50" y="72" font-size="12" font-weight="500" fill="#94a3b8">UI5 Web Component Hierarchy • Observable Reactive Store • BackendGateway Driver Adapter Pattern</text>

  <!-- Package: core -->
  <rect x="30" y="105" width="480" height="420" rx="8" fill="#1e293b" fill-opacity="0.4" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="45" y="125" font-size="12" font-weight="700" fill="#60a5fa">PACKAGE: core (Reactive Micro-Framework)</text>

  <!-- Component Class Box -->
  <g filter="url(#box-shadow)">
    <rect x="45" y="135" width="450" height="210" rx="6" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5" />
    <rect x="45" y="135" width="450" height="30" rx="6" fill="#1e3a8a" />
    <text x="270" y="147" font-size="10" font-style="italic" fill="#bfdbfe" text-anchor="middle">&lt;&lt;abstract&gt;&gt;</text>
    <text x="270" y="160" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">Component</text>
    <line x1="45" y1="165" x2="495" y2="165" stroke="#3b82f6" stroke-width="1" />
    <text x="55" y="182" font-size="10" font-family="monospace" fill="#94a3b8"># root: HTMLElement</text>
    <text x="55" y="196" font-size="10" font-family="monospace" fill="#94a3b8">- cleanupFns: Array&lt;() =&gt; void&gt;</text>
    <line x1="45" y1="204" x2="495" y2="204" stroke="#3b82f6" stroke-width="1" />
    <text x="55" y="220" font-size="10" font-family="monospace" fill="#e2e8f0">+ mount(container: HTMLElement): void</text>
    <text x="55" y="236" font-size="10" font-family="monospace" fill="#e2e8f0">+ unmount(): void</text>
    <text x="55" y="252" font-size="10" font-family="monospace" fill="#e2e8f0"># requestRender(): void</text>
    <text x="55" y="268" font-size="10" font-family="monospace" fill="#e2e8f0"># on(selector, event, handler): void</text>
    <text x="55" y="284" font-size="10" font-family="monospace" fill="#e2e8f0"># track(cleanup: () =&gt; void): void</text>
    <text x="55" y="300" font-size="10" font-family="monospace" fill="#e2e8f0"># template(): RawHtml</text>
  </g>

  <!-- Store<T> Box -->
  <g filter="url(#box-shadow)">
    <rect x="45" y="360" width="450" height="150" rx="6" fill="#1e293b" stroke="#3b82f6" stroke-width="1.5" />
    <rect x="45" y="360" width="450" height="28" rx="6" fill="#1e3a8a" />
    <text x="270" y="378" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">Store&lt;T&gt; (Observable)</text>
    <line x1="45" y1="388" x2="495" y2="388" stroke="#3b82f6" stroke-width="1" />
    <text x="55" y="404" font-size="10" font-family="monospace" fill="#94a3b8">- _state: T</text>
    <text x="55" y="418" font-size="10" font-family="monospace" fill="#94a3b8">- listeners: Set&lt;(state: T) =&gt; void&gt;</text>
    <line x1="45" y1="426" x2="495" y2="426" stroke="#3b82f6" stroke-width="1" />
    <text x="55" y="442" font-size="10" font-family="monospace" fill="#e2e8f0">+ state: T</text>
    <text x="55" y="458" font-size="10" font-family="monospace" fill="#e2e8f0">+ set(updater: (state: T) =&gt; void): void</text>
    <text x="55" y="474" font-size="10" font-family="monospace" fill="#e2e8f0">+ subscribe(listener): () =&gt; void</text>
  </g>

  <!-- Package: Views & Dialogs -->
  <rect x="540" y="105" width="1030" height="420" rx="8" fill="#1e293b" fill-opacity="0.4" stroke="#10b981" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="555" y="125" font-size="12" font-weight="700" fill="#34d399">PACKAGE: views &amp; dialogs (SAP Fiori Horizon UI5)</text>

  <!-- ListReportView Box -->
  <g filter="url(#box-shadow)">
    <rect x="555" y="135" width="310" height="170" rx="6" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
    <rect x="555" y="135" width="310" height="28" rx="6" fill="#064e3b" />
    <text x="710" y="153" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">ListReportView</text>
    <line x1="555" y1="163" x2="865" y2="163" stroke="#10b981" stroke-width="1" />
    <text x="565" y="180" font-size="10" font-family="monospace" fill="#e2e8f0">+ renderFilterBar(): RawHtml</text>
    <text x="565" y="198" font-size="10" font-family="monospace" fill="#e2e8f0">+ renderTable(): RawHtml</text>
    <text x="565" y="216" font-size="10" font-family="monospace" fill="#e2e8f0">- onRowSelect(guid: String): void</text>
    <text x="565" y="234" font-size="10" font-family="monospace" fill="#e2e8f0">- onSort(column: String): void</text>
    <text x="565" y="252" font-size="10" font-family="monospace" fill="#e2e8f0">- onSearchChange(term): void</text>
  </g>

  <!-- ObjectPageView Box -->
  <g filter="url(#box-shadow)">
    <rect x="885" y="135" width="330" height="170" rx="6" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
    <rect x="885" y="135" width="330" height="28" rx="6" fill="#064e3b" />
    <text x="1050" y="153" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">ObjectPageView</text>
    <line x1="885" y1="163" x2="1215" y2="163" stroke="#10b981" stroke-width="1" />
    <text x="895" y="180" font-size="10" font-family="monospace" fill="#e2e8f0">+ renderHeader(): RawHtml</text>
    <text x="895" y="198" font-size="10" font-family="monospace" fill="#e2e8f0">+ renderSummaryCards(): RawHtml</text>
    <text x="895" y="216" font-size="10" font-family="monospace" fill="#e2e8f0">+ renderChatDrawer(): RawHtml</text>
    <text x="895" y="234" font-size="10" font-family="monospace" fill="#e2e8f0">+ renderHistoryTab(): RawHtml</text>
    <text x="895" y="252" font-size="10" font-family="monospace" fill="#e2e8f0">- onRollbackVersion(v): Promise</text>
  </g>

  <!-- DialogView Base Box -->
  <g filter="url(#box-shadow)">
    <rect x="1235" y="135" width="320" height="170" rx="6" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
    <rect x="1235" y="135" width="320" height="28" rx="6" fill="#064e3b" />
    <text x="1395" y="147" font-size="9" font-style="italic" fill="#a7f3d0" text-anchor="middle">&lt;&lt;abstract&gt;&gt;</text>
    <text x="1395" y="159" font-size="12" font-weight="700" fill="#ffffff" text-anchor="middle">DialogView</text>
    <line x1="1235" y1="163" x2="1555" y2="163" stroke="#10b981" stroke-width="1" />
    <text x="1245" y="180" font-size="10" font-family="monospace" fill="#e2e8f0"># isOpen(): boolean</text>
    <text x="1245" y="198" font-size="10" font-family="monospace" fill="#e2e8f0"># requestClose(): void</text>
    <text x="1245" y="216" font-size="10" font-family="monospace" fill="#e2e8f0"># header(): RawHtml</text>
    <text x="1245" y="234" font-size="10" font-family="monospace" fill="#e2e8f0"># body(): RawHtml</text>
    <text x="1245" y="252" font-size="10" font-family="monospace" fill="#e2e8f0"># footer(): RawHtml</text>
  </g>

  <!-- Concrete Dialogs -->
  <g filter="url(#box-shadow)">
    <rect x="555" y="330" width="235" height="170" rx="6" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
    <rect x="555" y="330" width="235" height="24" rx="6" fill="#064e3b" />
    <text x="672" y="347" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">UploadDialogView</text>
    <line x1="555" y1="354" x2="790" y2="354" stroke="#10b981" stroke-width="1" />
    <text x="565" y="372" font-size="9.5" font-family="monospace" fill="#94a3b8">- selectedFiles: File[]</text>
    <text x="565" y="390" font-size="9.5" font-family="monospace" fill="#94a3b8">- progress: number</text>
    <line x1="555" y1="400" x2="790" y2="400" stroke="#10b981" stroke-width="1" />
    <text x="565" y="418" font-size="9.5" font-family="monospace" fill="#e2e8f0">+ onDropFiles(e)</text>
    <text x="565" y="436" font-size="9.5" font-family="monospace" fill="#e2e8f0">+ onStartIngestion()</text>
  </g>

  <g filter="url(#box-shadow)">
    <rect x="810" y="330" width="235" height="170" rx="6" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
    <rect x="810" y="330" width="235" height="24" rx="6" fill="#064e3b" />
    <text x="927" y="347" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">BpmnModalView</text>
    <line x1="810" y1="354" x2="1045" y2="354" stroke="#10b981" stroke-width="1" />
    <text x="820" y="372" font-size="9.5" font-family="monospace" fill="#94a3b8">- activeTab: BpmnTab</text>
    <text x="820" y="390" font-size="9.5" font-family="monospace" fill="#94a3b8">- xmlContent: String</text>
    <line x1="810" y1="400" x2="1045" y2="400" stroke="#10b981" stroke-width="1" />
    <text x="820" y="418" font-size="9.5" font-family="monospace" fill="#e2e8f0">+ switchTab(tab)</text>
    <text x="820" y="436" font-size="9.5" font-family="monospace" fill="#e2e8f0">+ copyXml()</text>
  </g>

  <g filter="url(#box-shadow)">
    <rect x="1065" y="330" width="235" height="170" rx="6" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
    <rect x="1065" y="330" width="235" height="24" rx="6" fill="#064e3b" />
    <text x="1182" y="347" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">BackendSettingsModal</text>
    <line x1="1065" y1="354" x2="1300" y2="354" stroke="#10b981" stroke-width="1" />
    <text x="1075" y="372" font-size="9.5" font-family="monospace" fill="#94a3b8">- currentMode: 'rest'|'mock'</text>
    <line x1="1065" y1="384" x2="1300" y2="384" stroke="#10b981" stroke-width="1" />
    <text x="1075" y="402" font-size="9.5" font-family="monospace" fill="#e2e8f0">+ onSwitchDriver(mode)</text>
    <text x="1075" y="420" font-size="9.5" font-family="monospace" fill="#e2e8f0">+ testConnection()</text>
  </g>

  <g filter="url(#box-shadow)">
    <rect x="1320" y="330" width="235" height="170" rx="6" fill="#1e293b" stroke="#10b981" stroke-width="1.5" />
    <rect x="1320" y="330" width="235" height="24" rx="6" fill="#064e3b" />
    <text x="1437" y="347" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle">AuthModalView</text>
    <line x1="1320" y1="354" x2="1555" y2="354" stroke="#10b981" stroke-width="1" />
    <text x="1330" y="372" font-size="9.5" font-family="monospace" fill="#94a3b8">- userProfile: UserProfile</text>
    <line x1="1320" y1="384" x2="1555" y2="384" stroke="#10b981" stroke-width="1" />
    <text x="1330" y="402" font-size="9.5" font-family="monospace" fill="#e2e8f0">+ onLogin()</text>
    <text x="1330" y="420" font-size="9.5" font-family="monospace" fill="#e2e8f0">+ onLogout()</text>
  </g>

  <!-- Package: services/backend -->
  <rect x="30" y="555" width="1540" height="510" rx="8" fill="#1e293b" fill-opacity="0.4" stroke="#a855f7" stroke-width="1.5" stroke-dasharray="6 4" />
  <text x="45" y="575" font-size="12" font-weight="700" fill="#c084fc">PACKAGE: services/backend (Gateway &amp; Adapter Driver Pattern)</text>

  <!-- BackendGateway -->
  <g filter="url(#box-shadow)">
    <rect x="45" y="590" width="450" height="190" rx="6" fill="#1e293b" stroke="#a855f7" stroke-width="1.5" />
    <rect x="45" y="590" width="450" height="30" rx="6" fill="#581c87" />
    <text x="270" y="609" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">BackendGateway (Facade)</text>
    <line x1="45" y1="620" x2="495" y2="620" stroke="#a855f7" stroke-width="1" />
    <text x="55" y="638" font-size="10" font-family="monospace" fill="#94a3b8">- activeAdapter: BackendAdapter</text>
    <line x1="45" y1="648" x2="495" y2="648" stroke="#a855f7" stroke-width="1" />
    <text x="55" y="666" font-size="10" font-family="monospace" fill="#e2e8f0">+ dispatchBackend&lt;T&gt;(op, payload): Promise&lt;T&gt;</text>
    <text x="55" y="684" font-size="10" font-family="monospace" fill="#e2e8f0">+ requestBackend&lt;T&gt;(op, payload): Promise&lt;T&gt;</text>
    <text x="55" y="702" font-size="10" font-family="monospace" fill="#e2e8f0">+ setAdapter(adapter: BackendAdapter): void</text>
    <text x="55" y="720" font-size="10" font-family="monospace" fill="#e2e8f0">+ getAdapter(): BackendAdapter</text>
  </g>

  <!-- BackendAdapter Interface -->
  <g filter="url(#box-shadow)">
    <rect x="525" y="590" width="490" height="230" rx="6" fill="#1e293b" stroke="#a855f7" stroke-width="1.5" />
    <rect x="525" y="590" width="490" height="30" rx="6" fill="#581c87" />
    <text x="770" y="602" font-size="9.5" font-style="italic" fill="#e9d5ff" text-anchor="middle">&lt;&lt;interface&gt;&gt;</text>
    <text x="770" y="615" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">BackendAdapter</text>
    <line x1="525" y1="620" x2="1015" y2="620" stroke="#a855f7" stroke-width="1" />
    <text x="535" y="638" font-size="10" font-family="monospace" fill="#e2e8f0">+ testHealth(): Promise&lt;BackendHealthResult&gt;</text>
    <text x="535" y="656" font-size="10" font-family="monospace" fill="#e2e8f0">+ getDocuments(params: DocumentQueryParams): Promise&lt;DocumentListResult&gt;</text>
    <text x="535" y="674" font-size="10" font-family="monospace" fill="#e2e8f0">+ getDocument(guid: String): Promise&lt;DocumentRecord&gt;</text>
    <text x="535" y="692" font-size="10" font-family="monospace" fill="#e2e8f0">+ uploadDocument(req: DocumentUploadPayload): Promise&lt;DocumentRecord&gt;</text>
    <text x="535" y="710" font-size="10" font-family="monospace" fill="#e2e8f0">+ overwriteVersion(guid, req): Promise&lt;DocumentRecord&gt;</text>
    <text x="535" y="728" font-size="10" font-family="monospace" fill="#e2e8f0">+ deleteDocument(guid): Promise&lt;{success, message}&gt;</text>
    <text x="535" y="746" font-size="10" font-family="monospace" fill="#e2e8f0">+ regenerateSummary(guid, modelKey): Promise&lt;SummaryRecord&gt;</text>
    <text x="535" y="764" font-size="10" font-family="monospace" fill="#e2e8f0">+ chatWithDocument(guid, req): Promise&lt;ChatResponseResult&gt;</text>
  </g>

  <!-- Concrete Drivers: RestBackendAdapter & MockBackendAdapter -->
  <g filter="url(#box-shadow)">
    <rect x="1045" y="590" width="510" height="210" rx="6" fill="#1e293b" stroke="#a855f7" stroke-width="1.5" />
    <rect x="1045" y="590" width="510" height="30" rx="6" fill="#581c87" />
    <text x="1300" y="609" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">RestBackendAdapter</text>
    <line x1="1045" y1="620" x2="1555" y2="620" stroke="#a855f7" stroke-width="1" />
    <text x="1055" y="638" font-size="10" font-family="monospace" fill="#94a3b8">- baseUrl: String ('/api/v1')</text>
    <text x="1055" y="654" font-size="10" font-family="monospace" fill="#94a3b8">- buildHeaders(): Headers</text>
    <line x1="1045" y1="662" x2="1555" y2="662" stroke="#a855f7" stroke-width="1" />
    <text x="1055" y="680" font-size="10" font-family="monospace" fill="#e2e8f0">+ fetchJson&lt;T&gt;(url, init): Promise&lt;T&gt;</text>
    <text x="1055" y="698" font-size="10" font-family="monospace" fill="#e2e8f0">+ uploadMultipart(url, formData): Promise&lt;DocumentRecord&gt;</text>
    <text x="1055" y="716" font-size="10" font-family="monospace" fill="#e2e8f0">+ implements all BackendAdapter methods via HTTP</text>
  </g>

  <g filter="url(#box-shadow)">
    <rect x="1045" y="820" width="510" height="210" rx="6" fill="#1e293b" stroke="#a855f7" stroke-width="1.5" />
    <rect x="1045" y="820" width="510" height="30" rx="6" fill="#581c87" />
    <text x="1300" y="839" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">MockBackendAdapter</text>
    <line x1="1045" y1="850" x2="1555" y2="850" stroke="#a855f7" stroke-width="1" />
    <text x="1055" y="868" font-size="10" font-family="monospace" fill="#94a3b8">- localDocuments: DocumentRecord[]</text>
    <text x="1055" y="884" font-size="10" font-family="monospace" fill="#94a3b8">- simulateLatencyMs: number</text>
    <line x1="1045" y1="892" x2="1555" y2="892" stroke="#a855f7" stroke-width="1" />
    <text x="1055" y="910" font-size="10" font-family="monospace" fill="#e2e8f0">+ filterInPlace(params): DocumentRecord[]</text>
    <text x="1055" y="928" font-size="10" font-family="monospace" fill="#e2e8f0">+ mockAiSummarize(guid, model): SummaryRecord</text>
    <text x="1055" y="946" font-size="10" font-family="monospace" fill="#e2e8f0">+ mockRAGChat(guid, prompt): ChatResponseResult</text>
  </g>

  <!-- Connectors (Strict 90-degree perpendicular routing, avoiding box collisions) -->
  <!-- Component to ListReportView (Horizontal entry into left wall at 90 degrees) -->
  <path d="M 495 240 L 555 240" fill="none" stroke="#38bdf8" stroke-width="2" marker-end="url(#ts-arrow)" />

  <!-- ListReportView to ObjectPageView (Horizontal entry into left wall at 90 degrees) -->
  <path d="M 1015 240 L 1075 240" fill="none" stroke="#38bdf8" stroke-width="2" marker-end="url(#ts-arrow)" />

  <!-- BackendGateway to BackendAdapter (Horizontal entry into left wall at 90 degrees) -->
  <path d="M 495 680 L 525 680" fill="none" stroke="#a855f7" stroke-width="2" marker-end="url(#ts-arrow-purple)" />

  <!-- BackendAdapter to RestBackendAdapter (Horizontal entry into left wall at 90 degrees) -->
  <path d="M 1015 680 L 1045 680" fill="none" stroke="#a855f7" stroke-width="2" marker-end="url(#ts-arrow-purple)" />

  <!-- BackendAdapter to MockBackendAdapter (Leaves right wall, descends inter-column channel, enters left wall at 90 degrees) -->
  <path d="M 1015 750 L 1030 750 L 1030 925 L 1045 925" fill="none" stroke="#a855f7" stroke-width="2" marker-end="url(#ts-arrow-purple)" />
</svg>`;
}

// =============================================================================
// 6. MAIN GENERATION ENGINE
// =============================================================================
export async function generateAllUmlDiagrams(): Promise<void> {
  console.log('📐 Generating Technology-Specific UML Class Diagrams (Java & TypeScript)...');

  const docsDir = path.resolve(projectRoot, 'docs/diagrams');
  const publicDir = path.resolve(projectRoot, 'src/main/frontend/public');

  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  // 1. JAVA UML
  const javaPuml = generateJavaPuml();
  fs.writeFileSync(path.join(docsDir, 'java_uml_class_diagram.puml'), javaPuml, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'java_uml_class_diagram.puml'), javaPuml, 'utf-8');

  const javaMmd = generateJavaMermaid();
  fs.writeFileSync(path.join(docsDir, 'java_uml_class_diagram.mmd'), javaMmd, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'java_uml_class_diagram.mmd'), javaMmd, 'utf-8');

  const javaSvg = generateJavaUmlSvg();
  fs.writeFileSync(path.join(docsDir, 'java_uml_class_diagram.svg'), javaSvg, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'java_uml_class_diagram.svg'), javaSvg, 'utf-8');

  const resvgJava = new Resvg(javaSvg, { fitTo: { mode: 'width', value: 3200 } });
  const javaPng = resvgJava.render().asPng();
  fs.writeFileSync(path.join(docsDir, 'java_uml_class_diagram.png'), javaPng);
  fs.writeFileSync(path.join(publicDir, 'java_uml_class_diagram.png'), javaPng);
  console.log('✅ Generated Java UML Class Diagrams (.puml, .mmd, .svg, .png)');

  // 2. TYPESCRIPT UML
  const tsPuml = generateTypeScriptPuml();
  fs.writeFileSync(path.join(docsDir, 'typescript_uml_class_diagram.puml'), tsPuml, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'typescript_uml_class_diagram.puml'), tsPuml, 'utf-8');

  const tsMmd = generateTypeScriptMermaid();
  fs.writeFileSync(path.join(docsDir, 'typescript_uml_class_diagram.mmd'), tsMmd, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'typescript_uml_class_diagram.mmd'), tsMmd, 'utf-8');

  const tsSvg = generateTypeScriptUmlSvg();
  fs.writeFileSync(path.join(docsDir, 'typescript_uml_class_diagram.svg'), tsSvg, 'utf-8');
  fs.writeFileSync(path.join(publicDir, 'typescript_uml_class_diagram.svg'), tsSvg, 'utf-8');

  const resvgTs = new Resvg(tsSvg, { fitTo: { mode: 'width', value: 3200 } });
  const tsPng = resvgTs.render().asPng();
  fs.writeFileSync(path.join(docsDir, 'typescript_uml_class_diagram.png'), tsPng);
  fs.writeFileSync(path.join(publicDir, 'typescript_uml_class_diagram.png'), tsPng);
  console.log('✅ Generated TypeScript UML Class Diagrams (.puml, .mmd, .svg, .png)');

  console.log('🎉 UML Diagram generation completed successfully!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAllUmlDiagrams().catch(err => {
    console.error('Failed generating UML diagrams:', err);
    process.exit(1);
  });
}
