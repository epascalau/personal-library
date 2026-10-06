# Software Requirements Specification (SRS)
## Personal Library & Enterprise Multi-Model RAG Research Assistant
**System Technical Requirements & Enterprise Architectural Specifications**

---

## 1. System Scope & Objectives

### 1.1 Purpose
This Software Requirements Specification (SRS) defines the functional, non-functional, data, and interface requirements for the **Personal Library & Enterprise Multi-Model RAG Research Assistant**. The system delivers an enterprise-grade document intelligence, bibliographic indexing, and conversational retrieval platform adhering strictly to **SAP Fiori 3 (Horizon)** design standards and Clean Hexagonal Architecture.

### 1.2 System Scope
The platform provides an end-to-end, decoupled enterprise topology featuring:
- **Multi-Format Ingestion**: Ingesting `.pdf`, `.docx`, `.doc`, `.txt`, `.md`, `.pptx`, `.ppt`, `.xls`, and `.xlsx` files up to 50 MB.
- **Workflow Orchestration**: Camunda BPMN 2.0 workflow orchestration (`camunda-ingestion-flow.bpmn`) governing asynchronous multi-stage ingestion with retry boundaries (`R3/PT10S`).
- **Domain-Specific BibTeX Extraction**: Abstract Syntax Tree (AST) lexer/tokenizer extracting 14 standard LaTeX BibTeX publication fields with dynamic schema generation.
- **Dual-Model Parallel AI Summarization**: Concurrent, comparative summarization via open-weights models (**Meta Llama 3.3 70B Instruct** and **Mistral Large 2411**) deployed on Ollama and Spring AI.
- **Conversational RAG with Verifiable Grounding**: 768-dimensional dense vector embeddings using local **Nomic Embed Text** (`nomic-embed-text`) with **Google `text-embedding-004`** cloud fallback, stored in **Qdrant** with Cosine similarity and interactive citation drawers.
- **Enterprise Document Lifecycle & Immutable Rollback**: Non-destructive versioning preserving full snapshot history and cryptographic audit logs.
- **Decoupled Architecture**: Pure TypeScript + SAP `@ui5/webcomponents` v2 (W3C Custom Elements) SPA, Node.js/Express gateway (`:3000`), Spring Boot 3.3.4 microservice (`:8080`), Qdrant Vector Store (`:6333`/`:6334`), MongoDB 7.0 (`:27017`), and Keycloak 24/25 OIDC Identity Provider (`:8180`).

---

## 2. Functional Requirements (FR)

### FR-1: Document Ingestion & Multi-Format Parsing
- **FR-1.1 (File Formats)**: The system shall support uploading files in `.pdf`, `.docx`, `.doc`, `.txt`, `.md`, `.pptx`, `.ppt`, `.xls`, and `.xlsx` formats with file sizes up to 50 MB.
- **FR-1.2 (Text Extraction)**: Upon upload, the backend text extraction pipeline shall extract raw text, document structure, page breaks, and character counts using `pdf-parse` and dedicated format parsers.
- **FR-1.3 (Boundary-Aware Chunking)**: Ingested text shall be split into paragraph-aligned, sliding-window sub-word chunks (default: ~400–500 tokens with 50-token overlap) to preserve semantic coherence across sentence boundaries.
- **FR-1.4 (BPMN 2.0 Ingestion Workflow)**: Ingestion tasks shall be orchestrated via Camunda BPMN 2.0 (`docs/diagrams/camunda-ingestion-flow.bpmn`), ensuring asynchronous state persistence, retry policies (`R3/PT10S`), and compensating transaction handling.

### FR-2: Automated BibTeX Bibliographic Metadata Extraction
- **FR-2.1 (Schema Extraction)**: The system shall parse and infer 14 standard LaTeX BibTeX publication fields: Entry Type (`@article`, `@book`, `@inproceedings`, `@techreport`, `@misc`), `title`, `author`, `journal`, `booktitle`, `year`, `volume`, `number`, `pages`, `publisher`, `institution`, `organization`, `school`, `doi`, `isbn`, and `issn`.
- **FR-2.2 (Citation Key Synthesis)**: The system shall synthesize a standard BibTeX citation key formatted as `AuthorYearKeyword` (e.g., `Vaswani2017Attention`).
- **FR-2.3 (Interactive BibTeX Management)**: Users shall be able to view, edit in a syntax-highlighted editor, copy to clipboard, and export raw BibTeX definitions with one click.
- **FR-2.4 (AST Metadata Preview)**: An explicit endpoint (`POST /api/v1/documents/extract-metadata`) shall extract candidate bibliographic metadata from previews prior to final persistence.

