# Personal Library — AI Reproduction Specification

**Status:** Authoritative Production Specification  
**Version:** 2.0.0 (Synchronized with Codebase)  
**Purpose:** Provide an AI coding agent, autonomous system, or human engineer with complete, deterministic context to reproduce, build, verify, and operate the entire Personal Library application without requiring conversation history.

---

## 1. Product Overview & Architecture

Personal Library is an enterprise-grade document intelligence, cataloging, and conversational research platform built on the **SAP Fiori** design system. It combines full-text semantic cataloging, structured BibTeX citation management, immutable document version lineage, dual-model Artificial Intelligence (AI) summarization, and citation-grounded Retrieval-Augmented Generation (RAG).

### 1.1 Core System Capabilities
1. **SAP Fiori Floorplans**:
   - **Analytical List Report**: Multi-field collapsible filter bar, real-time debounced full-text search, column-level sorting, pagination, file format badges, and row selection.
   - **Adaptive Object Page**: Sticky header, KPI summary facet cards, document preview, syntax-highlighted BibTeX editor/exporter, side-by-side dual AI model summarization, conversational RAG chat with chunk citations, and complete version lineage timeline with one-click non-destructive rollback.
2. **Dual-Model AI Engine**:
   - Independent summarization cards comparing **Ollama Llama 3.3 (70B Instruct)** and **Ollama Mistral Large (2411)** with latency metrics, token efficiency statistics, and prompt inspections.
3. **Conversational RAG with Verifiable Citations**:
   - Vector similarity search powered by **Qdrant** (Hierarchical Navigable Small World - HNSW indexing with cosine distance) and **Nomic Embed Text** embeddings.
   - Grounded conversational responses providing interactive chunk citations with source offset boundaries and similarity confidence scores.
4. **Enterprise Document Lifecycle & Versioning**:
   - Immutable version lineage chain (`versionNumber`, `previousVersionGuid`).
   - In-place version overwrites (`minor` v1.1 vs `major` v2.0) with change-log audit trails.
   - Historical version snapshot archiving and asset retrieval.
   - Non-destructive rollback restoring previous document snapshots into a newly incremented HEAD version.
5. **Decoupled Backend Architecture & Zero-Infrastructure Mock**:
   - Pluggable `BackendGateway` supporting Spring Boot REST (`:8080`), Integrated Node/Express Gateway (`:3000`), or zero-infrastructure in-browser `MockBackendAdapter`.
6. **Multi-Locale Internationalization (i18n)**:
   - Full localization across 5 languages: English (`en`), German (`de`), French (`fr`), Spanish (`es`), and Romanian (`ro`).
   - SVG vector flags rendered inline (no emoji dependencies).
7. **SAP Fiori Theming**:
   - Seamless Light and Dark visual themes with dynamic HTML root attribute switching (`data-sap-theme="sap_horizon"` / `data-sap-theme="sap_horizon_dark"`, class `.dark`), and real-time UI5 Web Components runtime synchronization.

---

## 2. Deployment Topology & Container Architecture

The system operates across a C4 container deployment topology:

