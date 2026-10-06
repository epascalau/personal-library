# 🎓 Key Learning Topics & Architectural Concepts

This document provides a comprehensive educational and architectural breakdown of the **Personal Library & AI Research Engine**. It details 10 foundational software engineering and systems architecture topics demonstrated in this codebase, explaining **what** each topic is, **why** it was designed this way, **how** it is implemented with concrete code references, and the **key takeaways** for engineering production-grade enterprise systems.
For the formal engineering baseline, see the [Software Requirements Specification (SRS)](technical-requirements.md) ([Interactive HTML](technical-requirements.html)).

---

## Table of Contents

1. [Enterprise UI (User Interface) Architecture with SAP Fiori & UI5 W3C Web Components](#1-enterprise-ui-user-interface-architecture-with-sap-fiori--ui5-w3c-web-components)
2. [Reactive State Management & Decoupled Frontend Patterns](#2-reactive-state-management--decoupled-frontend-patterns)
3. [Pluggable Backend Gateway & Driver Adapter Pattern](#3-pluggable-backend-gateway--driver-adapter-pattern)
4. [Multi-Model Large Language Model (LLM) Orchestration & Comparative Benchmarking](#4-multi-model-large-language-model-llm-orchestration--comparative-benchmarking)
5. [Retrieval-Augmented Generation (RAG) & Vector Database Architecture](#5-retrieval-augmented-generation-rag--vector-database-architecture)
6. [Business Process Model and Notation (BPMN 2.0) as Executable Architecture Documentation](#6-business-process-model-and-notation-bpmn-20-as-executable-architecture-documentation)
7. [Domain-Specific Metadata Engineering: LLM-Based BibTeX Extraction](#7-domain-specific-metadata-engineering-llm-based-bibtex-extraction)
8. [Document Versioning, Lineage & Immutable Rollback Architecture](#8-document-versioning-lineage--immutable-rollback-architecture)
9. [Production-Grade Microservices Topology, Keycloak OIDC (OpenID Connect) & Security](#9-production-grade-microservices-topology-keycloak-oidc-openid-connect--security)
10. [Architecture-as-Code & Automated Visual Documentation Tooling](#10-architecture-as-code--automated-visual-documentation-tooling)
11. [Glossary of Acronyms & Terminology](#11-glossary-of-acronyms--terminology)
12. [Comprehensive Bibliographic Material & Recommended Reading](#12-comprehensive-bibliographic-material--recommended-reading)
    * [12.1 Retrieval-Augmented Generation (RAG) & Vector Information Retrieval](#121-retrieval-augmented-generation-rag--vector-information-retrieval)
    * [12.2 Transformer Foundations, Attention & Large Language Models](#122-transformer-foundations-attention--large-language-models)
    * [12.3 Enterprise Software Architecture, Domain-Driven Design & Clean Code](#123-enterprise-software-architecture-domain-driven-design--clean-code)
    * [12.4 Business Process Automation & BPMN 2.0 Workflows](#124-business-process-automation--bpmn-20-workflows)
    * [12.5 Modern Frontend Architecture, W3C Web Components & Design Systems](#125-modern-frontend-architecture-w3c-web-components--design-systems)
    * [12.6 Distributed Systems, Identity Management & Resilient Data Storage](#126-distributed-systems-identity-management--resilient-data-storage)

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
  import { setTheme as setUi5Theme } from '@ui5/webcomponents-base/dist/config/Theme.js';

  export interface ThemeState {
    theme: SapTheme;      // 'light' | 'dark'
    isDark: boolean;      // derived convenience flag
    themeName: string;    // human-readable label
  }

  // setTheme() stores the derived state; applyToDocument() then synchronizes
  // the Tailwind `dark` class, the `data-sap-theme` root attribute, body
  // palette classes, and the UI5 Web Components runtime theme together.
  toggleTheme(): void {
    this.setTheme(this.state.theme === 'light' ? 'dark' : 'light');
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
  * `appStore`: Navigation and selection, Keycloak user profile, the document catalog, filters, sorting/pagination, upload flow, and version/rollback mutations.
  * `backendStore`: The active `BackendConfig` and its instantiated `adapter`, plus `healthStatus` / `isTestingHealth` from a polled health probe (guarded by a `healthToken` so a slow in-flight probe can never overwrite a newer adapter's status).
  * `themeStore`: SAP theme state and persisted color preference.
  * `i18nStore`: Active language and its resolved translation dictionary.
* **Fine-Grained Unidirectional Data Flow**: Components subscribe only to the slices of state they depend on, preventing unnecessary full-page DOM thrashing.

### Implementation Highlights
* **Observable Store Primitive (`src/main/frontend/core/store.ts`)**:
  Two details make this more than a naive observable: a **shallow-equality short-circuit** that skips notification entirely when a patch changes nothing, and **microtask-batched notification** (`notifyScheduled`) that coalesces multiple `setState` calls in the same tick into a single subscriber pass — eliminating redundant re-renders.
  ```typescript
  export class Store<S extends object> {
    private currentState: S;
    private readonly listeners = new Set<Listener<S>>();
    private notifyScheduled = false;

    get state(): Readonly<S> { return this.currentState; }

    // Accepts either a partial patch or a reducer over the previous state.
    setState(patch: Partial<S> | ((prev: Readonly<S>) => Partial<S>)): void {
      const next = typeof patch === 'function' ? patch(this.currentState) : patch;

      // Skip the notify cycle entirely if no key actually changed.
      const changed = (Object.keys(next) as Array<keyof S>)
        .some(key => !Object.is(this.currentState[key], next[key]));
      if (!changed) return;

      this.currentState = { ...this.currentState, ...next };
      this.notify();   // coalesced into a microtask
    }

    subscribe(listener: Listener<S>, options: SubscribeOptions = {}): Unsubscribe {
      this.listeners.add(listener);
      if (options.immediate) listener(this.currentState);
      return () => this.listeners.delete(listener);
    }
  }
  ```
* **Base Component Lifecycle (`src/main/frontend/core/component.ts`)**:
  An abstract `template()` method produces markup; `requestRender()` re-renders on state change. Teardown is handled by three cooperating primitives: `track(dispose)` registers any `Unsubscribe` for automatic cleanup, `own(child)` cascades destruction to child components, and the `onMount()` / `onDestroy()` hooks bracket the lifecycle — so store subscriptions and DOM listeners are released deterministically and unmounted views are fully garbage-collected.
* **Typed EventBus (`src/main/frontend/core/eventBus.ts`)**:
  A generic `createEventBus<TEvents>()` factory produces a fully type-safe broker from an events *definition* type, so publishers and subscribers are checked against a shared contract at compile time rather than passing stringly-typed payloads. Its principal use is the backend request/response channel defined in `services/backend/events.ts` (`getDocuments`, `uploadDocument`, `rollbackVersion`, `chatWithDocument`, `testHealth`, …), each entry declaring its own `request` and `response` shape.
* **Client-Side i18n Localization (`src/main/frontend/i18n/`)**:
  Each locale is a **statically typed, nested translation dictionary** (not a runtime `t(key)` lookup), so a missing or misspelled key is a compile-time error rather than a stray key leaking into the UI. Views resolve the active dictionary once per render:
  ```typescript
  const t = i18nStore.state.t;
  // ...
  t.backendSettings.presetSpringBoot   // typed; refactor-safe; 5 locales kept in lockstep
  ```
  Covered languages: English, German, French, Spanish, and Romanian.

### Key Takeaway
Decoupled, observable state primitives with explicit component lifecycles provide all the reactivity and performance of modern frameworks with zero build complexity and complete control over the update pipeline.

---

## 3. Pluggable Backend Gateway & Driver Adapter Pattern

### The Concept
The frontend never executes raw `fetch()` calls or communicates directly with API endpoints. All data and AI operations pass through an enterprise **Gateway Facade** (`BackendGateway`) that delegates to swappable **Driver Adapters** implementing a strict TypeScript contract (`BackendAdapter`).

### Architectural Rationale
* **Environment Independence**: The frontend can run standalone in air-gapped demo environments, continuous integration tests, or preview sandboxes using the `MockBackendAdapter` without spinning up Docker, MongoDB, Qdrant, or Ollama.
* **Seamless Local Development**: Frontend developers can build, style, and debug UI components against mock latency and realistic simulated AI responses before backend REST APIs are ready.
* **Hot-Swapping at Runtime**: Users and architects can switch between the three presets exposed in the **Backend Target Settings** dialog — `Integrated Gateway (/api/v1)`, `Direct Java Spring Boot (http://localhost:18080/api/v1)`, and `Local Standalone Engine (Offline / In-Memory)` — without reloading the page. The choice is persisted to `localStorage` under `personal_library_backend_config`.

### Implementation Highlights
* **Adapter Interface (`src/main/frontend/services/backend/types.ts`)**:
  ```typescript
  export interface BackendAdapter {
    readonly id: string;
    readonly name: string;
    readonly config: BackendConfig;

    getDocuments(params: {
      page: number; pageSize: number;
      sortBy: string; sortOrder: 'asc' | 'desc';
      filters: FilterState;
    }): Promise<DocumentListResult>;
    getDocument(guid: string): Promise<DocumentRecord>;
    uploadDocument(payload: { /* file, bibtex, text */ }): Promise<DocumentRecord>;
    overwriteVersion(/* guid, payload, bump */): Promise<DocumentRecord>;
    deleteDocument(guid: string): Promise<{ success: boolean; message: string }>;
    regenerateSummary(guid: string, modelKey: 'llama' | 'mistral'): Promise<SummaryRecord>;
    chatWithDocument(/* guid, question, history */): Promise<ChatResponseResult>;
    extractMetadata(/* fileName, sample */): Promise<BibTeXMetadata & { extractedText?: string }>;
    login(/* username, password */): Promise<{ accessToken: string; user: UserProfile }>;
    logout(): Promise<void>;
    getVersionHistory(guid: string): Promise<DocumentVersionSnapshot[]>;
    rollbackVersion(guid: string, targetVersion: number): Promise<DocumentRecord>;
    getDownloadUrl(guid: string): string;
    getHistoricalDownloadUrl(guid: string, versionNumber: number): string;
    getOpenApiSpec(): Promise<string>;
    testHealth(): Promise<BackendHealthResult>;
  }
  ```
* **Adapter Factory (`src/main/frontend/services/backend/index.ts`)**:
  Concrete drivers are produced from the active `BackendConfig`. Both `integrated` and `springBootDirect` presets resolve to the same `RestBackendAdapter`, differing only in `baseUrl`; only `mock` resolves to the offline driver:
  ```typescript
  export function createBackendAdapter(config: BackendConfig): BackendAdapter {
    if (config.type === 'mock') {
      return new MockBackendAdapter(config);
    }
    return new RestBackendAdapter(config);
  }
  ```
* **Gateway as an Event-Driven Request Broker (`src/main/frontend/services/backend/BackendGateway.ts`)**:
  `BackendGateway` is deliberately *not* a thin method-forwarding wrapper. It subscribes to a dedicated `backendBus`, consumes `BackendRequestEnvelope` messages (`{ requestId, operation, request }`), resolves the currently active adapter through an injected `resolveAdapter()` callback, dispatches the call via an `invokers` lookup table, and publishes a correlated success/failure envelope back onto the bus. Views therefore never hold a reference to any adapter — they publish a request and await the matching response event:
  ```typescript
  export class BackendGateway {
    private readonly disposers: Unsubscribe[] = [];

    constructor(private readonly resolveAdapter: () => BackendAdapter) {}

    start(): void { /* subscribe to backendBus request envelopes */ }
    stop(): void  { /* dispose all subscriptions */ }

    private async execute(envelope: BackendRequestEnvelope): Promise<void> {
      // resolveAdapter() -> invokers[operation] -> publish correlated result
    }
  }
  ```
  This indirection is what makes runtime backend switching safe: swapping the adapter changes only what `resolveAdapter()` returns, with no in-flight view subscriptions to rewire.
* **Offline Mock Adapter (`src/main/frontend/services/backend/MockBackendAdapter.ts`)**:
  A zero-infrastructure driver backed by curated in-memory fixture documents (each shipping pre-authored chunks, BibTeX metadata, and dual-model summaries) plus `localStorage` persistence for user-created entries. Version snapshots and rollbacks are fully implemented. RAG chat is a **keyword-matching simulation** over the fixture chunks — not a real embedding or cosine-similarity computation — and artificial `setTimeout` delays (~400–500 ms) emulate realistic network latency.

### Communication Protocol Architecture: Why HTTP/REST Over WebSockets (ADR-004)
A common question in AI and RAG architectures is whether to maintain persistent, full-duplex WebSockets (`ws://` / `wss://`). In this system, **stateless HTTP/REST is deliberately chosen over WebSockets**:
* **Stateless Horizontally Scalable Infrastructure**: Document uploads, comparative LLM summaries, and RAG search queries map directly to discrete, observable HTTP endpoints (`/api/v1/*`). Unlike WebSockets, stateless HTTP requests require no sticky load balancer sessions, socket state synchronization across cluster nodes, or complex heartbeat reconnection backoffs.
* **Standardized Security & Token Management**: Keycloak OIDC JWT tokens are passed via standard `Authorization: Bearer <token>` HTTP headers on every request. This integrates natively with automated token expiration and silent renewal without complex in-socket re-authentication protocols.
* **Client-Side Event Orchestration via `TypedEventBus`**: While the **Camunda BPMN 2.0 Ingestion Workflow** contains a Send Task referencing `Broadcast Ingestion Status (EventBus / WebSocket)`, in production this notification is handled client-side using the browser-native **`TypedEventBus`** (anchored to a detached DOM `Comment` node). State transitions trigger the reactive `appStore`, providing instantaneous UI updates without maintaining an idle TCP socket.
* *For complete details, see the dedicated [Communication Protocols & Event Architecture Specification (ADR-004)](COMMUNICATION_ARCHITECTURE.md).*

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
* **Fully Local Inference Sovereignty**: Both models run inside the project's own Ollama container — there is **no cloud LLM dependency and no external API key**. An earlier Google Gemini fallback path was removed entirely; if Ollama is unreachable, each model call degrades gracefully to an inline placeholder notice rather than silently switching providers:
  ```java
  } catch (Exception e) {
      log.error("Failed to generate Mistral summary: {}", e.getMessage());
      summaryText = "### Executive & Operational Summary (Mistral)\n\n"
                  + "*Unable to generate summary due to model service communication error.*";
  }
  ```
* **Independent, Individually Regenerable Summaries**: On upload, `generateDualSummaries()` invokes both models **sequentially** (CPU-bound local inference makes concurrent execution counter-productive on typical learner hardware). Afterwards each card can be regenerated **independently** through `POST /api/v1/documents/{guid}/summarize`, so refreshing the Llama analysis never discards the Mistral output or vice versa.

### Implementation Highlights
* **Spring Boot Multi-Model Service (`src/main/java/.../service/AiSummarizationService.java`)**:
  Two Spring AI `ChatClient` beans are injected by qualifier, each pre-bound in `OllamaConfig.java` to its own model tag and temperature. Content is truncated to a 6,000-character excerpt to balance context coverage against local inference time, and wall-clock duration is captured as telemetry:
  ```java
  @Service
  public class AiSummarizationService {
      private final ChatClient llamaChatClient;
      private final ChatClient mistralChatClient;

      public AiSummarizationService(
              @Qualifier("llamaChatClient") ChatClient llamaChatClient,
              @Qualifier("mistralChatClient") ChatClient mistralChatClient) {
          this.llamaChatClient = llamaChatClient;
          this.mistralChatClient = mistralChatClient;
      }

      public SummaryRecord generateSummaryForModel(String modelKey, String title,
                                                   String content, BibTeXMetadata bibtex) {
          long startTime = System.currentTimeMillis();
          String excerpt = content.substring(0, Math.min(content.length(), 6000));
          // model-specific persona prompt assembled here ...
          String summaryText = llamaChatClient.prompt().user(prompt).call().content();

          double durationSeconds = (System.currentTimeMillis() - startTime) / 1000.0;
          return SummaryRecord.builder()
                  .modelKey(modelKey.toLowerCase())
                  .summaryText(summaryText)
                  .durationSeconds(durationSeconds)
                  .durationFormatted(SummaryRecord.formatDuration(durationSeconds))
                  .build();
      }
  }
  ```
  > **Note on model naming:** the UI labels these engines *"Ollama Llama 3.3 (70B Instruct)"* and *"Ollama Mistral Large (2411)"*, but the Ollama tags actually pulled by default are the far smaller `llama3.2` and `mistral` (see `OLLAMA_PRELOAD_MODELS` in `docker-compose.yml`), chosen so the stack runs on ordinary CPU-only learner hardware.
* **Side-by-Side Synchronized Benchmark UI**:
  `ObjectPageView` renders dual summary cards with model badges, execution duration indicators, and independent "Regenerate" actions wired through `appStore.regenerateSummary(model)`.

### Key Takeaway
Multi-model orchestration tailored to distinct user personas delivers higher informational value than a one-size-fits-all model, while keeping inference entirely on-premises preserves data sovereignty and removes per-token cloud cost.

---

## 5. Retrieval-Augmented Generation (RAG) & Vector Database Architecture

### The Concept
To prevent hallucinations and provide verifiable answers, the platform implements a grounded **Retrieval-Augmented Generation (RAG)** pipeline using the **Qdrant** vector database, semantic text chunking, and interactive citation tracking.

### Architectural Rationale
* **Context Window Efficiency**: Documents can span hundreds of pages. Semantic chunking extracts the exact paragraphs relevant to a query rather than overloading the Large Language Model's (LLM's) context window.
* **Grounded Verifiability**: Every claim made by the assistant is accompanied by confidence-scored citations linking directly to verbatim source excerpts.

### Implementation Highlights
* **Paragraph-Aligned Semantic Chunking (`VectorRagService.indexDocumentChunks`)**:
  Text is split on blank lines and paragraphs are accumulated into a buffer that is flushed once it would exceed **~400 characters** (with a 50-character minimum to avoid degenerate fragments). Chunks are therefore **paragraph-aligned and non-overlapping** — the boundary is chosen so a chunk never ends mid-sentence, which is what preserves semantic coherence here; no sliding-window token overlap is used.
* **Qdrant Vector Database Pipeline & Embedding Model**:
  ```
  Raw PDF/DOCX -> Tika/pdf-parse Extractor -> Paragraph Chunker -> nomic-embed-text -> Qdrant HNSW Index
  ```
  Chunks are upserted into the `personal_library_embeddings` collection (`spring.ai.vectorstore.qdrant.collection-name`) using cosine distance over Hierarchical Navigable Small World (HNSW) graphs. Each point carries `documentGuid` and `chunkIndex` metadata so retrieval can be scoped to a single document.
  Embeddings are produced **exclusively on-premises** by **Nomic `nomic-embed-text`** running in the local Ollama container:
  - 768-dimensional open-weights dense vectors.
  - 8,192-token context window with Rotary Position Embeddings (RoPE), enabling passage-length chunks.
  - 100% offline — no embedding data ever leaves the host.

  > **Comparative note (not wired into this codebase):** Google's `text-embedding-004` is referenced throughout the accompanying literature as the *cloud reference baseline* — 768-dim with Matryoshka Representation Learning (truncatable to 256/128 dims), an 8,192-token window, and asymmetric `RETRIEVAL_DOCUMENT` / `RETRIEVAL_QUERY` task prefixes. It is used only for cost/ROI comparison in `docs/unified_financial_ledger_roi_key_takeaways.md`; the running system never calls it.
* **Top-K Vector Retrieval & Grounded Context Injection**:
  A query embedding is matched against the index with `topK = 4` and a `similarityThreshold` of `0.5`; results are then filtered down to the target document's GUID. If the vector search returns nothing (or Qdrant is unavailable), the service falls back to the stored document excerpt so chat degrades rather than fails:
  ```java
  List<Document> similarDocs = vectorStore.similaritySearch(
          SearchRequest.builder()
                  .query(query)
                  .topK(4)
                  .similarityThreshold(0.5)
                  .build()
  );

  String systemPrompt = String.format("""
      You are an expert academic research assistant embedded in the Personal Library enterprise system.
      Answer the user's question accurately using ONLY the context retrieved below from the document:
      Title: "%s"
      Author: %s

      Retrieved Context:
      %s

      Instructions:
      - Ground your answer strictly on the provided context passages.
      - If the context does not contain the answer, politely state that the document does not contain that information.
      - Provide clear, direct, and structured explanations.
      """, title, author, joinedContext);
  ```
* **Interactive Citation Drawer**:
  The UI features an interactive citation inspector. Clicking citation tags (e.g. `[1]`, `[2]`) in chat responses highlights the matching source excerpt and displays a confidence percentage.
  > **Known simplification:** the backend currently emits a **fixed placeholder relevance score of `0.88`** for every vector-retrieved citation (and `1.0` for the excerpt fallback) rather than propagating Qdrant's real cosine distance. The citation *text* is genuinely retrieved; the displayed percentage is not yet a true similarity measure.

### Key Takeaway
Vector-grounded Retrieval-Augmented Generation (RAG) with explicit citation attribution transforms LLM responses from speculative text generation into an auditable, verifiable enterprise research tool.

---

## 6. Business Process Model and Notation (BPMN 2.0) as Executable Architecture Documentation

### The Concept
Document ingestion, extraction, vectorization, and dual-model AI summarization are **formally modeled** as an enterprise workflow using **BPMN 2.0** (OMG standard). The model is maintained as versioned XML in the repository, rendered into the app, and exportable to external modelers.

> **⚠️ Important scope clarification:** this project ships a **static, standards-compliant BPMN 2.0 artifact — not a running workflow engine.** There is no Camunda or Zeebe dependency in `pom.xml`, no `JavaDelegate` or job-worker classes, and no process-state database. The actual ingestion pipeline is executed by ordinary Spring `@Service` orchestration (`DocumentService` → `BibTeXExtractionService` → `AiSummarizationService` → `VectorRagService`). The BPMN file documents and communicates that pipeline; it does not drive it.

### Architectural Rationale
* **Notation as a Shared Language**: BPMN gives architects, compliance reviewers, and developers one unambiguous diagram of the ingestion pipeline that is legible to non-programmers — something a sequence of Java method calls is not.
* **Model/Implementation Traceability**: Because the `.bpmn` XML lives in `src/main/resources/bpmn/` under version control, changes to the modeled pipeline show up as reviewable diffs alongside the code they describe.
* **Portability to a Real Engine**: Modeling to the OMG standard (rather than an ad-hoc flowchart) means the artifact opens unmodified in Camunda Modeler or bpmn.io, and is the natural migration starting point if the pipeline ever *does* need durable process state, async continuation, and retry governance.
* **Why no engine (yet)**: For an educational single-node stack, a workflow engine would add a second datastore, a job-worker runtime, and significant operational surface for a pipeline that currently completes within a single synchronous request. The retry/timer semantics are therefore *modeled* as design intent rather than *enforced*.

### Implementation Highlights
* **Process Definition (`src/main/resources/bpmn/document_ingestion_rag.bpmn`)**:
  A collaboration with **4 lanes** reflecting the real runtime tiers:
  1. **SAP UI5 Client & REST Ingestion** — upload and REST entry point.
  2. **Spring AI Orchestration Tier** — text extraction, BibTeX metadata resolution, persistence.
  3. **Ollama AI Models (Spring AI)** — Llama and Mistral summarization tasks.
  4. **Qdrant Vector Database** — chunk embedding and HNSW upsert.
  The model also declares boundary timer retry cycles (`R3/PT10S`) on the inference tasks, expressing the intended resilience policy for a future engine-backed deployment.
* **Published Copies**: The same artifact is served to the browser as `document-ingestion-rag.bpmn` and rendered to `.svg` / `.png` / `.pdf` by `scripts/generate-diagrams.ts`.
* **In-App BPMN Inspector (`BpmnModalView.ts`)**:
  An in-application dialog lets users inspect the workflow visually alongside the raw BPMN 2.0 XML, and download the file for use in an external modeler.

### Key Takeaway
A formal BPMN 2.0 model is valuable as *architecture documentation* even without an execution engine — but the distinction matters enormously: modeled retry policies and human-in-the-loop gates are **design intent**, not runtime guarantees, until an engine actually interprets them.

---

## 7. Domain-Specific Metadata Engineering: LLM-Based BibTeX Extraction

### The Concept
Academic research relies on the BibTeX bibliographic standard. Rather than requiring researchers to hand-type citation records, the system derives structured `BibTeXMetadata` directly from an uploaded document's filename and text sample — then exposes it through a schema-driven editing UI and standards-compliant export.

### Architectural Rationale
* **LLM Extraction Over Hand-Written Parsers**: Real-world PDFs present bibliographic data in wildly inconsistent layouts (title pages, headers, footnotes, arXiv stamps). A regex/grammar parser would need endless publisher-specific special cases. Instead, `BibTeXExtractionService` prompts the local Llama model to return a **strict JSON object**, which is then deserialized into the typed `BibTeXMetadata` model. The trade-off is explicit: far broader format coverage, at the cost of non-deterministic output that must be defensively validated.
* **Defensive Deserialization**: LLMs routinely wrap JSON in prose or markdown fences. A `cleanJsonResponse()` routine strips code fences and trims to the outermost `{...}` span before parsing; any failure falls back to `fallbackMetadata()`, which synthesizes a usable record from the filename and current year. Extraction therefore **never blocks an upload**.
* **Schema-Driven Form Generation**: Each BibTeX entry type (`BibTeXType`: `@article`, `@book`, `@inproceedings`, `@techreport`, `@misc`, …) implies a different set of meaningful fields, and the Object Page adapts its metadata form accordingly.

### Implementation Highlights
* **Extraction Service (`src/main/java/.../service/BibTeXExtractionService.java`)**:
  ```java
  public BibTeXMetadata extractMetadata(String fileName, String sampleContent) {
      String cleanTitle  = fileName.replaceFirst("[.][^.]+$", "").replaceAll("[_-]", " ");
      String currentYear = String.valueOf(Year.now().getValue());
      try {
          String response = chatClient.prompt().user(prompt).call().content();
          String json     = cleanJsonResponse(response);   // strip ``` fences / surrounding prose
          return jsonMapper.readValue(json, BibTeXMetadata.class);
      } catch (Exception e) {
          return fallbackMetadata(cleanTitle, currentYear, defaultKey);
      }
  }
  ```
* **`BibTeXMetadata` Field Matrix (19 typed fields)**:
  `entryType`, `bibKey`, `title`, `author`, `year`, `month`, `journal`, `booktitle`, `volume`, `number`, `pages`, `publisher`, `edition`, `institution`, `school`, `doi`, `url`, `abstractText`, `keywords`.
* **Export & Interoperability**:
  The Object Page provides clipboard copying and `.bib` download of the rendered entry, so records drop straight into an existing LaTeX bibliography.

### Key Takeaway
Delegating messy, high-variance parsing to an LLM while keeping a **typed schema, deterministic fallback, and defensive deserialization** around it yields far better real-world coverage than a hand-rolled grammar — provided the non-determinism is contained at a well-defined boundary.

---

## 8. Document Versioning, Lineage & Immutable Rollback Architecture

### The Concept
In research workflows, documents evolve: pre-prints become peer-reviewed articles, camera-ready PDFs replace drafts, and BibTeX citations are refined. The platform implements an **in-place version overwrite and immutable snapshot archival** architecture.

### Architectural Rationale
* **Stable Primary Key Continuity**: External bookmarks, citation links, and vector IDs point to a persistent document Globally Unique Identifier (GUID). Overwriting a document updates content in-place without breaking existing references.
* **Immutable Snapshot Preservation**: Before any overwrite or rollback mutation occurs, the system creates a full historical snapshot (`DocumentVersionSnapshot`) containing file metadata, raw BibTeX, text chunks, and both AI summaries.
* **Non-Destructive Rollback**: Rolling back to a previous revision does not erase intervening history; it restores the targeted snapshot's content while advancing the version counter (e.g. rolling back from `v3` to `v1` creates `v4`), preserving a continuous, auditable append-only ledger.

### Implementation Highlights
* **Snapshot Data Contract (`src/main/frontend/types.ts`)**:
  ```typescript
  export interface DocumentVersionSnapshot {
    snapshotGuid: string;        // unique snapshot identifier
    versionNumber: number;       // historical revision number
    fileName: string;
    fileSize: number;
    fileSizeFormatted: string;
    format: string;
    savedAt: string;             // archival timestamp
    bibtex: BibTeXMetadata;      // metadata preserved at this revision
    bibtexRaw: string;
    summaries: { llama?: SummaryRecord; mistral?: SummaryRecord };
    contentExcerpt: string;
    fullContent?: string;
    chunksCount?: number;
    note?: string;               // contextual note describing the snapshot or rollback
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
  * **API Gateway / Applet (Ports 13000/18080)**: Express / Spring Boot serving API routes and the SAP UI5 client.
  * **MongoDB (Port 27017 internal, 37017 host-published)**: Document store with GUID keys and ACID transaction support.
  * **Qdrant (Port 6333 internal, 16333 host-published)**: Vector similarity search engine.
  * **Ollama (Port 11434 internal, 21434 host-published)**: Local GPU/CPU LLM inference engine.
  * **Keycloak (Port 8080 internal, 8180 host-published)**: Identity and Access Management (IAM) provider.
* **OpenID Connect (OIDC) & OAuth2 JWT Security**:
  Keycloak issues signed JSON Web Tokens (JWTs) for the `personal-library-realm`. Spring Security is configured as an **OAuth2 Resource Server** (`SecurityConfig.java`): when a bearer token is present it is cryptographically validated against the realm's JWK set, and a custom `jwtAuthenticationConverter` reads the `realm_access.roles` claim, uppercases each entry, and prefixes it with `ROLE_` to produce standard Spring `SimpleGrantedAuthority` values.
* **Role-Based Access Control (RBAC) — modelled, not yet enforced**:
  The realm (`config/keycloak-realm.json`) defines three roles, mapping onto this intended privilege model:
  * `LIBRARY_ADMIN`: Full administrative Create, Read, Update, Delete (CRUD), version rollback, and system re-indexing.
  * `CHIEF_RESEARCHER`: Upload, overwrite, AI summarization, and RAG chat.
  * `VIEWER`: Read-only document discovery, BibTeX export, and download.

  > **⚠️ Security posture disclosure:** in the current build these roles are **not enforced on any endpoint**. `SecurityConfig` terminates its rule chain with `.anyRequest().permitAll()`, and no controller method carries `@PreAuthorize`, `@Secured`, or `@RolesAllowed`. Token *authentication* (signature validation and claim-to-authority mapping) is fully wired; token *authorization* is deliberately left open so the stack stays usable for teaching without a running Keycloak container. **This configuration is not production-safe.** Hardening it is a natural exercise: replace the terminal `permitAll()` with `.anyRequest().authenticated()` and annotate mutating endpoints (upload, overwrite, delete, rollback) with `@PreAuthorize("hasRole('LIBRARY_ADMIN')")` or equivalent.
* **Defence-in-Depth Reminder**: Because authorization is currently open, network placement is what actually limits exposure — the datastores (MongoDB, Qdrant, Ollama) communicate over the private `library-net` bridge network and are published to the host only on deliberately non-default ports.
* **GNU AGPLv3 Network Copyleft**:
  Licensed under the **GNU Affero General Public License v3.0**, enforcing that any modified network service or hosted SaaS deployment must make its complete source code available to all connected users.

### Key Takeaway
Containerized microservices orchestration paired with industry-standard OIDC authentication gives you an auditable enterprise topology — but authentication and authorization are *separate concerns*. This project wires the former completely and leaves the latter as an explicit, documented gap, which is itself the lesson: a valid token proves **who** a caller is, never **what** they are allowed to do.

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
* **Diagram Suite Summary** (all outputs land in `docs/diagrams/`, mirrored into `src/main/frontend/public/`):
  | Diagram | Generated Formats | Script Generator |
  | :--- | :--- | :--- |
  | **C4 System Architecture** (`system_architecture`) | `.svg`, `.png`, `.pdf` | `scripts/generate-architecture-diagrams.ts` |
  | **RAG & AI Data Flow** (`rag_data_flow`) | `.svg`, `.png`, `.pdf` | `scripts/generate-architecture-diagrams.ts` |
  | **Frontend Architecture** (`frontend_architecture`) | `.svg`, `.png`, `.pdf` | `scripts/generate-architecture-diagrams.ts` |
  | **Mermaid C4 Container Model** (`architecture_diagrams`) | `.mmd`, `.svg`, `.png`, `.pdf` | `scripts/generate-architecture-from-mmd.ts` |
  | **BPMN 2.0 Ingestion Export** (`document_ingestion_rag`) | `.bpmn`, `.svg`, `.png`, `.pdf` | `scripts/generate-diagrams.ts` |
  | **Java Spring Boot UML** | `.puml`, `.mmd`, `.svg`, `.png`, `.pdf` | `scripts/generate-uml-diagrams.ts` |
  | **TypeScript Frontend UML** | `.puml`, `.mmd`, `.svg`, `.png`, `.pdf` | `scripts/generate-uml-diagrams.ts` |
  | **Full Capability Mindmap** | `.mmd`, `.puml`, `.svg`, `.png`, `.pdf` | `scripts/generate-mindmap.ts` |
  | **Domain Entity Model (ERD)** | `.mmd`, `.puml`, `.svg`, `.png`, `.pdf` | `scripts/generate-entity-diagrams.ts` |
  | **System Ontology & Knowledge Graph** | `.ttl`, `.mmd`, `.puml`, `.svg`, `.png`, `.pdf` | `scripts/generate-ontology-diagrams.ts` |
  | **RAG Explainers** (`rag-workflow`, `rag-tokens-embeddings-explained`) | `.svg`, `.png`, `.pdf` | `scripts/generate-rag-diagrams.ts` |

  Run the whole suite with `npm run diagrams`.
  > **Hand-maintained exceptions:** `system_architecture.drawio`, `rag_data_flow.drawio`, `system_architecture.puml`, and `docs/diagrams/MINDMAP.md` are **not** produced by any generator — they are edited manually and must be updated by hand when the architecture changes.
* **Contract-First OpenAPI 3.0**:
  The complete REST interface is documented in `openapi.yaml`, providing an interactive Swagger UI and typed mock generation.

### Key Takeaway
Architecture-as-Code prevents documentation drift, guarantees visual consistency, and empowers teams to maintain up-to-date visual artifacts directly inside their continuous integration pipelines.

---

## 11. Glossary of Acronyms & Terminology

| Acronym | Full Expansion | Architectural Definition |
|---|---|---|
| **RAG** | **Retrieval-Augmented Generation** | Grounding generative LLM responses in verbatim text retrieved from external vector search engines to eliminate hallucinations. |
| **LLM** | **Large Language Model** | Deep learning neural networks (here Llama and Mistral, served locally by Ollama) trained to process and generate natural language. |
| **BPMN** | **Business Process Model and Notation (BPMN 2.0)** | Standardized graphical notation and XML schema for modeling enterprise business workflows. Used here as formal architecture documentation; no workflow engine executes it. |
| **HNSW** | **Hierarchical Navigable Small World** | Multi-layer graph algorithm delivering logarithmic $\mathcal{O}(\log N)$ approximate nearest neighbor vector search in Qdrant. |
| **AST** | **Abstract Syntax Tree** | Hierarchical representation of the syntactic structure of source text, produced by parsers and compilers. *(General CS term — this project deliberately uses LLM-based extraction instead of an AST parser for BibTeX; see §7.)* |
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
| **BNF** | **Backus–Naur Form** | Formal grammar metasyntax for specifying context-free grammar rules, such as the BibTeX entry grammar itself. |
| **DOI** | **Digital Object Identifier** | Persistent, ISO-standardized unique identifier for academic papers and electronic publications. |
| **GUID / UUID** | **Globally / Universally Unique Identifier** | 128-bit identifier guaranteeing universal uniqueness across distributed systems without central collision risk. |
| **AGPL** | **Affero General Public License (GNU AGPLv3)** | Strong copyleft license mandating full source code availability for network-accessible cloud and SaaS services. |
| **C4** | **Context, Containers, Components, Code** | Hierarchical architectural modeling notation for visualizing software architecture across 4 distinct zoom layers. |
| **OCR** | **Optical Character Recognition** | Automated conversion of scanned document imagery into machine-readable text. *(General term — this project extracts text from digital PDFs/DOCX via Apache Tika and `pdf-parse`; no OCR engine is bundled, so scanned image-only PDFs are not supported.)* |
| **IAM** | **Identity and Access Management** | Security discipline governing digital identities, user privileges, and authentication mechanisms (via Keycloak). |
| **SSL / TLS** | **Secure Sockets Layer / Transport Layer Security** | Cryptographic communication protocols ensuring encryption, privacy, and integrity over computer networks. |
| **CA** | **Certificate Authority** | Trusted cryptographic entity that issues digital certificates confirming public key ownership. |
| **CRUD** | **Create, Read, Update, Delete** | Four fundamental data persistence operations. |
| **RoPE** | **Rotary Position Embedding** | Transformer position encoding mechanism using complex-plane rotation matrices to capture relative token distances. |

---

## 12. Comprehensive Bibliographic Material & Recommended Reading

To bridge software engineering theory with production-grade enterprise practice, this section provides an annotated bibliography of peer-reviewed research papers, seminal engineering textbooks, international standards, and authoritative specifications relevant to every layer of the **Personal Library & AI Research Engine**.

---

### 12.1 Retrieval-Augmented Generation (RAG) & Vector Information Retrieval

#### Theory & Foundational Research
1. **Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W., Rocktäschel, T., Riedel, S., & Kiela, D.** (2020). *Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks*. Advances in Neural Information Processing Systems (NeurIPS 2020), 33, 9459–9474. [arXiv:2005.11401](https://arxiv.org/abs/2005.11401)
   * **Theoretical Significance:** Formalized the canonical RAG paradigm, demonstrating that combining pre-trained parametric memory (seq2seq generators) with non-parametric memory (dense vector index) drastically reduces factual hallucinations in open-domain question answering.
   * **Practical Relevance:** Serves as the foundational blueprint for our Spring AI `VectorRagService` and in-browser conversational QA pipelines.

2. **Gao, Y., Xiong, Y., Gao, X., Jia, K., Pan, J., Bi, Y., Dai, Y., Sun, J., & Wang, H.** (2024). *Retrieval-Augmented Generation for Large Language Models: A Survey*. arXiv preprint [arXiv:2312.10997](https://arxiv.org/abs/2312.10997).
   * **Theoretical Significance:** Establishes the taxonomy differentiating *Naive RAG*, *Advanced RAG* (pre/post-retrieval optimizations), and *Modular RAG* (routing, verification loops, hybrid search).
   * **Practical Relevance:** Direct theoretical framework used in our `docs/RAG_ARCHITECTURE_COMPARISON.md` to evaluate this codebase against industry reference baselines.

3. **Malkov, Y. A., & Yashunin, D. A.** (2018). *Efficient and Robust Approximate Nearest Neighbor Search Using Hierarchical Navigable Small World Graphs*. IEEE Transactions on Pattern Analysis and Machine Intelligence (TPAMI), 42(4), 824–836. [doi:10.1109/TPAMI.2018.2889473](https://doi.org/10.1109/TPAMI.2018.2889473)
   * **Theoretical Significance:** Introduced HNSW graphs, solving high-dimensional Approximate Nearest Neighbor (ANN) search with logarithmic time complexity $\mathcal{O}(\log N)$ while maintaining high recall.
   * **Practical Relevance:** The underlying algorithmic engine executed by Qdrant to query cosine distance vectors across document chunks (Spring AI connects over the internal gRPC port 6334).

4. **Kusupati, A., Bhatt, G., Chen, A., Sun, S., Kembhavi, A., & Jain, P.** (2022). *Matryoshka Representation Learning*. Advances in Neural Information Processing Systems (NeurIPS 2022), 35, 30233–30249. [arXiv:2205.13147](https://arxiv.org/abs/2205.13147)
   * **Theoretical Significance:** Introduced nested embedding structures where early vector dimensions capture high-level semantics, enabling adaptive dimensionality truncation without re-training.
   * **Practical Relevance:** Explains the compression mechanism of Google's `text-embedding-004` (768 → 256/128 dims), which this project cites only as a **cloud reference baseline for cost comparison** — the running system embeds locally with `nomic-embed-text` and never calls it.

5. **Reimers, N., & Gurevych, I.** (2019). *Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks*. Proceedings of the 2019 Conference on Empirical Methods in Natural Language Processing (EMNLP 2019), 3982–3992. [arXiv:1908.10084](https://arxiv.org/abs/1908.10084)
   * **Theoretical Significance:** Demonstrated that Siamese BERT networks with cosine similarity reduce cross-encoder comparison overhead from 65 hours to 5 milliseconds for million-sentence corpora.
   * **Practical Relevance:** Theoretical basis for dense sentence/passage embeddings generally; this project's active embedding model is `nomic-embed-text`, served via Spring AI's Ollama embedding client.

6. **Nussbaum, Z., Morris, J. X., Duderstadt, B., & Moshkovitz, A.** (2024). *Nomic Embed: Training a Reproducible Long Context Text Embedder*. arXiv preprint [arXiv:2402.01613](https://arxiv.org/abs/2402.01613).
   * **Theoretical Significance:** Proved that 8,192-token context length embeddings with asymmetric prefix weighting (`search_document:` vs `search_query:`) outperform proprietary 1536-dim embeddings on MTEB benchmarks.
   * **Practical Relevance:** Explains the configuration parameters chosen for our Ollama `nomic-embed-text` service in `docker-compose.yml`.

---

### 12.2 Transformer Foundations, Attention & Large Language Models

#### Theory & Foundational Research
1. **Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., Kaiser, Ł., & Polosukhin, I.** (2017). *Attention Is All You Need*. Advances in Neural Information Processing Systems (NeurIPS 2017), 30, 5998–6008. [arXiv:1706.03762](https://arxiv.org/abs/1706.03762)
   * **Theoretical Significance:** Introduced the multi-head self-attention mechanism $\text{Softmax}\left(\frac{QK^T}{\sqrt{d_k}}\right)V$, eliminating recurrent connections and enabling massively parallelized sequence modeling.
   * **Practical Relevance:** The mathematical backbone of both foundational LLMs (Llama 3.3 and Mistral Large) deployed in this project.

2. **Su, J., Ahmed, M., Lu, Y., Pan, S., Bo, W., & Liu, Y.** (2024). *RoFormer: Enhanced Transformer with Rotary Position Embedding*. Neurocomputing, 568, 127063. [doi:10.1016/j.neucom.2023.127063](https://doi.org/10.1016/j.neucom.2023.127063)
   * **Theoretical Significance:** Replaced absolute sinusoidal positional encodings with relative rotary matrix transformations, providing superior length extrapolation for long context windows.
   * **Practical Relevance:** RoPE is utilized by both Llama 3.3 (128k context) and `nomic-embed-text` (8k context) in our inference pipeline.

3. **Dubey, A. et al. / Meta AI Llama Team** (2024). *The Llama 3 Herd of Models*. arXiv preprint [arXiv:2407.21783](https://arxiv.org/abs/2407.21783).
   * **Theoretical Significance:** Detailed architectural report on dense and fine-tuned 8B/70B/405B transformer decoders with Grouped-Query Attention (GQA) and high-quality instruction alignment.
   * **Practical Relevance:** Documents the Llama model family used for this project's analytical summarization and RAG answer synthesis. Note the stack defaults to the lightweight `llama3.2` tag for CPU-only viability, while the UI labels it with the larger reference variant.

4. **Jiang, A. Q. et al. / Mistral AI Team** (2023). *Mistral 7B*. arXiv preprint [arXiv:2310.06825](https://arxiv.org/abs/2310.06825); and *Mistral Large Technical Report* (2024).
   * **Theoretical Significance:** Introduced Sliding Window Attention (SWA) and efficient inference caching to dramatically lower latency during multi-turn generation.
   * **Practical Relevance:** Underpins our secondary model (`mistral`) in `OllamaConfig.java` configured for high-speed executive synthesis.

---

### 12.3 Enterprise Software Architecture, Domain-Driven Design & Clean Code

#### Practical Engineering & Architectural Literature
1. **Martin, Robert C.** (2017). *Clean Architecture: A Craftsman's Guide to Software Structure and Design*. Prentice Hall. ISBN: 978-0134494166.
   * **Theoretical Significance:** Defines the Dependency Inversion Principle and the "Clean Architecture" ring diagram where business rules remain completely agnostic of frameworks, databases, and UI implementations.
   * **Practical Relevance:** Dictated our layered architecture separating UI5 Views (`frontend/views/`), the abstract state/gateway layer (`frontend/stores/`, `frontend/services/backend/`), and interchangeable backend drivers (`RestBackendAdapter`, `MockBackendAdapter`) behind the `BackendAdapter` interface.

2. **Evans, Eric** (2003). *Domain-Driven Design: Tackling Complexity in the Heart of Software*. Addison-Wesley. ISBN: 978-0321125217.
   * **Theoretical Significance:** Established ubiquitous language, bounded contexts, entities, value objects, aggregates, and domain repositories as the primary paradigm for complex business software.
   * **Practical Relevance:** Implemented in `DocumentEntity.java`, immutable `DocumentVersionSnapshot`, and the LaTeX/BibTeX domain aggregate root models.

3. **Brown, Simon** (2018). *Software Architecture for Developers: Visualise, Document and Explore Your Software Architecture with the C4 Model*. Leanpub.
   * **Theoretical Significance:** Formulated the C4 hierarchical modeling framework (Context, Containers, Components, Code) for representing software architecture at varying stakeholder abstraction levels.
   * **Practical Relevance:** Direct specification for our automated diagram suite (`scripts/generate-architecture-from-mmd.ts`), generating matching C4 diagrams across 6 visual formats.

4. **Hohpe, Gregor, & Woolf, Bobby** (2003). *Enterprise Integration Patterns: Designing, Building, and Deploying Messaging Solutions*. Addison-Wesley. ISBN: 978-0321200686.
   * **Theoretical Significance:** Comprehensive catalog of 65 asynchronous enterprise integration patterns (Message Router, Content-Based Router, Message Filter, Idempotent Receiver).
   * **Practical Relevance:** Vocabulary for describing the event-driven request/response flow between views and backend drivers over the `backendBus` (`BackendGateway`'s correlated request envelopes are an Idempotent Receiver / Message Router pattern in miniature).

---

### 12.4 Business Process Automation & BPMN 2.0 Workflows

#### Specifications & Industrial Practice
1. **Object Management Group (OMG)** (2011). *Business Process Model and Notation (BPMN), Version 2.0.2*. OMG Document Number `formal/2013-12-09`. [https://www.omg.org/spec/BPMN/2.0.2/](https://www.omg.org/spec/BPMN/2.0.2/)
   * **Theoretical Significance:** The definitive international standard for defining business processes in a notation executable by workflow engines while remaining legible to business analysts.
   * **Practical Relevance:** Exact XML grammar implemented in `src/main/resources/bpmn/document_ingestion_rag.bpmn`, which models the document ingestion pipeline including boundary timer retry cycles (`R3/PT10S`) as declared design intent.

2. **Freund, Jakob, & Rücker, Bernd** (2016). *Real-Life BPMN: Using BPMN 2.0 to Analyze, Improve, and Automate Processes in Your Company* (3rd ed.). Camunda Services GmbH / CreateSpace. ISBN: 978-1541163447.
   * **Theoretical Significance:** Pragmatic guide addressing common anti-patterns in executable BPMN, asynchronous service tasks, compensating transactions, and human task routing.
   * **Practical Relevance:** Reference for the BPMN modeling conventions used in `src/main/resources/bpmn/`, and the standard to follow if this project's static model is ever promoted to an engine-executed workflow.

3. **Weske, Mathias** (2019). *Business Process Management: Concepts, Languages, Architectures* (3rd ed.). Springer. [doi:10.1007/978-3-662-59432-2](https://doi.org/10.1007/978-3-662-59432-2)
   * **Theoretical Significance:** Rigorous computer science treatment of Petri nets, workflow nets, structural soundness, and transactional process semantics.
   * **Practical Relevance:** Conceptual foundation for reasoning about state transitions across our multi-stage extraction, chunking, embedding, and dual-model summarization pipeline.

---

### 12.5 Modern Frontend Architecture, W3C Web Components & Design Systems

#### Specifications & Standards Literature
1. **W3C Web Components Specifications** (Custom Elements v1, Shadow DOM v1, HTML Templates). World Wide Web Consortium. [https://www.w3.org/standards/webdesign/](https://www.w3.org/standards/webdesign/)
   * **Theoretical Significance:** Browser-native encapsulation standards providing scoped CSS stylesheets, isolated DOM subtrees, and custom HTML tag lifecycle hooks (`connectedCallback`, `attributeChangedCallback`).
   * **Practical Relevance:** Strict zero-React architectural requirement in this codebase, realized via pure `@ui5/webcomponents` custom elements.

2. **SAP SE** (2024). *SAP Fiori Design Guidelines: Web Components & Enterprise UX Floorplans*. [https://experience.sap.com/fiori-design-web/](https://experience.sap.com/fiori-design-web/)
   * **Theoretical Significance:** Comprehensive design language defining enterprise information hierarchy, visual rhythm, density modes, and standardized analytical floorplans.
   * **Practical Relevance:** Exact UX specifications implemented in `ListReportView.ts` (Analytical List Report) and `ObjectPageView.ts` (Adaptive Object Page with KPI facet headers).

3. **World Wide Web Consortium (W3C)** (2018). *Web Content Accessibility Guidelines (WCAG) 2.1*. W3C Recommendation. [https://www.w3.org/TR/WCAG21/](https://www.w3.org/TR/WCAG21/)
   * **Theoretical Significance:** Formal accessibility standards guaranteeing digital equity across four core principles: Perceivable, Operable, Understandable, and Robust (POUR).
   * **Practical Relevance:** Satisfied natively through UI5 components and accessible keyboard navigation in our ShellBar, Table, and Citation inspection dialogs.

---

### 12.6 Distributed Systems, Identity Management & Resilient Data Storage

#### Security Specifications & Systems Literature
1. **Kleppmann, Martin** (2017). *Designing Data-Intensive Applications: The Big Ideas Behind Reliable, Scalable, and Maintainable Systems*. O'Reilly Media. ISBN: 978-1449373320.
   * **Theoretical Significance:** Definitive reference covering consensus, replication, partitioning, stream processing, ACID vs. BASE trade-offs, and fault-tolerant distributed storage.
   * **Practical Relevance:** Guided our dual-datastore architecture: MongoDB for flexible polymorphic metadata with BSON indexing alongside Qdrant for immutable vector space embedding storage.

2. **Hardt, D. (Ed.)** (2012). *The OAuth 2.0 Authorization Framework*. RFC 6749, Internet Engineering Task Force (IETF). [doi:10.17487/RFC6749](https://doi.org/10.17487/RFC6749); and **Jones, M., Bradley, J., & Sakimura, N.** (2015). *JSON Web Token (JWT)*. RFC 7519, IETF. [doi:10.17487/RFC7519](https://doi.org/10.17487/RFC7519).
   * **Theoretical Significance:** Industry-standard protocol specifications establishing delegated token issuance, stateless bearer authentication, and cryptographic claim verification.
   * **Practical Relevance:** The exact protocol executed between our frontend, Keycloak identity server (port 8180), and the Spring Security `jwtDecoder` resource server filter chain.

3. **Sakimura, N., Bradley, J., Jones, M., de Medeiros, B., & Mortimore, C.** (2014). *OpenID Connect Core 1.0 incorporating errata set 1*. OpenID Foundation. [https://openid.net/specs/openid-connect-core-1_0.html](https://openid.net/specs/openid-connect-core-1_0.html)
   * **Theoretical Significance:** Identity layer built on OAuth 2.0 enabling clients to verify end-user identity through standardized UserInfo endpoints and ID tokens.
   * **Practical Relevance:** Implemented via our Keycloak realm configuration (`config/keycloak-realm.json`), the `AuthModalView.ts` login dialog, and the Spring Boot `AuthController` resolving claims from the `@AuthenticationPrincipal Jwt`.

