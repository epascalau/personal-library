# 🎓 Key Learning Topics & Architectural Concepts

This document provides a comprehensive educational and architectural breakdown of the **Personal Library & AI Research Engine**. It details 10 foundational software engineering and systems architecture topics demonstrated in this codebase, explaining **what** each topic is, **why** it was designed this way, **how** it is implemented with concrete code references, and the **key takeaways** for engineering production-grade enterprise systems.

---

## Table of Contents

1. [Enterprise UI (User Interface) Architecture with SAP Fiori & UI5 W3C Web Components](#1-enterprise-ui-user-interface-architecture-with-sap-fiori--ui5-w3c-web-components)
2. [Reactive State Management & Decoupled Frontend Patterns](#2-reactive-state-management--decoupled-frontend-patterns)
3. [Pluggable Backend Gateway & Driver Adapter Pattern](#3-pluggable-backend-gateway--driver-adapter-pattern)
4. [Multi-Model Large Language Model (LLM) Orchestration & Comparative Benchmarking](#4-multi-model-large-language-model-llm-orchestration--comparative-benchmarking)
5. [Retrieval-Augmented Generation (RAG) & Vector Database Architecture](#5-retrieval-augmented-generation-rag--vector-database-architecture)
6. [Camunda Business Process Model and Notation (BPMN 2.0) Workflow Orchestration](#6-camunda-business-process-model-and-notation-bpmn-20-workflow-orchestration)
7. [Domain-Specific Parsing & Abstract Syntax Tree (AST) Metadata Engineering (LaTeX / BibTeX)](#7-domain-specific-parsing--abstract-syntax-tree-ast-metadata-engineering-latex--bibtex)
8. [Document Versioning, Lineage & Immutable Rollback Architecture](#8-document-versioning-lineage--immutable-rollback-architecture)
9. [Production-Grade Microservices Topology, Keycloak OIDC (OpenID Connect) & Security](#9-production-grade-microservices-topology-keycloak-oidc-openid-connect--security)
10. [Architecture-as-Code & Automated Visual Documentation Tooling](#10-architecture-as-code--automated-visual-documentation-tooling)
11. [Glossary of Acronyms & Terminology](#11-glossary-of-acronyms--terminology)

---

## 1. Enterprise UI (User Interface) Architecture with SAP Fiori & UI5 W3C Web Components

### The Concept
Modern enterprise applications often default to massive Single Page Application (SPA) frameworks (Angular, React, Vue) with ad-hoc component libraries. In contrast, this project builds directly on standard **W3C (World Wide Web Consortium) Web Components** via **`@ui5/webcomponents` v2**, implementing official **SAP Fiori Floorplans** in pure TypeScript.

### Architectural Rationale
* **Zero Framework Lock-In**: Web Components run natively in the browser engine without virtual Document Object Model (DOM) overhead, heavy bundler polyfills, or framework upgrade churn.
* **Standardized Enterprise Floorplans**: SAP Fiori defines proven User Experience (UX) floorplans that enterprise business users expect:
  * **List Report**: High-density data discovery with multi-parameter filtering, customizable tables, sorting, and batch actions (`src/main/frontend/views/ListReportView.ts`).
  * **Object Page**: Entity-centric detail view with sticky header metrics, dynamic Key Performance Indicator (KPI) blocks, and segmented icon tab bars (`src/main/frontend/views/ObjectPageView.ts`).
* **Accessibility (WCAG 2.1 AA) & Keyboard Navigation**: Built-in screen reader support, Accessible Rich Internet Applications (ARIA) attributes, and keyboard traversal come out of the box with UI5 components adhering to Web Content Accessibility Guidelines (WCAG 2.1 Level AA).

### Implementation Highlights
* **Floorplan Assembly**: `ListReportView` orchestrates `<ui5-dynamic-page>`, `<ui5-table>`, `<ui5-table-row>`, and `<ui5-input>` / `<ui5-select>` elements inside a declarative shadow-DOM compatible hierarchy.
* **Dynamic Visual Theming**: The application supports seamless runtime switching between Light and Dark themes:
  ```typescript
  // src/main/frontend/stores/themeStore.ts
  import { setTheme } from '@ui5/webcomponents-base/dist/config/Theme.js';

  export class ThemeStore extends Store<ThemeState> {
    public toggleTheme(): void {
      const isDark = !this.state.isDark;
      setTheme(isDark ? 'sap_horizon_dark' : 'sap_horizon');
      document.documentElement.classList.toggle('dark', isDark);
      this.setState({ isDark, themeName: isDark ? 'Dark Theme' : 'Light Theme' });
    }
  }
  ```
* **Custom Token Integration**: In `styles.css`, UI5 CSS custom variables (e.g. `--sapTextColor`, `--sapBackgroundColor`, `--sapList_HeaderBackground`) are consumed alongside Tailwind utilities without CSS namespace collisions.

### Key Takeaway
Using Web Components for enterprise design systems yields higher runtime performance, guaranteed accessibility compliance, and UI consistency across multi-team micro-frontends without committing to a single JavaScript framework.

---

## 2. Reactive State Management & Decoupled Frontend Patterns

### The Concept
Instead of pulling in Redux, Zustand, or MobX, the application implements a clean, reactive state management micro-framework using the **Observer** and **Pub/Sub** design patterns in under 150 lines of TypeScript.

### Architectural Rationale
* **Single Source of Truth**: State is partitioned into discrete, focused domain stores:
  * `appStore`: Document collection, selection, active filters, upload queue, and rollback mutations.
  * `backendStore`: Active backend driver mode (`mock` vs. `rest`), connection health, and latency stats.
  * `themeStore`: SAP theme state and system color preference.
  * `i18nStore`: Active language dictionary and translation functions.
* **Fine-Grained Unidirectional Data Flow**: Components subscribe only to the slices of state they depend on, preventing unnecessary full-page DOM thrashing.

### Implementation Highlights
* **Observable Store Primitive (`src/main/frontend/core/store.ts`)**:
  ```typescript
  export class Store<T> {
    private _state: T;
    private _listeners = new Set<(state: T) => void>();

    constructor(initialState: T) {
      this._state = Object.freeze({ ...initialState });
    }

    public getState(): T { return this._state; }

    public setState(partial: Partial<T>): void {
      this._state = Object.freeze({ ...this._state, ...partial });
      for (const listener of this._listeners) {
        listener(this._state);
      }
    }

    public subscribe(listener: (state: T) => void): () => void {
      this._listeners.add(listener);
      return () => this._listeners.delete(listener);
    }
  }
  ```
* **Base Component Lifecycle (`src/main/frontend/core/component.ts`)**:
  Manages subscriptions automatically through `track(unsub)`, invokes `requestRender()` on state changes, and unbinds event listeners during `unmount()` to prevent memory leaks.
* **Typed EventBus (`src/main/frontend/core/eventBus.ts`)**:
  Implements a type-safe event broker for cross-cutting notifications (e.g. `UI_SHOW_TOAST`, `DOCUMENT_UPLOADED`, `THEME_CHANGED`) without tight coupling between sibling views.
* **Client-Side i18n Localization (`src/main/frontend/i18n/`)**:
  Provides dynamic dictionary lookup across 5 languages (English, German, French, Spanish, Romanian) with parametric token interpolation:
  ```typescript
  // i18nStore.t('documents.versionCount', { count: 3 }) -> "3 versions preserved"
  ```

### Key Takeaway
Decoupled, observable state primitives with explicit component lifecycles provide all the reactivity and performance of modern frameworks with zero build complexity and complete control over the update pipeline.

---

## 3. Pluggable Backend Gateway & Driver Adapter Pattern

### The Concept
The frontend never executes raw `fetch()` calls or communicates directly with API endpoints. All data and AI operations pass through an enterprise **Gateway Facade** (`BackendGateway`) that delegates to swappable **Driver Adapters** implementing a strict TypeScript contract (`BackendAdapter`).

### Architectural Rationale
* **Environment Independence**: The frontend can run standalone in air-gapped demo environments, continuous integration tests, or preview sandboxes using the `MockBackendAdapter` without spinning up Docker, MongoDB, Qdrant, or Ollama.
* **Seamless Local Development**: Frontend developers can build, style, and debug UI components against mock latency and realistic simulated AI responses before backend REST APIs are ready.
* **Hot-Swapping at Runtime**: Users and architects can toggle between `Mock Mode` (in-memory + LocalStorage) and `Live Spring Boot REST Mode` directly from the UI header without losing user session state or reloading the page.

### Implementation Highlights
* **Adapter Interface (`src/main/frontend/services/backend/adapter.ts`)**:
  ```typescript
  export interface BackendAdapter {
    readonly mode: BackendMode;
    listDocuments(query?: DocumentListQuery): Promise<DocumentListResult>;
    getDocument(guid: string): Promise<DocumentRecord>;
    uploadDocument(payload: DocumentUploadPayload): Promise<DocumentRecord>;
    overwriteDocument(guid: string, payload: DocumentUploadPayload): Promise<DocumentRecord>;
    deleteDocument(guid: string): Promise<boolean>;
    getVersionHistory(guid: string): Promise<DocumentVersionSnapshot[]>;
    rollbackVersion(guid: string, targetVersion: number): Promise<DocumentRecord>;
    summarizeDocument(guid: string, model: 'llama' | 'mistral'): Promise<SummaryRecord>;
    chat(payload: ChatRequestPayload): Promise<ChatResponseResult>;
    getHealth(): Promise<HealthStatusResult>;
  }
  ```
* **Gateway Delegation (`src/main/frontend/services/backend/gateway.ts`)**:
  ```typescript
  export class BackendGateway {
    private currentAdapter: BackendAdapter;

    constructor() {
      this.currentAdapter = backendStore.getState().mode === 'rest' 
        ? new RestBackendAdapter() 
        : new MockBackendAdapter();
    }

    public switchMode(mode: BackendMode): void {
      this.currentAdapter = mode === 'rest' ? new RestBackendAdapter() : new MockBackendAdapter();
      backendStore.setState({ mode });
      appStore.reloadDocuments();
    }
  }
  ```
* **Full-Fidelity Mock Adapter (`src/main/frontend/services/backend/mockBackendAdapter.ts`)**:
  Implements full client-side text chunking, local cosine search simulation, version history snapshotting, and realistic multi-turn RAG chat with simulated network latency (300ms–800ms).

### Key Takeaway
Decoupling application business logic from communication protocols via the Adapter and Gateway patterns ensures resilience, testability, and effortless switching between mock, test, and production backends.

---

## 4. Multi-Model Large Language Model (LLM) Orchestration & Comparative Benchmarking

### The Concept
Rather than relying on a single generalist model, the system pairs two specialized local Large Language Models (LLMs) via **Spring AI** and **Ollama**, orchestrating them independently with distinct system personas, analytical objectives, and telemetry tracking.

### Architectural Rationale
* **Persona Specialization**: Different stakeholders require different perspectives from academic literature:
  * **Llama 3.3 (70B Instruct)**: Acting as a senior academic researcher, it decomposes research methodology, evaluates empirical evidence, critiques technical assumptions, and highlights data conclusions.
  * **Mistral Large (2411)**: Acting as an executive technology director, it distills strategic implications, extracts actionable bullet points, and writes concise high-level summaries.
* **Cloud Fallback Resiliency**: If local Ollama servers are down, offline, or resource-constrained, the system cascades gracefully to server-side Google Gemini models (`gemini-3.1-flash-lite` / `gemini-3.8-flash`) using `@google/genai` Software Development Kit (SDK).
* **Parallel Execution Without Race Conditions**: Users can regenerate both model summaries simultaneously. Independent in-flight state flags, timers, and update events ensure neither model blocks or overwrites the other.

### Implementation Highlights
* **Spring Boot Multi-Model Service (`src/main/java/.../AiSummarizationService.java`)**:
  ```java
  @Service
  public class AiSummarizationService {
      private final OllamaChatModel llamaChatModel;
      private final OllamaChatModel mistralChatModel;
      private final GeminiFallbackClient geminiFallback;

      public CompletableFuture<SummaryRecord> generateLlamaSummary(String text) {
          return CompletableFuture.supplyAsync(() -> {
              long start = System.currentTimeMillis();
              String prompt = LlamaPrompts.DEEP_METHODOLOGY_CRITIQUE + text;
              String result = callWithFallback(llamaChatModel, prompt);
              long duration = System.currentTimeMillis() - start;
              return new SummaryRecord("llama", result, Instant.now(), duration);
          });
      }
  }
  ```
* **Side-by-Side Synchronized Benchmark UI**:
  `ObjectPageView` renders dual summary cards with synchronized scroll lock, token speed calculation, execution duration indicators, and independent "Regenerate" actions.

### Key Takeaway
Multi-model orchestration tailored to distinct user personas delivers higher informational value than a one-size-fits-all model, while parallel execution with cloud fallback ensures high availability.

---

## 5. Retrieval-Augmented Generation (RAG) & Vector Database Architecture

### The Concept
To prevent hallucinations and provide verifiable answers, the platform implements a grounded **Retrieval-Augmented Generation (RAG)** pipeline using the **Qdrant** vector database, semantic text chunking, and interactive citation tracking.

### Architectural Rationale
* **Context Window Efficiency**: Documents can span hundreds of pages. Semantic chunking extracts the exact paragraphs relevant to a query rather than overloading the Large Language Model's (LLM's) context window.
* **Grounded Verifiability**: Every claim made by the assistant is accompanied by confidence-scored citations linking directly to verbatim source excerpts.

### Implementation Highlights
* **Sliding Window Semantic Chunking**:
  Documents are partitioned into chunks of 500 tokens with a 50-token overlapping window, preserving semantic context across sentence and paragraph boundaries.
* **Qdrant Vector Database Pipeline**:
  ```
  Raw PDF/DOCX -> pdf-parse Extractor -> Chunker -> Embedding Model -> Qdrant HNSW Index
  ```
  Chunks are upserted into the `library_embeddings` collection with dense cosine distance metrics using Hierarchical Navigable Small World (HNSW) graphs.
* **Top-K Vector Retrieval & Context Injection**:
  During user queries, the vector database returns top-$k$ excerpts matching the question's embedding vector:
  ```typescript
  // Context Prompt Assembly
  const prompt = `You are a factual research assistant. Answer based ONLY on the excerpts below.
  If the answer is not contained in the excerpts, state "Information not found in document".

  === SOURCE EXCERPTS ===
  ${retrievedChunks.map((c, i) => `[Citation ${i + 1}] (Relevance: ${c.score}%):\n${c.text}`).join('\n\n')}

  === USER QUERY ===
  ${userQuery}`;
  ```
* **Interactive Citation Drawer**:
  The UI features an interactive citation inspector. Clicking citation tags (e.g. `[1]`, `[2]`) in chat responses highlights exact matching text in the source document and displays similarity confidence percentages.

### Key Takeaway
Vector-grounded Retrieval-Augmented Generation (RAG) with explicit citation attribution transforms LLM responses from speculative text generation into an auditable, verifiable enterprise research tool.

---

## 6. Camunda Business Process Model and Notation (BPMN 2.0) Workflow Orchestration

### The Concept
Document ingestion, extraction, vectorization, and multi-model AI summarization are modeled and executed as an enterprise workflow using **Camunda Business Process Model and Notation (BPMN 2.0)**.

### Architectural Rationale
* **Long-Running Process Governance**: File parsing, Optical Character Recognition (OCR), vector embedding, and large-scale AI summarization take time. BPMN provides persistent process state, asynchronous continuation, and retry policies.
* **Human-in-the-Loop Review Gate**: If automated BibTeX parsing yields low-confidence scores or syntax errors, the process routes to an interactive user correction task before vector upsertion.
* **Visual Auditability**: Architects, compliance officers, and developers can inspect the identical visual diagram in development, staging, and production.

### Implementation Highlights
* **Process Definition (`document-ingestion-rag.bpmn`)**:
  Features 4 horizontal swimlanes:
  1. **Client / Librarian**: Upload, initial validation, and manual metadata correction.
  2. **Gateway / Extraction**: `pdf-parse` stream extraction and LaTeX Backus–Naur Form (BNF) tokenization.
  3. **AI Inference & Vector**: Parallel fork/join gateway dispatching Llama, Mistral, and Qdrant workers.
  4. **Persistence & Security**: MongoDB atomic persistence, Keycloak audit event logging.
* **Camunda JavaDelegate Workers (`src/main/java/.../workflow/`)**:
  Tasks are executed by Spring-managed Zeebe job workers and `JavaDelegate` classes with automatic retry policies (e.g. `R3/PT10S` for LLM network timeouts).
* **In-App BPMN Inspector**:
  The application embeds an interactive BPMN viewer dialog allowing users to inspect visual workflow nodes, execution milestones, and raw BPMN 2.0 XML in real time.

### Key Takeaway
Modeling mission-critical asynchronous pipelines as formal BPMN 2.0 workflows provides enterprise audit trails, built-in retry resilience, and human-in-the-loop governance.

---

## 7. Domain-Specific Parsing & Abstract Syntax Tree (AST) Metadata Engineering (LaTeX / BibTeX)

### The Concept
Academic research relies on LaTeX and BibTeX standards. The system features custom tokenizers, schema validators, and formatters that bridge unstructured document text with structured publication records using an Abstract Syntax Tree (AST).

### Architectural Rationale
* **AST Lexing & Tokenization**: Rather than fragile substring operations, the engine uses regex tokenizers and AST state machines to parse BibTeX entries, handle nested curly braces, and sanitize LaTeX special characters (e.g. `\"{a}` -> `ä`, `\'{e}` -> `é`).
* **Dynamic Schema-Driven Form Generation**: Each BibTeX entry type has distinct required and optional attributes. The UI dynamically adapts its form layout based on whether an item is an `@article`, `@book`, `@inproceedings`, `@techreport`, or `@misc`.

### Implementation Highlights
* **Supported BibTeX Attribute Matrix**:
  Supports 14 standardized attributes: `citeKey`, `entryType`, `title`, `author`, `journal`, `booktitle`, `year`, `volume`, `number`, `pages`, `month`, `publisher`, `doi`, `abstract`, and `keywords`.
* **LaTeX BNF Sanitizer & Formatter (`src/main/frontend/utils/bibtexParser.ts`)**:
  ```typescript
  export function formatBibtex(entry: BibTeXMetadata): string {
    const fields = Object.entries(entry)
      .filter(([k, v]) => k !== 'citeKey' && k !== 'entryType' && Boolean(v))
      .map(([k, v]) => `  ${k.padEnd(12)} = {${sanitizeLatex(String(v))}}`)
      .join(',\n');
    return `@${entry.entryType}{${entry.citeKey},\n${fields}\n}`;
  }
  ```
* **Export & Interoperability**:
  Provides one-click clipboard copying, `.bib` file downloads, and formatted academic citations (APA, IEEE, Chicago) computed directly from the parsed metadata AST.

### Key Takeaway
Domain-specific format engineering ensures seamless integration into researchers' existing publishing workflows while establishing structured data hygiene for database indexing.

---

## 8. Document Versioning, Lineage & Immutable Rollback Architecture

### The Concept
In research workflows, documents evolve: pre-prints become peer-reviewed articles, camera-ready PDFs replace drafts, and BibTeX citations are refined. The platform implements an **in-place version overwrite and immutable snapshot archival** architecture.

### Architectural Rationale
* **Stable Primary Key Continuity**: External bookmarks, citation links, and vector IDs point to a persistent document Globally Unique Identifier (GUID). Overwriting a document updates content in-place without breaking existing references.
* **Immutable Snapshot Preservation**: Before any overwrite or rollback mutation occurs, the system creates a full historical snapshot (`DocumentVersionSnapshot`) containing file metadata, raw BibTeX, text chunks, and both AI summaries.
* **Non-Destructive Rollback**: Rolling back to a previous revision does not erase intervening history; it restores the targeted snapshot's content while advancing the version counter (e.g. rolling back from `v3` to `v1` creates `v4`), preserving a continuous, auditable append-only ledger.

### Implementation Highlights
* **Snapshot Data Contract**:
  ```typescript
  export interface DocumentVersionSnapshot {
    version: number;
    timestamp: string;
    action: 'UPLOAD' | 'OVERWRITE' | 'ROLLBACK';
    note: string;
    fileName: string;
    fileSize: number;
    fileType: string;
    bibtex: BibTeXMetadata;
    summaries: Record<string, SummaryRecord>;
    downloadUrl: string;
  }
  ```
* **REST API Endpoints**:
  * `GET /api/v1/documents/{guid}/versions` — Lists all historical snapshots.
  * `GET /api/v1/documents/{guid}/versions/{version}/download` — Streams the exact physical file asset preserved at that revision.
  * `POST /api/v1/documents/{guid}/rollback/{version}` — Executes an atomic rollback.
* **UI Version History & Rollback Matrix**:
  The **Version History & Rollback** tab in `ObjectPageView` renders an audit timeline showing version numbers, timestamps, author notes, file sizes, direct download links, and instant "Restore This Version" actions with confirmation modals.

### Key Takeaway
Combining stable GUID continuity with immutable snapshot archiving delivers enterprise-grade auditability, complete historical recovery, and zero data loss across collaborative document lifecycles.

---

## 9. Production-Grade Microservices Topology, Keycloak OIDC (OpenID Connect) & Security

### The Concept
The platform is architected as an enterprise-grade multi-tier containerized system, enforcing network isolation, role-based authorization via OpenID Connect (OIDC) and OAuth 2.0, and strict open-source copyleft licensing.

### Architectural Rationale
* **Service Topology (`docker-compose.yml`)**:
  * **API Gateway / Applet (Port 3000)**: Express / Spring Boot serving API routes and the SAP UI5 client.
  * **MongoDB (Port 27017)**: Document store with GUID keys and ACID transaction support.
  * **Qdrant (Port 6333)**: Vector similarity search engine.
  * **Ollama (Port 11434)**: Local GPU/CPU LLM inference engine.
  * **Keycloak (Port 8080/8180)**: Identity and Access Management (IAM) provider.
* **OpenID Connect (OIDC) & OAuth2 JWT Security**:
  Stateless REST APIs validate signed JSON Web Tokens (JWT Bearer tokens) issued by the `personal-library-realm`.
* **Role-Based Access Control (RBAC)**:
  * `LIBRARY_ADMIN`: Full administrative Create, Read, Update, Delete (CRUD), version rollback, and system re-indexing.
  * `CHIEF_RESEARCHER`: Upload, overwrite, AI summarization, and RAG chat.
  * `VIEWER`: Read-only document discovery, BibTeX export, and download.
* **GNU AGPLv3 Network Copyleft**:
  Licensed under the **GNU Affero General Public License v3.0**, enforcing that any modified network service or hosted SaaS deployment must make its complete source code available to all connected users.

### Key Takeaway
Containerized microservices orchestration paired with industry-standard OIDC authentication and explicit RBAC roles provides a secure, auditable, and regulatory-compliant enterprise architecture.

---

## 10. Architecture-as-Code & Automated Visual Documentation Tooling

### The Concept
Architectural documentation often rots because diagrams are drawn manually in external tools and forgotten. This project treats documentation and diagrams as **first-class executable code**, automatically generating synchronized visual artifacts across multiple industry formats.

### Architectural Rationale
* **Single Source of Truth**: Architecture is defined in code (`scripts/generate-architecture-from-mmd.ts`, `scripts/generate-uml-diagrams.ts`, `scripts/generate-mindmap.ts`). When the data model or API changes, running `npm run diagrams` regenerates all diagrams instantly.
* **Multi-Format Output Strategy**: Different stakeholders require different formats:
  * **Developers**: Mermaid (`.mmd`) and PlantUML (`.puml`) files checked into git for diffing and GitHub preview.
  * **Architects**: Scalable Vector Graphics (`.svg`) and Draw.io (`.drawio`) XML files for infinite zoom and collaborative editing.
  * **Management & Compliance**: Ultra-HD 4K PNGs (via Resvg) and archival multi-page landscape PDFs (via PDFKit) for compliance documentation.

### Implementation Highlights
* **Diagram Suite Summary**:
  | Diagram Name | Formats Generated | Script Generator |
  | :--- | :--- | :--- |
  | **C4 System Architecture** | `.svg`, `.png`, `.pdf`, `.mmd`, `.puml`, `.drawio` | `scripts/generate-architecture-from-mmd.ts` |
  | **RAG & AI Data Flow** | `.svg`, `.png`, `.drawio` | `scripts/generate-diagrams.ts` |
  | **Camunda BPMN Ingestion** | `.bpmn`, `.svg`, `.png`, `.pdf` | `scripts/generate-diagrams.ts` |
  | **Java Spring Boot UML** | `.svg`, `.png`, `.mmd`, `.puml` | `scripts/generate-uml-diagrams.ts` |
  | **TypeScript Frontend UML** | `.svg`, `.png`, `.mmd`, `.puml` | `scripts/generate-uml-diagrams.ts` |
  | **Full Capability Mindmap** | `.svg`, `.png`, `.pdf`, `.mmd`, `.puml` | `scripts/generate-mindmap.ts` |
* **Contract-First OpenAPI 3.0**:
  The complete REST interface is documented in `openapi.yaml`, providing an interactive Swagger UI and typed mock generation.

### Key Takeaway
Architecture-as-Code prevents documentation drift, guarantees visual consistency, and empowers teams to maintain up-to-date visual artifacts directly inside their continuous integration pipelines.

---

## 11. Glossary of Acronyms & Terminology

| Acronym | Full Expansion | Architectural Definition |
|---|---|---|
| **RAG** | **Retrieval-Augmented Generation** | Grounding generative LLM responses in verbatim text retrieved from external vector search engines to eliminate hallucinations. |
| **LLM** | **Large Language Model** | Deep learning neural networks (e.g. Llama 3.3 70B, Mistral Large 2411, Gemini 3.8 Flash) trained to process and generate natural language. |
| **BPMN** | **Business Process Model and Notation (BPMN 2.0)** | Standardized graphical notation and executable XML schema for modeling asynchronous enterprise business workflows. |
| **HNSW** | **Hierarchical Navigable Small World** | Multi-layer graph algorithm delivering logarithmic $\mathcal{O}(\log N)$ approximate nearest neighbor vector search in Qdrant. |
| **AST** | **Abstract Syntax Tree** | Hierarchical representation of the syntactic structure of source text, used here for parsing raw LaTeX BibTeX entries. |
| **BPE** | **Byte-Pair Encoding** | Data compression subword tokenization algorithm that iteratively merges the most frequent adjacent byte pairs. |
| **OIDC** | **OpenID Connect** | Identity authentication layer built on top of OAuth 2.0 for single sign-on and token-based user verification via Keycloak. |
| **OAuth** | **Open Authorization (OAuth 2.0)** | Standard authorization protocol providing scoped, delegated access control for applications. |
| **JWT** | **JSON Web Token** | Compact, URL-safe standard (RFC 7519) representing cryptographically signed claims between client and server. |
| **RBAC** | **Role-Based Access Control** | Authorization framework restricting access privileges based on assigned business roles (`LIBRARY_ADMIN`, `CHIEF_RESEARCHER`, `VIEWER`). |
| **API** | **Application Programming Interface** | Formal contract defining methods and protocols for software communication. |
| **REST** | **Representational State Transfer** | Stateless architectural pattern for distributed networked applications communicating via standard HTTP verbs. |
| **JSON** | **JavaScript Object Notation** | Lightweight text-based open standard for structured data serialization. |
| **YAML** | **YAML Ain't Markup Language** | Human-readable data serialization language used for OpenAPI definitions and container orchestration configs. |
| **W3C** | **World Wide Web Consortium** | Global standards organization for the web, defining W3C Web Components specifications. |
| **WCAG** | **Web Content Accessibility Guidelines** | International accessibility guidelines (WCAG 2.1 AA) ensuring digital usability for people with disabilities. |
| **ARIA** | **Accessible Rich Internet Applications** | W3C specification providing semantic attributes for assistive technologies and screen readers. |
| **SPA** | **Single Page Application** | Web application architecture that dynamically re-renders views without full-page server reloads. |
| **DOM** | **Document Object Model** | Tree representation of HTML/XML nodes in the browser memory space. |
| **BNF** | **Backus–Naur Form** | Formal grammar metasyntax used to specify context-free grammar rules for LaTeX/BibTeX sanitization. |
| **DOI** | **Digital Object Identifier** | Persistent, ISO-standardized unique identifier for academic papers and electronic publications. |
| **GUID / UUID** | **Globally / Universally Unique Identifier** | 128-bit identifier guaranteeing universal uniqueness across distributed systems without central collision risk. |
| **AGPL** | **Affero General Public License (GNU AGPLv3)** | Strong copyleft license mandating full source code availability for network-accessible cloud and SaaS services. |
| **C4** | **Context, Containers, Components, Code** | Hierarchical architectural modeling notation for visualizing software architecture across 4 distinct zoom layers. |
| **OCR** | **Optical Character Recognition** | Automated conversion of scanned document imagery into editable, machine-readable digital text. |
| **IAM** | **Identity and Access Management** | Security discipline governing digital identities, user privileges, and authentication mechanisms (via Keycloak). |
| **SSL / TLS** | **Secure Sockets Layer / Transport Layer Security** | Cryptographic communication protocols ensuring encryption, privacy, and integrity over computer networks. |
| **CA** | **Certificate Authority** | Trusted cryptographic entity that issues digital certificates confirming public key ownership. |
| **CRUD** | **Create, Read, Update, Delete** | Four fundamental data persistence operations. |
| **RoPE** | **Rotary Position Embedding** | Transformer position encoding mechanism using complex-plane rotation matrices to capture relative token distances. |