```text
+-----------------------------------------------------------------------------------+
| 1. CLIENT TIER (Browser :3000)                                                    |
|    - SAP Fiori UI5 Web Components (@ui5/webcomponents v2.27)                      |
|    - Vanilla TypeScript (Vite 8.3 / Tailwind CSS v4)                             |
|    - Reactive Observable Stores & Typed Event Bus                                 |
+------------------------------------------+----------------------------------------+
                                           | HTTP / REST (/api/v1/*)
                                           v
+-----------------------------------------------------------------------------------+
| 2. GATEWAY & REVERSE PROXY TIER (Node.js Express :3000)                           |
|    - Static Asset Delivery (`dist/`)                                              |
|    - Reverse Proxy forwarding to Spring Boot (:8080)                              |
|    - Autonomous Integrated Mock API Engine (Vector simulation & Document catalog) |
+------------------------------------------+----------------------------------------+
                                           | HTTP / JSON (:8080)
                                           v
+-----------------------------------------------------------------------------------+
| 3. ENTERPRISE APPLICATION TIER (Spring Boot 3.3+ Java 21 :8080)                   |
|    - Spring Data MongoDB (Documents, Versions, Audit Trail)                       |
|    - Spring AI Ollama Engine (Llama 3.3 & Mistral Large)                          |
|    - Spring AI Qdrant Vector Client (Chunk Embeddings & RAG Search)                |
|    - Apache Tika / PDFBox Extraction Service & BibTeX Parser                      |
|    - Spring Security 6 OIDC / OAuth2 Resource Server                              |
+-------+--------------------+---------------------+--------------------+-----------+
        |                    |                     |                    |
        v                    v                     v                    v
+---------------+    +---------------+     +---------------+    +---------------+
| MongoDB 7.0   |    | Qdrant Vector |     | Ollama LLM    |    | Keycloak 24+  |
| Port: 27017   |    | Ports:        |     | Port: 11434   |    | Port: 8180    |
| Document Meta |    | 6333 (REST)   |     | llama3.2      |    | OIDC / OAuth2 |
| Version Tree  |    | 6334 (gRPC)   |     | mistral       |    | JWT Bearer    |
| Audit Trail   |    | HNSW Index    |     | nomic-embed   |    | Tokens        |
+---------------+    +---------------+     +---------------+    +---------------+
```

---

## 3. Strict Non-Negotiable Implementation Constraints

1. **Pure Vanilla TypeScript & UI5 Web Components**: No React, Vue, Angular, or external UI widget libraries. All views must inherit from `Component<P>` or declare pure DOM nodes.
2. **Directory Isolation**: All frontend source files reside under `src/main/frontend/`. Java backend code resides under `src/main/java/com/personallibrary/`. Gateway server resides in `src/main/server/server.ts` (bootloaded by root `server.ts`).
3. **Decoupled Gateway Pattern**: Views MUST NOT execute direct `fetch` or HTTP REST calls. All data mutations and queries must route through `BackendGateway.dispatch()` via strongly typed event contracts.
4. **UI5 Shadow DOM Style Injection**: All global styling and Tailwind utilities must be injected into UI5 Web Component Shadow DOM roots using `applyGlobalStylesheetPatch` in `src/main/frontend/ui5/globalStylesheet.ts`.
5. **No Emoji Flags**: Country flags in `LanguageSelectorView.ts` must use vector SVG paths defined in `src/main/frontend/ui5/flags.ts`.
6. **Literal Query Sanitization**: User input for search and filtering must be treated as literal strings and sanitized against Mongo regex injection and script execution.
7. **Corporate Certificate Security**: Never commit raw corporate certificates, private keys, or credentials to version control. The `certs/` directory is git-ignored (except `.gitkeep`) and mounted dynamically at runtime.
8. **Persistent Volume Integrity**: Standard rebuilds and scripts must preserve Docker named volumes (`mongodb-data`, `qdrant-data`, `personal-library-ollama-models`). Destructive volume wipes require explicit `--purge-all` arguments.

---

## 4. Complete Codebase Layout