### FR-3: Dual-Model Parallel AI Summarization
- **FR-3.1 (Multi-Model Architecture)**: The system shall support simultaneous parallel summarization using two distinct foundational LLM architectures:
  - **Meta Llama 3.3 (70B Instruct)**: Configured with low temperature ($0.2$) for rigorous analytical reasoning, structured executive takeaways, and strict factual fidelity.
  - **Mistral Large (2411)**: Configured with temperature ($0.3$) for high-fluency executive synthesis, cross-lingual appraisal, and methodology review.
- **FR-3.2 (Comparative Presentation)**: Summaries shall be presented in parallel side-by-side cards on the Object Page to eliminate single-model cognitive bias.
- **FR-3.3 (Performance Telemetry)**: The system shall record and display the model version, generation timestamp, latency in milliseconds, prompt tokens, and completion tokens.

### FR-4: Conversational Retrieval-Augmented Generation (RAG)
- **FR-4.1 (Interactive Q&A)**: Users shall be able to converse interactively with any ingested document via a dedicated RAG conversational drawer.
- **FR-4.2 (Dense Vector Embeddings)**:
  - Local sovereign model: **Nomic Embed Text** (`nomic-embed-text`) generating 768-dimensional dense vectors with an 8,192-token context window and asymmetric prefixes (`search_document:` / `search_query:`).
  - Cloud reference baseline: **Google `text-embedding-004`** via `@google/genai` (768 dimensions with Matryoshka Representation Learning).
- **FR-4.3 (Qdrant Vector Retrieval)**: Vectors shall be matched in Qdrant using Cosine Similarity, scoped strictly by `documentGuid` to prevent cross-document context leaks.
- **FR-4.4 (Verifiable Citations)**: Responses must provide interactive grounding citations displaying:
  - Source chunk identifier (`guid-c0`) and page offset.
  - Cosine similarity relevance score (e.g., `91.8% Match`).
  - Exact verbatim matching excerpt with click-to-highlight inspection.

### FR-5: Document Versioning & Immutable Rollback Architecture
- **FR-5.1 (In-Place Version Overwrite)**: Users shall be able to upload updated revisions of an existing document via an in-place overwrite modal with minor (`v1.1`) or major (`v2.0`) bump options and mandatory change summaries.
- **FR-5.2 (Immutable Lineage Chain)**: Historical versions shall be preserved as immutable snapshots (`DocumentVersionSnapshot`) recording version numbers, timestamps, uploader identity, file size, and SHA256 checksums.
- **FR-5.3 (Historical Asset Retrieval)**: Users shall be able to inspect previous versions, review change logs, and download historical binary file assets.
- **FR-5.4 (Non-Destructive Rollback)**: Rolling back to version $N$ shall not delete intervening versions ($> N$). Instead, snapshot $N$ is cloned into a newly incremented version $M = \max(\text{versions}) + 1$, logging a rollback audit trail and re-indexing vectors under version $M$.

### FR-6: SAP Fiori 3 / Horizon Enterprise User Interface
- **FR-6.1 (SAP Fiori Floorplans)**: The UI shall implement official SAP Fiori enterprise floorplans:
  - **Analytical List Report**: High-density table with multi-parameter collapsible FilterBar, real-time search, sorting, pagination, format badges, and row selection.
  - **Adaptive Object Page**: Sticky HeaderFacet displaying KPI metrics (Version, Chunk Count, File Size, Ingestion Date), BibTeX citation editor, content preview, dual AI summaries, conversational RAG chat, and version history timeline.
- **FR-6.2 (W3C Web Components Standard)**: The frontend shall be implemented using pure TypeScript and official SAP `@ui5/webcomponents` v2 (`@ui5/webcomponents`, `@ui5/webcomponents-fiori`, `@ui5/webcomponents-icons`). React, Angular, and external widget libraries (MUI, AntD, Chakra) are strictly avoided.
- **FR-6.3 (Dynamic Theming)**: The ShellBar shall support seamless runtime switching between SAP Horizon Light (`sap_horizon`) and SAP Horizon Dark (`sap_horizon_dark`) using standard UI5 CSS variables.
- **FR-6.4 (ShellBar Header)**: Responsive global ShellBar featuring product branding, developer documentation hub links, backend connectivity indicators, theme switcher, language selector, and Keycloak profile/logout actions.