```text
personal-library/
├── Dockerfile                                 # Multi-stage container build (Frontend + Spring Boot)
├── docker-compose.yml                         # Orchestration (App, Gateway, MongoDB, Qdrant, Ollama, Keycloak)
├── ollama-entrypoint.sh                       # Enterprise CA injection & automated model preloader
├── openapi.yaml                               # Full OpenAPI 3.0.3 REST specification
├── package.json                               # Frontend & Gateway scripts and dependencies
├── pom.xml                                    # Maven dependencies (Spring Boot, Spring AI, MongoDB, Qdrant)
├── server.ts                                  # Root bootloader importing src/main/server/server.ts
├── tsconfig.json                              # TypeScript strict compiler configuration
├── vite.config.ts                             # Vite configuration with Tailwind CSS v4 plugin
├── certs/                                     # Corporate CA drop-in folder (.crt, .pem)
├── scripts/
│   ├── rebuild.sh                             # Idempotent clean, build, deploy, and verification automation
│   ├── generate-javadoc.ts                    # Dynamic Javadoc generator
│   ├── generate-diagrams.ts                   # Architecture diagram builder
│   ├── generate-architecture-diagrams.ts      # Mermaid & SVG C4 architecture diagram generator
│   ├── generate-uml-diagrams.ts               # PlantUML & SVG class diagram generator
│   └── generate-mindmap.ts                    # Capabilities mindmap generator
├── src/
│   └── main/
│       ├── server/
│       │   └── server.ts                      # Express production server (Port 3000), static host, mock REST API
│       ├── java/com/personallibrary/
│       │   ├── PersonalLibraryApplication.java # Spring Boot entrypoint
│       │   ├── config/
│       │   │   ├── OllamaConfig.java          # Spring AI ChatModel and EmbeddingModel beans
│       │   │   ├── OpenApiConfig.java         # Swagger / OpenAPI documentation config
│       │   │   └── SecurityConfig.java        # Spring Security 6 Keycloak JWT configuration
│       │   ├── controller/
│       │   │   ├── AuthController.java        # Authentication status & token endpoints
│       │   │   └── DocumentController.java    # REST API endpoints for document lifecycle & AI
│       │   ├── dto/
│       │   │   ├── ChatRequest.java           # RAG chat query request DTO
│       │   │   ├── ChatResponse.java          # RAG response with chunk citations DTO
│       │   │   ├── DocumentResponse.java      # Serialized document representation DTO
│       │   │   ├── DocumentUploadRequest.java  # Ingestion payload DTO
│       │   │   ├── PaginatedResponse.java     # Generic paginated wrapper DTO
│       │   │   └── SummarizeRequest.java      # Dual-model summarization trigger DTO
│       │   ├── model/
│       │   │   ├── BibTeXMetadata.java        # Structured citation fields (journal, volume, DOI, etc.)
│       │   │   ├── BibTeXType.java            # Citation type enum (ARTICLE, BOOK, INPROCEEDINGS, MISC)
│       │   │   ├── DocumentChunk.java         # Text chunk with token bounds and embedding vector ref
│       │   │   ├── DocumentEntity.java        # MongoDB @Document collection entity
│       │   │   ├── DocumentVersionSnapshot.java # Immutable historical version snapshot
│       │   │   └── SummaryRecord.java         # AI summary cache record (model, prompt, text, metrics)
│       │   ├── repository/
│       │   │   ├── DocumentRepository.java    # Spring Data MongoRepository
│       │   │   ├── DocumentRepositoryCustom.java # Dynamic search criteria contract
│       │   │   └── DocumentRepositoryCustomImpl.java # MongoTemplate search criteria execution
│       │   └── service/
│       │       ├── AiSummarizationService.java # Dual Ollama model invocation & prompt formatting
│       │       ├── BibTeXExtractionService.java# BibTeX parser and canonical formatter
│       │       ├── DocumentService.java       # Document lifecycle, versioning, rollback, snapshots
│       │       ├── StorageService.java        # Local file system binary asset management
│       │       └── VectorRagService.java      # Qdrant HNSW indexing, chunking, and similarity search
│       ├── resources/
│       │   ├── application.yml                # Spring Boot default configuration
│       │   └── application-docker.yml         # Container networking profile (MongoDB, Qdrant, Ollama)
│       └── frontend/
│           ├── index.html                     # HTML5 shell entry document
│           ├── main.ts                        # Frontend entrypoint, theme init, and AppView mount
│           ├── index.css                      # Global Tailwind & SAP theme CSS variables
│           ├── core/
│           │   ├── component.ts               # Base Component lifecycle class with query/event helpers
│           │   ├── eventBus.ts                # Strongly typed event bus implementation
│           │   ├── html.ts                    # Safe tagged-template HTML renderer (RawHtml)
│           │   └── store.ts                   # Reactive observable Store<T> pattern
│           ├── stores/
│           │   ├── appStore.ts                # Catalog state, active doc, search filters, pagination, RAG chat
│           │   ├── backendStore.ts            # Active backend adapter, health monitor, endpoint settings
│           │   ├── i18nStore.ts               # 5-locale internationalization store and translation engine
│           │   └── themeStore.ts              # Light / Dark theme management, UI5 theme synchronization
│           ├── services/backend/
│           │   ├── BackendGateway.ts          # Singleton facade routing typed events to active adapter
│           │   ├── MockBackendAdapter.ts      # Zero-infrastructure browser mock engine with vector simulation
│           │   ├── RestBackendAdapter.ts      # HTTP REST client communicating with Spring Boot / Gateway API
│           │   ├── events.ts                  # Typed event definitions for document operations
│           │   ├── index.ts                   # Backend service barrel export
│           │   └── types.ts                   # Shared TypeScript data models, DTOs, and error types
│           ├── views/
│           │   ├── AppView.ts                 # Master layout managing ShellBar, ListReport, ObjectPage, Footer
│           │   ├── FooterView.ts              # System metadata, AGPL license, and architecture status footer
│           │   ├── LanguageSelectorView.ts    # Locale dropdown with inline SVG flags
│           │   ├── ListReportView.ts          # SAP Fiori List Report floorplan (FilterBar, Table, Pagination)
│           │   ├── ObjectPageView.ts          # SAP Fiori Object Page floorplan (KPIs, BibTeX, AI Summaries, RAG)
│           │   ├── ShellBarView.ts            # SAP Fiori ShellBar, user popover, theme toggle, dev tools
│           │   ├── ToastView.ts               # Floating notifications manager
│           │   └── dialogs/
│           │       ├── AuthModalView.ts       # Keycloak authentication and token inspector
│           │       ├── BackendSettingsModalView.ts # Live backend adapter switcher modal
│           │       ├── BpmnModalView.ts       # BPMN 2.0 ingestion and RAG process flow viewer
│           │       ├── DeleteConfirmDialogView.ts # Document deletion confirmation modal
│           │       ├── DialogView.ts          # Base modal dialog component wrapper
│           │       ├── OpenApiModalView.ts    # Interactive OpenAPI / Swagger viewer modal
│           │       ├── UploadDialogView.ts    # Multi-step document ingestion pipeline modal
│           │       └── VersionOverwriteDialogView.ts # In-place version bump and diff modal
│           ├── ui5/
│           │   ├── bootstrap.ts               # UI5 Web Components runtime initialization
│           │   ├── flags.ts                   # Inline vector SVG country flag definitions
│           │   ├── globalStylesheet.ts        # UI5 shadow root stylesheet patch injector
│           │   └── icons.ts                   # Unified icon helper for UI5 and Lucide iconography
│           ├── i18n/
│           │   ├── types.ts                   # Strongly typed translation dictionary interface
│           │   └── translations/              # Locale dictionary definitions
│           │       ├── en.ts                  # English translations
│           │       ├── de.ts                  # German translations
│           │       ├── fr.ts                  # French translations
│           │       ├── es.ts                  # Spanish translations
│           │       └── ro.ts                  # Romanian translations
│           └── public/
│               ├── styles.css                 # Global styling rules and UI5 component tweaks
│               ├── architecture_diagrams.svg  # Rendered C4 container diagram
│               ├── system_architecture.svg    # Detailed system architecture SVG
│               ├── typescript_uml_class_diagram.svg # Frontend UML class diagram SVG
│               ├── java_uml_class_diagram.svg # Backend Spring Boot UML class diagram SVG
│               └── mindmap.svg                # Capabilities mindmap SVG
```

---

## 5. Detailed Component Specifications

### 5.1 Frontend Reactive Architecture (`core/`)

#### 1. `Component<P>` (`core/component.ts`)
- **Responsibility**: Base class for all UI components.
- **Key Methods**:
  - `template(): RawHtml`: Pure template definition returning sanitized markup.
  - `render(): HTMLElement`: Renders `RawHtml` into a live DOM element and calls `onRender()`.
  - `mount(parent: HTMLElement)`: Appends component DOM to parent and triggers lifecycle hooks.
  - `destroy()`: Unregisters all event listeners, unsubscribes store listeners, and cleans DOM.
  - `on(selector, event, handler)`: Scoped event binding to element queries within component boundary.
  - `onAll(selector, event, handler)`: Scoped event binding for multiple matching elements.

#### 2. `Store<T>` (`core/store.ts`)
- **Responsibility**: Lightweight reactive state container.
- **Key Methods**:
  - `getState()` / `state`: Returns current immutable snapshot.
  - `setState(partialOrUpdater)`: Applies updates, freezes state, and synchronously notifies registered subscribers.
  - `subscribe(listener)`: Registers a callback invoked whenever state changes, returns an unsubscribe function.

#### 3. `EventBus<Events>` (`core/eventBus.ts`)
- **Responsibility**: Decoupled, strongly typed asynchronous pub/sub messaging hub.
- **Key Methods**:
  - `publish<K>(event, payload)`: Emits an event with typed arguments to all listeners.
  - `subscribe<K>(event, handler)`: Registers listener for event key, returns unsubscribe function.