### FR-7: Internationalization (i18n)
- **FR-7.1 (5 Enterprise Locales)**: The UI shall support 5 complete locales:
  - English (`en`) — Default
  - German (`de`) — Deutsch
  - French (`fr`) — Français
  - Spanish (`es`) — Español
  - Romanian (`ro`) — Română
- **FR-7.2 (Real-Time Switch)**: Language changes shall propagate instantly across all active views via the reactive `LocaleStore` without requiring full-page browser reloads.
- **FR-7.3 (Vector SVG Flags)**: National flags in the locale switcher shall be rendered as crisp, scalable vector SVGs (never system emoji).

### FR-8: Decoupled Multi-Tier Backend Gateway (Hexagonal Driver Adapters)
- **FR-8.1 (Spring Boot REST Backend)**: Production backend implemented in Spring Boot 3.3.4 (Java 21 Virtual Threads) on Port 8080 across 23 domain classes in `com.personallibrary`.
- **FR-8.2 (Integrated Node/Express Gateway)**: Express 4 gateway on Port 3000 serving Vite-compiled static assets, local file text extraction, and in-memory export streaming. Despite the "gateway" name, it is a **self-contained simulation** that answers `/api/v1/*` requests itself with a non-persistent, in-memory document store and substring-based semantic search; the only genuine external integration is direct inference calls to the local Ollama daemon. It does not proxy or forward to the Spring Boot backend, MongoDB, or Qdrant.
- **FR-8.3 (Standalone In-Browser Mock Adapter)**: The frontend shall support zero-infrastructure operation via `MockBackendAdapter`, providing pre-seeded academic literature, in-memory vector search, simulated dual LLM summaries, and local RAG Q&A without requiring Spring Boot, MongoDB, or Docker.

---

## 3. Non-Functional Requirements (NFR)

| ID | Category | Requirement Specification |
| :--- | :--- | :--- |
| **NFR-1** | **Performance** | List Report table queries shall render in $< 150\text{ ms}$ for catalogs up to 10,000 documents. Vector retrieval top-$k$ search in Qdrant shall complete in $< 50\text{ ms}$. |
| **NFR-2** | **Scalability** | The Qdrant collection shall support HNSW graph indexing for up to 1,000,000 document chunks with sub-millisecond gRPC retrieval on Port 6334. |
| **NFR-3** | **Security & Auth** | The enterprise backend shall enforce JWT Bearer token validation against Keycloak 24/25 OIDC realm with Role-Based Access Control (`LIBRARY_ADMIN`, `CHIEF_RESEARCHER`, `VIEWER`). |
| **NFR-4** | **Resilience & Fallback** | The frontend `BackendGateway` shall implement graceful fallback: if the live Spring Boot service is unavailable, users can switch to the local mock adapter with zero downtime. |
| **NFR-5** | **Zero Framework Lock-in** | Pure TypeScript + W3C Web Components implementation adhering to SAP Horizon typographic rhythm (`72` font family), high contrast, and WCAG 2.1 Level AA accessibility. |
| **NFR-6** | **Containerization** | All services (`app`, `mongodb:7.0`, `qdrant:v1.11.0`, `ollama:latest`, `keycloak:24.0.5`) shall be fully orchestrated via a single, idempotent `docker-compose.yml` file. |
| **NFR-7** | **Documentation** | 100% of REST APIs specified via OpenAPI 3.0.3 (`openapi.yaml`), all 23 Java classes documented via Javadoc, client modules documented via TypeDoc, and an annotated 6-domain bibliographic curriculum. |
| **NFR-8** | **Architecture-as-Code** | 6 synchronized architectural diagram suites generated in Mermaid (`.mmd`), PlantUML C4 (`.puml`), vector PDF (`.pdf`), retina PNG (`.png`), SVG (`.svg`), and Draw.io (`.drawio`). |
| **NFR-9** | **Corporate Proxy Readiness** | The container stack (`ollama-entrypoint.sh`) shall dynamically mount and register enterprise root CAs from `./certs/` to enable model pulling through TLS-inspecting proxies (Zscaler). |

---

## 4. Data & Interface Requirements

### 4.1 MongoDB Document Schema
- **Database**: `personal_library` (Auth Source: `admin`)
- **Collection**: `documents`
- **Primary Key**: `guid` (UUID v4 string) / `_id` (ObjectId)
- **Key Fields**:
  ```json
  {
    "guid": "550e8400-e29b-41d4-a716-446655440000",
    "fileName": "attention_is_all_you_need.pdf",
    "title": "Attention Is All You Need",
    "author": "Ashish Vaswani et al.",
    "edition": "1st Edition",
    "format": "pdf",
    "fileSize": 2211840,
    "uploadDate": "2026-09-30T12:00:00Z",
    "editDate": "2026-09-30T12:00:00Z",
    "version": 1,
    "tags": ["Deep Learning", "Transformers", "NLP"],
    "bibtex": {
      "entryType": "article",
      "citationKey": "Vaswani2017Attention",
      "title": "Attention Is All You Need",
      "author": "Vaswani, Ashish and Shazeer, Noam",
      "year": "2017",
      "raw": "@article{Vaswani2017Attention,\n  title={Attention Is All You Need}...\n}"
    },
    "summaries": {
      "llamaSummary": {
        "text": "Executive takeaways and structured findings...",
        "generatedAt": "2026-09-30T12:01:00Z",
        "durationSeconds": 14,
        "model": "llama3.3"
      },
      "mistralSummary": {
        "text": "Comprehensive methodology appraisal...",
        "generatedAt": "2026-09-30T12:01:05Z",
        "durationSeconds": 11,
        "model": "mistral"
      }
    },
    "chunkCount": 24,
    "versionHistory": []
  }
  ```

### 4.2 Qdrant Vector Collection Schema
- **Collection**: `personal_library_embeddings`
- **Vector Dimensions**: `768` (dense float32)
- **Distance Metric**: `Cosine`
- **HNSW Graph Parameters**: `M = 16`, `efConstruct = 100`
- **Point Payload**:
  ```json
  {
    "id": "550e8400-e29b-41d4-a716-446655440000-c0",
    "vector": [0.0412, -0.0781, 0.0194, "... 768 floats ..."],
    "payload": {
      "documentGuid": "550e8400-e29b-41d4-a716-446655440000",
      "chunkIndex": 0,
      "text": "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...",
      "pageNumber": 1,
      "tokenCount": 420
    }
  }
  ```

### 4.3 REST API Endpoints Specification (Contract-First OpenAPI 3.0.3)

| Method | Endpoint | Description | Query / Body Parameters | Response Payload |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/auth/login` | OIDC User Authentication | `{ username, password, realm }` | `AuthResponse (accessToken, user)` |
| `POST` | `/api/v1/auth/logout` | Terminate User Session | Bearer Token | `{ success: true }` |
| `GET` | `/api/v1/auth/userinfo` | Get Authenticated Profile | Bearer Token | `UserProfile (username, roles)` |
| `GET` | `/api/v1/documents` | List Report Catalog Search | `fileName, title, author, edition, format, content, page, pageSize, sortBy, sortOrder` | `PaginatedResponse<DocumentDetail>` |
| `POST` | `/api/v1/documents` | Upload & Process Document | Multipart: `file, title, author, bibtex` | `DocumentDetail` |
| `POST` | `/api/v1/documents/extract-metadata`| Extract BibTeX from Preview | `{ fileName, contentSample }` | `BibTeXMetadata` |
| `GET` | `/api/v1/documents/{guid}` | Object Page Entity Details | Path: `guid` | `DocumentDetail` |
| `PUT` | `/api/v1/documents/{guid}` | In-Place Metadata Update | `{ title, author, bibtex, tags }` | `DocumentDetail` |
| `DELETE`| `/api/v1/documents/{guid}` | Purge Document & Vectors | Path: `guid` | `{ success: true, message }` |
| `GET` | `/api/v1/documents/{guid}/versions` | Historical Snapshot Lineage | Path: `guid` | `List<DocumentVersionSnapshot>` |
| `GET` | `/api/v1/documents/{guid}/versions/{v}/download` | Download Historical Asset | Path: `guid, version` | Binary file stream (`application/octet-stream`) |
| `POST` | `/api/v1/documents/{guid}/rollback/{v}` | Non-Destructive Rollback | Path: `guid, version` | `DocumentDetail` |
| `POST` | `/api/v1/documents/{guid}/summarize` | Trigger AI Summarization | `{ model: "llama" \| "mistral" }` | `SummaryRecord` |
| `POST` | `/api/v1/documents/{guid}/chat` | RAG Conversational Query | `{ question, chatHistory[] }` | `ChatResponse (answer, citations[])` |
| `GET` | `/api/v1/documents/{guid}/bibtex` | Export Formatted BibTeX | Path: `guid` | `text/plain` |
| `GET` | `/export.zip` | Standalone Project ZIP Export | None | In-memory ZIP stream |

---
*Document Version: 1.1.0 • Formally synchronized with the Personal Library Enterprise Architecture.*