#### 4. `html` Tagged Template (`core/html.ts`)
- **Responsibility**: XSS-safe HTML string templating.
- **Features**: Automatically escapes dynamic strings, preserves pre-sanitized `RawHtml` objects, flattens arrays, and ignores `null`/`undefined`/`false` values.

---

### 5.2 Stores & State Management (`stores/`)

| Store Name | State Fields | Key Actions / Responsibilities |
| :--- | :--- | :--- |
| **`appStore`** | `documents: DocumentRecord[]`<br/>`activeDocument: DocumentRecord \| null`<br/>`searchQuery: string`<br/>`filterCriteria: FilterCriteria`<br/>`pagination: PaginationState`<br/>`ragChatSession: ChatMessage[]`<br/>`isSummarizing: Record<string, boolean>` | Catalog search, filtering, document selection, version rollback trigger, RAG query dispatch, and chat history. |
| **`backendStore`** | `mode: 'rest' \| 'mock'`<br/>`health: 'online' \| 'offline'`<br/>`baseUrl: string`<br/>`authToken: string`<br/>`latencyMs: number` | Controls active network driver, endpoint URL overrides, Keycloak token injection, and health checks. |
| **`themeStore`** | `theme: 'light' \| 'dark'`<br/>`isDark: boolean`<br/>`themeName: string` | Updates `data-sap-theme` (`sap_horizon` / `sap_horizon_dark`), `.dark` class, and invokes UI5 `setTheme()`. Persists to `localStorage`. |
| **`i18nStore`** | `locale: 'en' \| 'de' \| 'fr' \| 'es' \| 'ro'`<br/>`t: TranslationBundle` | Manages active language dictionary, handles formatted strings with parameter replacement. Persists to `localStorage`. |

---

### 5.3 SAP Fiori Views & Floorplans (`views/`)

#### 1. `ShellBarView.ts`
- **Pattern**: SAP Fiori ShellBar header.
- **Features**:
  - Brand identity: Logo, title *"Personal Library"*.
  - Global Search Field with instant filtering.
  - Backend Mode Badge showing connected status (`Integrated REST` vs `Mock Browser`).
  - Integrated `LanguageSelectorView` slot.
  - User Avatar Popover:
    - User name and assigned Keycloak roles (`LIBRARY_ADMIN`, `CHIEF_RESEARCHER`).
    - Visual Theme Switcher (Light / Dark buttons).
    - Enterprise Developer Documentation links (OpenAPI, Javadoc, TSDoc, BPMN Viewer, Architecture Diagrams).
    - Sign-out button triggering Keycloak OIDC end-session flow.

#### 2. `ListReportView.ts`
- **Pattern**: SAP Fiori Analytical List Report Floorplan.
- **Features**:
  - **FilterBar**: Collapsible toolbar with inputs for Title, Author, File Format (`PDF`, `DOCX`, `TXT`, `MD`, `PPTX`), Date From/To, and Tags.
  - **Action Toolbar**: Ingest Document button, Refresh button, Clear Filters button, and document counter KPI.
  - **Data Table**: UI5 `<ui5-table>` or customized high-density table featuring:
    - Sortable columns: Title, Author, File Format, Size, Version, Updated Date.
    - Badges: Format badges with color codes, version tags (`v1.0`, `v2.1`).
    - Navigation: Clicking a row selects the document and navigates to the Object Page.

#### 3. `ObjectPageView.ts`
- **Pattern**: SAP Fiori Adaptive Object Page Floorplan.
- **Features**:
  - **Header Area**: Breadcrumb back-link to List Report, title, subtitle, author, and primary action buttons (Edit Metadata, In-Place Version Overwrite, Export BibTeX, Delete).
  - **KPI Facets**: Metrics for Document Version, Chunk Count, File Size, and Ingestion Date.
  - **Tab 1: Overview & BibTeX**:
    - Metadata summary table (Journal, Volume, Number, Pages, Publisher, Year, DOI, ISBN, ISSN).
    - Interactive BibTeX Citation Editor with copy button and formatting options.
  - **Tab 2: Document Content**:
    - Raw text viewer with search within document, scrollable preview, and format indicators.
  - **Tab 3: Dual AI Summaries**:
    - Two parallel panels comparing **Llama 3.3 (70B Instruct)** and **Mistral Large (2411)**.
    - Status indicators (`Ready`, `Generating...`, `Error`).
    - Metric chips displaying generation latency in milliseconds, prompt tokens, and completion tokens.
  - **Tab 4: Conversational RAG Chat**:
    - Interactive conversation history with user questions and assistant answers.
    - Grounding citations displaying matched chunk extracts, similarity percentage, page numbers, and chunk IDs.
    - Input box with submit action and suggested starter questions.
  - **Tab 5: Version History & Lineage**:
    - Chronological timeline of all document versions.
    - Mutation details (Timestamp, modified by user, change description, file hash).
    - One-click non-destructive rollback button restoring historical state into a new version.

---

### 5.4 Backend Services & Ingestion Pipeline (`src/main/java/` & `src/main/server/`)

#### 1. Ingestion Pipeline
1. **Upload**: Binary document received via `POST /api/v1/documents/upload`.
2. **File Storage**: Binary written to persistent volume (`/data/documents/{guid}/v{version}/{filename}`).
3. **Extraction**:
   - PDF documents parsed via Apache PDFBox / Tika to extract raw text and structural metadata.
   - BibTeX files parsed using regex/AST into `BibTeXMetadata`.
4. **Chunking**: Text partitioned into overlapping chunks (e.g., 512 tokens with 64-token overlap).
5. **Vector Embedding**: Chunks dispatched to Ollama `nomic-embed-text` generating 768-dimensional dense vectors.
6. **Vector Indexing**: Points written to Qdrant collection `library_embeddings` with metadata payload (`documentGuid`, `chunkIndex`, `text`, `version`).
7. **Database Storage**: `DocumentEntity` persisted to MongoDB collection `documents`.

#### 2. Dual AI Summarization (`AiSummarizationService.java`)
- Invokes Ollama endpoints concurrently:
  - `POST /api/chat` with model `llama3.2` (or `llama-3.3-70b-instruct`).
  - `POST /api/chat` with model `mistral` (or `mistral-large-2411`).
- Custom system prompt enforces concise, factual executive summaries with bulleted takeaways.
- Results stored in `SummaryRecord` objects within `DocumentEntity` for zero-latency subsequent retrievals.

#### 3. Conversational RAG Retrieval (`VectorRagService.java`)
1. User question embedded via `nomic-embed-text`.
2. Vector search query executed against Qdrant with filter: `documentGuid == targetGuid`.
3. Top-$K$ (default $K=4$) most similar chunks retrieved with cosine score $\ge 0.65$.
4. Retrieved chunk texts assembled into a grounded system prompt:
   ```text
   Context information is below:
   ---------------------
   [Chunk 1 - Score: 0.88]: ...
   [Chunk 2 - Score: 0.82]: ...
   ---------------------
   Given the context information and no other information, answer the query: {question}
   ```
5. Assistant response returned along with array of citation objects containing `chunkId`, `score`, and `snippet`.

#### 4. Versioning & Non-Destructive Rollback (`DocumentService.java`)
- **Version Increment**: Every update creates an immutable `DocumentVersionSnapshot` stored in `versionHistory[]`.
- **Rollback Mechanics**: Selecting version $N$ for rollback does NOT delete versions $> N$. Instead, the system retrieves snapshot $N$, creates a new version $M = \max(\text{versions}) + 1$ with the content of $N$, logs a rollback audit entry, and re-indexes vectors under version $M$.

---

## 6. REST API Specification

All endpoints are rooted under `/api/v1`:

| Method | Endpoint | Description | Request Body / Params | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | Health & infrastructure readiness | None | `{ status: "UP", models: {...}, vectorStore: {...} }` |
| `GET` | `/documents` | Search and filter catalog | `query, fileType, author, dateFrom, dateTo, page, size, sortField, sortOrder` | `PaginatedResponse<DocumentResponse>` |
| `GET` | `/documents/{guid}` | Retrieve single document | None | `DocumentResponse` |
| `POST` | `/documents/upload` | Ingest new document | `multipart/form-data` (`file`, `title`, `author`, `bibtex`) | `DocumentResponse` |
| `PUT` | `/documents/{guid}` | Update metadata | JSON metadata fields | `DocumentResponse` |
| `POST` | `/documents/{guid}/version` | In-place version overwrite | `multipart/form-data` (`file`, `bumpType`, `changeSummary`) | `DocumentResponse` |
| `GET` | `/documents/{guid}/versions` | List version history | None | `List<DocumentVersionSnapshot>` |
| `GET` | `/documents/{guid}/versions/{v}/download` | Download historical binary | None | Binary file stream |
| `POST` | `/documents/{guid}/rollback/{v}` | Non-destructive rollback | None | `DocumentResponse` |
| `DELETE`| `/documents/{guid}` | Soft or hard delete | None | `{ success: true, guid: "..." }` |
| `POST` | `/documents/{guid}/summarize`| Trigger dual AI summary | `{ model: "llama" \| "mistral" \| "all" }` | `DocumentResponse` |
| `POST` | `/documents/{guid}/rag` | Conversational RAG query | `{ query: string, topK?: number }` | `ChatResponse` with citations |
| `GET` | `/documents/{guid}/bibtex` | Export formatted BibTeX | None | Raw BibTeX text (`text/plain`) |

---

## 7. Enterprise TLS / Corporate CA Proxy Setup

In enterprise networks equipped with TLS-decrypting proxies (e.g., Zscaler, Blue Coat, Fortinet), HTTPS connections to registry endpoints (`registry.ollama.ai`) fail unless the corporate root CA is injected into the container trust store.

### 7.1 Automated CA Installation Workflow
1. Place the corporate root/intermediate CA certificate in the `certs/` directory as a PEM-encoded file with `.crt` or `.pem` extension:
   ```text
   certs/
   ├── .gitkeep
   └── corporate-root-ca.crt
   ```
2. The `ollama-entrypoint.sh` startup script executes the following deterministic sequence:
   - Detects all `*.crt` and `*.pem` files in `/certs`.
   - Validates each file contains a valid `BEGIN CERTIFICATE` block using `openssl x509`.
   - Copies valid certificates into `/usr/local/share/ca-certificates/`.
   - Executes `update-ca-certificates` to update the Debian system trust bundle.
   - Preserves public CA certificates to prevent breaking external connections.
   - Boots `ollama serve` in the background.
   - Waits for the Ollama daemon to respond on port 11434.
   - Automatically preloads missing models: `nomic-embed-text`, `llama3.2`, `mistral`.

### 7.2 Validation Commands
Verify certificate installation inside the container:
```bash
docker compose exec ollama openssl s_client -connect registry.ollama.ai:443 </dev/null 2>&1 | grep -E "issuer=|Verify return code"
```
*Expected Result:* `Verify return code: 0 (ok)`.

---

## 8. Deterministic Reproduction & Execution Procedure

### 8.1 Development & Local Execution

#### 1. Install Dependencies & Build Frontend
```bash
# Clean install npm dependencies
npm ci

# Type check frontend codebase (zero errors required)
npm run lint

# Compile production frontend bundle into dist/
npm run build

# Start integrated Node/Express gateway server on port 3000
npm run dev
```

#### 2. Build & Run Spring Boot Backend
```bash
# Compile and package Spring Boot JAR (skipping test suite for clean build)
mvn clean package -DskipTests

# Run Spring Boot application locally on port 8080
mvn spring-boot:run
```

### 8.2 Production Docker Deployment

#### Standard Clean Rebuild
```bash
# Execute the idempotent rebuild automation
./scripts/rebuild.sh
```

#### Deep Rebuild (Clean Dependency Caches)
```bash
# Force fresh dependencies and rebuild without cache
./scripts/rebuild.sh --deep --no-cache
```

#### Factory Reset (Purge Volumes & Re-download Models)
*Warning: Destroys all stored MongoDB documents and cached Ollama models.*
```bash
./scripts/rebuild.sh --purge-all
```

---

## 9. Verification & Acceptance Checklist

To guarantee 100% reproduction parity with the authoritative codebase, verify each of the following criteria:

- [ ] **Type Safety & Build**: `npm run lint` (`tsc --noEmit`) passes with 0 errors.
- [ ] **Bundle Generation**: `npm run build` generates `dist/index.html` and bundled assets.
- [ ] **Runtime Loading**: Navigating to `http://localhost:3000` renders the SAP Fiori ShellBar and List Report with no console errors.
- [ ] **Zero React Residue**: No React runtime or JSX imports present in `src/main/frontend/`.
- [ ] **UI5 Web Components Styling**: UI5 components render with proper SAP Fiori theme tokens, assisted by `applyGlobalStylesheetPatch`.
- [ ] **Theme Toggling**: Switching between Light and Dark themes dynamically applies `data-sap-theme="sap_horizon"` / `data-sap-theme="sap_horizon_dark"`, toggles the `.dark` class, and invokes `setTheme()`.
- [ ] **Five Locales & SVG Flags**: Switching between EN, DE, FR, ES, and RO updates all UI text and displays correct vector SVG flags (never emoji).
- [ ] **Backend Decoupling**: Switching to *Mock Mode* in `BackendSettingsModalView` allows full catalog interaction, search, filtering, and RAG chat without Spring Boot running.
- [ ] **Ingestion Pipeline**: Uploading a PDF or TXT document successfully extracts text, generates BibTeX, partitions chunks, and creates vectors in Qdrant.
- [ ] **Dual AI Summarization**: Executing summarization produces independent responses from both Llama 3.3 and Mistral Large with latency stats.
- [ ] **Grounded Conversational RAG**: Inquiring about document content produces answers referencing specific chunk IDs, source snippets, and similarity scores.
- [ ] **Version Overwrite & Rollback**: Performing an in-place version bump increments the version number, creates an audit log, and rollback restores past state in a new version.
- [ ] **Docker Health Checks**: All containers (`app`, `frontend-gateway`, `mongodb`, `qdrant`, `ollama`, `keycloak`) report `healthy` in `docker compose ps`.
- [ ] **Ollama Model Cache**: `docker compose exec ollama ollama list` shows `nomic-embed-text`, `llama3.2`, and `mistral`.
