# Personal Library: Enterprise AI Document Management System

> **AI reproduction specification:** [`AI-REPRODUCTION-SPEC.md`](AI-REPRODUCTION-SPEC.md)
> contains the current architecture, implementation constraints, reproduction
> procedure, and acceptance checklist for rebuilding this project.

Personal Library is an enterprise-grade document management and research platform built with SAP Fiori Web Components following SAP UI5 floorplans (List Report and Object Page), automated BibTeX metadata extraction, vector-based semantic retrieval via Qdrant, dual-model Artificial Intelligence (AI) summarization using Large Language Models (LLMs: Llama and Mistral), and an interactive Retrieval-Augmented Generation (RAG) conversational research pipeline.

---

## 🏛️ System Architecture

```
                                  ┌─────────────────────────────┐
                                  │      Keycloak (OIDC)        │
                                  │  personal-library-realm     │
                                  └──────────────┬──────────────┘
                                                 │ JWT / Bearer
                                                 ▼
                                  ┌─────────────────────────────┐
                                  │   nginx (single ingress)    │
                                  │   :8088 -> /api/v1 & other  │
                                  └──────┬───────────────┬──────┘
                                         │               │
                           ┌─────────────▼───┐   ┌───────▼──────────────┐
                           │  Node/Express   │   │  API Gateway /        │
                           │  Frontend +     │   │  Spring Boot Document │
                           │  mock backend   │   │  Pipeline & RAG       │
                           └─────────────────┘   └──────────┬───────────┘
                                                             │
┌─────────────────────────┐                                 │
│  Personal Library Web   │ ◄───────────────────────────────┘
│  (SAP Fiori Floorplans: │  HTTP
│   List Report & Object) │
└─────────────────────────┘
                                   ┌───────────────┼───────────────┐
                                   ▼               ▼               ▼
                        ┌────────────────┐ ┌──────────────┐ ┌──────────────┐
                        │    MongoDB     │ │    Qdrant    │ │    Ollama    │
                        │ Document Meta, │ │ Vector DB &  │ │ Dual Models: │
                        │ BibTeX, Audits │ │ RAG Chunks   │ │Llama/Mistral │
                        └────────────────┘ └──────────────┘ └──────────────┘
```

### Technical Stack
* **Frontend:** Vanilla TypeScript, Vite, SAP Fiori / UI5 Web Components with light and dark themes.
* **UI Patterns:** SAP Fiori List Report Floorplan & SAP Fiori Object Page Floorplan.
* **Authentication & IAM:** Keycloak / OpenID Connect (OIDC) & OAuth 2.0 (Open Authorization) client.
* **AI & Embeddings:** Spring AI, local Ollama Large Language Models (LLMs: `llama` and `mistral` models), fully offline — no cloud API keys required.
* **Databases & Vector Stores:**
  * **MongoDB:** Document records, BibTeX properties, version histories, audit logs.
  * **Qdrant Vector Database:** Embedding index with HNSW (Hierarchical Navigable Small World) graphs for high-precision semantic content search and Retrieval-Augmented Generation (RAG).
  * **Local File Storage:** Encrypted physical document assets (`md`, `docx`, `pdf`, `txt`, `doc`, `xls`, `xlsx`, `ppt`, `pptx`).
* **API Documentation:** OpenAPI 3.0.3 REST specification (`/openapi.yaml` and interactive viewer).
* **Architectural Learning Guide:** Detailed engineering breakdown of 10 core architectural patterns in [docs/LEARNING_TOPICS.md](docs/LEARNING_TOPICS.md) ([Web Portal](docs/learning-topics.html)).
* **Illustrated AI Explainer:** Plain English & mathematical breakdown of Tokens, Qdrant HNSW graphs, and Summarization using *The Wizard of Oz* in [docs/EXPLAINER_WIZARD_OF_OZ.md](docs/EXPLAINER_WIZARD_OF_OZ.md) ([Interactive Portal](docs/wizard-of-oz-explainer.html)).
* **RAG Architecture Comparison:** Deep-dive gap analysis evaluating this codebase against canonical modular Reference RAG architectures in [docs/RAG_ARCHITECTURE_COMPARISON.md](docs/RAG_ARCHITECTURE_COMPARISON.md) ([Web Portal](docs/rag-architecture-comparison.html)).
* **Financial Ledger & Commercial ROI Analysis:** Comprehensive financial ledger, commercial market valuation ($118.31 compute vs. $16,500 traditional build), and cost driver takeaways in [docs/unified_financial_ledger_roi_key_takeaways.md](docs/unified_financial_ledger_roi_key_takeaways.md) ([Web Portal](docs/unified-financial-ledger-roi.html)).

---

## 🎓 Architecture & Engineering Learning Guide

For engineers, architects, and researchers studying this codebase, a comprehensive deep-dive guide is available at **[`docs/LEARNING_TOPICS.md`](docs/LEARNING_TOPICS.md)** (or view the interactive guide at **[`docs/learning-topics.html`](docs/learning-topics.html)**). It details 10 foundational enterprise patterns implemented across the project:

| # | Topic | Key Concepts Demonstrated | Code Locations |
|---|---|---|---|
| **1** | [SAP Fiori UI5 Architecture](docs/LEARNING_TOPICS.md#1-enterprise-ui-user-interface-architecture-with-sap-fiori--ui5-w3c-web-components) | Framework-free W3C Web Components (`@ui5/webcomponents` v2), List Report & Object Page floorplans, dynamic Light/Dark theming | `src/main/frontend/views/`, `styles.css` |
| **2** | [Reactive State Management](docs/LEARNING_TOPICS.md#2-reactive-state-management--decoupled-frontend-patterns) | Observable `Store<T>` micro-framework, fine-grained subscriptions, component lifecycle (`track`, `unmount`), typed `EventBus`, client-side i18n engine | `src/main/frontend/core/`, `stores/`, `i18n/` |
| **3** | [Pluggable Backend Gateway](docs/LEARNING_TOPICS.md#3-pluggable-backend-gateway--driver-adapter-pattern) | Gateway Facade & Driver Adapter pattern, production REST vs. standalone mock driver, zero-downtime hot-swapping at runtime | `src/main/frontend/services/backend/` |
| **4** | [Multi-Model LLM Orchestration](docs/LEARNING_TOPICS.md#4-multi-model-large-language-model-llm-orchestration--comparative-benchmarking) | Specialized dual personas (Llama 3.3 70B analytical vs. Mistral Large 2411 executive) running fully local via Ollama, race-condition-safe parallel execution | `src/main/java/.../AiSummarizationService.java`, `server.ts` |
| **5** | [Vector RAG Architecture](docs/LEARNING_TOPICS.md#5-retrieval-augmented-generation-rag--vector-database-architecture) | Paragraph-aligned chunking (~400 chars, non-overlapping), Qdrant HNSW cosine indexing, `topK=4` / `similarityThreshold=0.5` grounded retrieval, citation drawer | `src/main/java/.../VectorRagService.java`, `ObjectPageView.ts` |
| **6** | [BPMN 2.0 as Architecture Documentation](docs/LEARNING_TOPICS.md#6-business-process-model-and-notation-bpmn-20-as-executable-architecture-documentation) | Reading BPMN 2.0 XML, lanes, service tasks and modeled retry boundaries (`R3/PT10S`) as a **static** design artifact — no workflow engine is embedded — plus the in-app BPMN viewer | `src/main/resources/bpmn/document_ingestion_rag.bpmn`, `BpmnModalView.ts` |
| **7** | [LLM-Based BibTeX Metadata Extraction](docs/LEARNING_TOPICS.md#7-domain-specific-metadata-engineering-llm-based-bibtex-extraction) | Prompt-driven extraction to JSON, response sanitization, deterministic fallback metadata, 19 typed `BibTeXMetadata` fields, schema-driven form generation | `src/main/java/.../BibTeXExtractionService.java`, `BibTeXMetadata.java` |
| **8** | [Versioning & Immutable Rollback](docs/LEARNING_TOPICS.md#8-document-versioning-lineage--immutable-rollback-architecture) | Stable GUID continuity, immutable snapshot archiving (`DocumentVersionSnapshot`), non-destructive append-only rollback, historical asset download | `DocumentService.java`, `MockBackendAdapter.ts`, `ObjectPageView.ts` |
| **9** | [Microservices Topology & Security](docs/LEARNING_TOPICS.md#9-production-grade-microservices-topology-keycloak-oidc-openid-connect--security) | Multi-container Docker Compose topology, Keycloak OIDC/OAuth2 JWT bearer validation, realm RBAC roles (**modelled but not yet enforced**), GNU AGPLv3 network copyleft | `docker-compose.yml`, `SecurityConfig.java` |
| **10** | [Architecture-as-Code Tooling](docs/LEARNING_TOPICS.md#10-architecture-as-code--automated-visual-documentation-tooling) | Programmatic diagram generation (SVG, 4K PNG via Resvg, archival PDFs via PDFKit, Draw.io XML), dual-stack Java/TypeScript UML, OpenAPI 3.0 | `scripts/generate-*.ts`, `docs/diagrams/` |

---

## 📖 Glossary of Acronyms & Terminology

To assist developers, researchers, and students, all acronyms used throughout this project and its documentation are defined below:

| Acronym | Full Expansion | Architectural Definition & Role in Project |
|---|---|---|
| **RAG** | **Retrieval-Augmented Generation** | An AI architecture that combines information retrieval (querying a vector database for relevant text chunks) with generative language modeling, eliminating model hallucinations by grounding answers in verbatim document sources. |
| **LLM** | **Large Language Model** | Deep learning neural networks trained on extensive text data (e.g., Llama 3.3 70B, Mistral Large 2411) capable of natural language understanding, synthesis, and summarization. |
| **BPMN** | **Business Process Model and Notation (BPMN 2.0)** | An ISO/IEC 19510 standard graphical notation for modeling end-to-end enterprise workflows in XML. This project ships a BPMN file as **design documentation only** — it is viewable in Camunda Modeler and in the in-app viewer, but **no BPMN engine runs here**; ingestion is orchestrated by ordinary Spring `@Service` calls. |
| **HNSW** | **Hierarchical Navigable Small World** | A state-of-the-art graph algorithm for Approximate Nearest Neighbor (ANN) vector search used in Qdrant, providing logarithmic $\mathcal{O}(\log N)$ retrieval speed across high-dimensional embedding spaces. |
| **AST** | **Abstract Syntax Tree** | A hierarchical tree structure representing the abstract syntactic structure of source code or markup. Used in this codebase to parse, validate, and serialize LaTeX BibTeX entries. |
| **BPE** | **Byte-Pair Encoding** | A subword tokenization algorithm that iteratively merges the most frequent pairs of adjacent bytes/characters to represent open-vocabulary human language using a compact token dictionary. |
| **OIDC** | **OpenID Connect** | An identity authentication protocol built on top of the OAuth 2.0 framework that allows client applications to verify the identity of an end-user based on authentication by an authorization server (Keycloak). |
| **OAuth** | **Open Authorization (OAuth 2.0)** | The industry-standard authorization framework that enables third-party applications to obtain delegated, scoped HTTP access to protected resources. |
| **JWT** | **JSON Web Token** | An open, industry-standard (RFC 7519) method for representing claims securely between two parties as digitally signed, cryptographically verified tokens. |
| **RBAC** | **Role-Based Access Control** | An authorization security approach that restricts system operations based on assigned business roles (`LIBRARY_ADMIN`, `CHIEF_RESEARCHER`, `VIEWER`). |
| **API** | **Application Programming Interface** | A defined specification of rules and protocols enabling software applications to communicate and exchange data. |
| **REST** | **Representational State Transfer** | A stateless, hypermedia-driven architectural style for networked distributed software applications operating over standard HTTP protocols (`GET`, `POST`, `PUT`, `DELETE`). |
| **JSON** | **JavaScript Object Notation** | A lightweight, language-independent, human-readable data-interchange format. |
| **YAML** | **YAML Ain't Markup Language** | A human-friendly data serialization standard commonly used for configuration files and OpenAPI contract specifications. |
| **W3C** | **World Wide Web Consortium** | The primary international standards organization developing foundational specifications for the World Wide Web, including W3C Web Components. |
| **WCAG** | **Web Content Accessibility Guidelines** | Global accessibility benchmark standards developed by the W3C. This application implements SAP UI5 components compliant with WCAG 2.1 Level AA. |
| **ARIA** | **Accessible Rich Internet Applications** | A W3C specification defining semantic HTML attributes to ensure web applications are fully navigable by assistive screen readers. |
| **SPA** | **Single Page Application** | A web application architecture that dynamically updates the Document Object Model (DOM) without triggering traditional full-page browser refreshes. |
| **DOM** | **Document Object Model** | The language-agnostic tree interface representing the nodes and objects in an HTML or XML document. |
| **BNF** | **Backus–Naur Form** | A formal metasyntax notation used to describe the syntax of context-free grammars, utilized here for LaTeX/BibTeX formatting and sanitization. |
| **DOI** | **Digital Object Identifier** | A persistent alphanumeric string assigned by the International DOI Foundation to uniquely identify academic journals, papers, and books. |
| **GUID / UUID** | **Globally / Universally Unique Identifier** | A 128-bit label used in software systems to guarantee global uniqueness across distributed databases without central coordination. |
| **AGPL** | **Affero General Public License (GNU AGPLv3)** | A strong copyleft open-source license ensuring that network-deployed SaaS and cloud services provide their full corresponding source code to connected users. |
| **C4** | **Context, Containers, Components, and Code** | A standardized architectural modeling framework for software systems designed to visualize architecture across 4 hierarchical zoom levels. |
| **OCR** | **Optical Character Recognition** | Electronic or mechanical conversion of scanned or digital document images into editable, machine-readable text. |
| **IAM** | **Identity and Access Management** | The framework of policies and technologies ensuring that authorized personnel have the appropriate access to technology resources (implemented via Keycloak). |
| **SSL / TLS** | **Secure Sockets Layer / Transport Layer Security** | Cryptographic network protocols designed to provide end-to-end communication security, privacy, and data integrity over the Internet. |
| **CA** | **Certificate Authority** | A trusted entity that issues digital certificates validating the cryptographic authenticity and ownership of public keys. |
| **CRUD** | **Create, Read, Update, Delete** | The four foundational operations of persistent digital storage. |
| **RoPE** | **Rotary Position Embedding** | A transformer position encoding mechanism that represents token position information through complex-plane rotation matrices. |

---

## 🚀 Quick Start & Installation

### Option 1: Running in Google AI Studio / Development Server
```bash
# 1. Install dependencies
npm install

# 2. Start the integrated dev server (Port 13000)
npm run dev
```
Open your browser at `http://localhost:13000`.

---

### Frontend Architecture (Vanilla TypeScript + SAP UI5 Web Components)
The complete UI is grouped under `src/main/frontend/`, mirroring the way the Java sources are grouped
under `src/main/java/`. Vite treats this directory as its project root, while the bundled output is
still emitted to `dist/` at the repository root:

* `src/main/frontend/`
  * `index.html`: Vite entry document.
  * `main.ts`: Application bootstrap — installs the global stylesheet patch and mounts `AppView`.
  * `index.css`: Tailwind entry stylesheet processed by Vite.
  * `public/styles.css`: Global stylesheet served at `/styles.css` and adopted into every UI5 shadow root.
  * `core/`: Framework primitives — `html` templating, `Component` base class, reactive `store`, and the type-safe `eventBus`.
  * `views/`: Fiori floorplans and dialogs (`ListReportView`, `ObjectPageView`, `ShellBarView`, `dialogs/`).
  * `stores/`: Reactive application state (`appStore`, `backendStore`, `i18nStore`, `themeStore`).
  * `services/backend/`: Backend adapters and the event-driven `BackendGateway`.
  * `ui5/`: UI5 Web Components bootstrap, icon registry, SVG language flags, and the global stylesheet patch.
  * `i18n/`: Translation catalogues (en, de, fr, es, ro).

> 📘 **Deep dive:** see [`docs/FRONTEND_ARCHITECTURE.md`](docs/FRONTEND_ARCHITECTURE.md) for the full rendering-model rationale, state management, the backend adapter event-flow, and a complete `package.json` build-task reference table.

---

### Decoupled UI & Pluggable Backend Adapter Architecture
The UI is decoupled from the backend implementation via the **Backend Adapter Pattern** (`src/main/frontend/services/backend/` and the event-driven `BackendGateway`):
* **No hardcoded endpoints in UI components:** `ListReportView`, `ObjectPageView`, `UploadDialogView`, `VersionOverwriteDialogView`, and `AuthModalView` dispatch typed events on the gateway.
* **Instant Target Switching:** Users can switch backends directly from the UI header (ShellBar > **Backend Target Settings**):
  1. **Direct Java Spring Boot (`http://localhost:18080/api/v1`)**: **Default.** The fully real stack — genuine MongoDB persistence, genuine Qdrant vector search, and genuine Ollama inference via Spring AI.
  2. **Integrated Gateway (`/api/v1`)**: Lightweight dev-mode convenience, served by the Node.js gateway (`src/main/server/server.ts`). It is a **self-contained in-memory simulation** — documents, summaries, and "vector search" (plain substring matching) live only in process memory and reset on restart — with the single genuine external integration being direct calls to the local Ollama daemon for summarization/chat. It does **not** talk to MongoDB, Qdrant, or the Java Spring AI stack.
  3. **Custom Remote Backend / Microservice**: Connect to a custom remote API URL (e.g. cloud Kubernetes cluster or custom FastAPI backend) with optional Bearer token / API Key and custom timeout.
  4. **Local Standalone Engine (Offline / In-Memory)**: Zero-server mock engine storing all documents, summaries, and vector chat in browser `localStorage`.
* **To plug in a new backend in the future (e.g. Python FastAPI, Go, Supabase, or AWS Lambda):**
  1. Implement the `BackendAdapter` interface (`src/main/frontend/services/backend/types.ts`).
  2. Register the adapter in `src/main/frontend/services/backend/index.ts`.
  3. The entire UI automatically works without changing a single line of component code.

---

### Java Spring Boot Backend (Maven)
The full Java Spring Boot project is located in `src/main/java/` and configured via `pom.xml`:

```bash
# Compile and package the Java Spring Boot JAR
mvn clean package -DskipTests

# Run the Spring Boot application locally (Port 18080)
mvn spring-boot:run
```

#### Java Backend Architecture:
* `src/main/java/com/personallibrary/`
  * `PersonalLibraryApplication.java`: Main Spring Boot application entry point with `@EnableAsync`.
  * `config/`
    * `SecurityConfig.java`: Keycloak / OIDC OAuth2 Resource Server JWT validation, CORS, and role mapping.
    * `OllamaConfig.java`: Spring AI Ollama configuration for dual models (`llama` and `mistral`).
    * `OpenApiConfig.java`: SpringDoc Swagger 3.0 OpenAPI documentation.
  * `model/`
    * `DocumentEntity.java`: MongoDB document entity with independent GUID, version lineage, physical asset path, BibTeX metadata, and dual summaries.
    * `BibTeXMetadata.java` & `BibTeXType.java`: Standard BibTeX fields and `.bib` raw string serializer.
    * `SummaryRecord.java`: Summaries with duration tracking in minutes and seconds (`durationFormatted`).
    * `DocumentChunk.java`: Text chunks for vector indexing.
  * `repository/`
    * `DocumentRepository.java`: Spring Data MongoDB repository for GUID and version lineage lookups.
    * `DocumentRepositoryCustom.java` & `DocumentRepositoryCustomImpl.java`: `MongoTemplate` fragment assembling the dynamic List Report search (fileName, title, author, edition, format, and full-text content), with all user input treated as literal text.
  * `service/`
    * `DocumentService.java`: Independent GUID versioning, storage, and pagination.
    * `AiSummarizationService.java`: Dual-model summarization via Spring AI Ollama (`llama` and `mistral`).
    * `VectorRagService.java`: Qdrant vector store indexing and Llama RAG conversational chat.
    * `BibTeXExtractionService.java`: Spring AI document metadata extraction.
    * `StorageService.java`: Physical asset file system storage and Apache Tika text parsing.
  * `controller/`
    * `DocumentController.java`: REST controller implementing the List Report and Object Page APIs.
    * `AuthController.java`: Keycloak session and user profile controller.
* `src/main/resources/`
  * `application.yml`: Standard configuration with MongoDB, Qdrant, Ollama, and Keycloak connections.
  * `application-docker.yml`: Docker network profile.

> 📘 **Deep dive:** see [`docs/BACKEND_ARCHITECTURE.md`](docs/BACKEND_ARCHITECTURE.md) for the full package-by-package breakdown, the RAG/AI pipeline, the versioning & rollback engine, security, error handling, and the complete Maven build-task reference.

---

### Option 2: Production Deployment with Docker Compose

Ensure Docker and Docker Compose are installed.

> **First-time setup — generate the npm lockfile.** The Dockerfile installs
> dependencies with `npm ci`, which requires an existing `package-lock.json`.
> The lockfile is intentionally **not committed to the repository**
> (see `.gitignore`), so generate it locally once before your first build —
> and again whenever `package.json` dependencies change:
> ```bash
> npm install --package-lock-only --ignore-scripts --no-audit --no-fund
> ```
> This writes `package-lock.json` into the project root without installing
> `node_modules` or running any package scripts. Docker Compose will pick it
> up automatically from the build context on the next step.

```bash
# 1. Pull and start all infrastructure containers (MongoDB, Qdrant, Ollama, Keycloak, Web App)
docker compose up -d --build

# 2. Verify container health status
docker compose ps

# 3. Watch the automatic model download (llama3.2, mistral, nomic-embed-text)
docker compose logs -f ollama | grep ollama-entrypoint

# 4. Confirm the models are installed
docker exec -it personal-library-ollama ollama list

# 5. Watch the one-shot initial document seeding (runs once the app is healthy)
docker compose logs -f library-seeder
```

The Ollama container pulls every model the backend needs on first start and
caches them in the `ollama_models` volume, so later starts are instant. Override
the list with the `OLLAMA_PRELOAD_MODELS` environment variable (space separated)
or pull extra models manually with
`docker exec -it personal-library-ollama ollama pull <model>`.

#### Automatic Initial Document Seeding

So the stack is never handed over with an empty List Report, `docker compose up
--build` also runs a short-lived `library-seeder` container. It waits until
`personal-library-app` reports healthy, then ingests two starter documents:

| Source | Document |
| :--- | :--- |
| `./initial_data/` (every bundled `.pdf`, `.docx`, `.doc`, `.txt`, `.md`) | *Natural Language Processing: A 15-Minute Primer* |
| Public CDN download | *The Wonderful Wizard of Oz* — the document used by the RAG examples in the docs |

**Why it uploads through the REST API instead of writing to the databases
directly:** `POST /api/v1/documents` runs the full ingestion pipeline — Tika
text extraction, BibTeX metadata extraction, chunking, 768-dimensional
embeddings into Qdrant, and the dual Llama/Mistral summaries. Inserting rows
straight into MongoDB and Qdrant would create documents that *appear* in the UI
but return nothing from semantic retrieval, which is exactly the class of
"looks right, isn't" failure this project tries to avoid.

Behaviour worth knowing:
* **Idempotent** — the seeder filters the list report by file name first, so
  repeated `docker compose up` runs never create duplicates.
* **Non-fatal** — an offline machine or an unavailable CDN logs a warning and
  leaves the rest of the stack healthy; nothing blocks startup.
* **Slow by design** — the first ingestion is LLM-bound and can take several
  minutes per document on CPU-only inference (`SEED_MAX_TIME`, default 900s).
* **Enterprise TLS** — any certificate in `./certs` is appended to the CA bundle
  before the HTTPS download, matching how the Dockerfile trusts a corporate
  TLS-intercepting proxy.

To add your own starter documents, drop files into `./initial_data/` and re-run
`docker compose up library-seeder`. Tuning knobs (all optional, set in `.env`):

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `SEED_ENABLED` | `true` | Set to `false` to skip seeding entirely |
| `SEED_REMOTE_PDF_URL` | Wizard of Oz CDN URL | Override the remote document |
| `SEED_REMOTE_PDF_NAME` | `the-wonderful-wizard-of-oz.pdf` | File name recorded for the remote document |
| `SEED_MAX_TIME` | `900` | Per-document upload timeout in seconds |

#### Network Configuration (corporate environments)

Containers do **not** use the host's `/etc/resolv.conf` — they inherit the Docker daemon's resolver. If `/etc/docker/daemon.json` pins a public DNS server your network degrades or blocks, Ollama model pulls and the seeder's PDF download fail while the host resolves fine. The fault is often *intermittent*, so a multi-gigabyte model pull dies partway through even though a quick connectivity test passes.

`./scripts/rebuild.sh` detects this automatically (it compares the daemon's pinned resolver against the host's) and overrides it for that run. Plain `docker compose up` has no such preflight, so persist the value in `.env`:

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `LIBRARY_DNS` | *(unset)* | DNS resolver for the `ollama` and `library-seeder` containers. Set it to the `nameserver` from the host's `/etc/resolv.conf`. |
| `ENTERPRISE_HTTP_PROXY` | *(unset)* | Outbound HTTP proxy for Ollama model pulls |
| `ENTERPRISE_HTTPS_PROXY` | *(unset)* | Outbound HTTPS proxy for Ollama model pulls |
| `ENTERPRISE_NO_PROXY` | `localhost,127.0.0.1,qdrant,mongodb,keycloak` | Hosts bypassing the proxy — **keep the service names**, or internal traffic breaks |

```bash
grep nameserver /etc/resolv.conf     # e.g. 10.0.0.53
echo "LIBRARY_DNS=10.0.0.53" >> .env
```

Always confirm models are present before judging RAG quality:

```bash
docker exec personal-library-ollama ollama list   # expect 3 models
```

> 📘 For every configuration knob, its default, and the exact file or class that
> consumes it, see **[DEVOPS_GUIDE.md §4.5](docs/DEVOPS_GUIDE.md)**. For what a
> factory reset destroys and how each piece is restored, see **§4.6**.

Access Points:
* **Web Application (via nginx, recommended):** `http://localhost:8088`
* **Web Application (direct, dev/bypass):** `http://localhost:13000`
* **OpenAPI Spec:** `http://localhost:8088/api/v1/openapi.yaml`
* **Swagger Editor (interactive OpenAPI viewer):** `http://localhost:8088/swagger/?url=openapi.yaml` (also directly on `http://localhost:8090/?url=openapi.yaml`)
* **Keycloak Administration:** `http://localhost:8180` (admin/admin)
* **Qdrant Vector Dashboard:** `http://localhost:16333/dashboard`
* **Mongo Express (MongoDB web viewer):** `http://localhost:8091`
* **Document Storage Browser (uploaded files on disk, read-only):** `http://localhost:8092`

#### Enterprise Single Ingress: Nginx Reverse Proxy

`docker compose up` also starts an `nginx` container that fronts both
application runtimes behind a single published port (`8088` — deliberately
not the standard `80`, so this educational stack never collides with
another local web server already bound to port 80):

| Path | Routed to | Purpose |
| :--- | :--- | :--- |
| `/api/v1/*`, `/actuator/*` | Java Spring Boot (`:18080`) | Real, persistent backend (MongoDB/Qdrant/Ollama) |
| everything else | Node/Express gateway (`:13000`) | Frontend bundle + "Integrated" mock backend routes |

**Why this matters for an enterprise deployment:**
* **Same-origin API calls** — the frontend and the real backend share one
  origin, so the Java backend's CORS policy (currently permissive, see
  `SecurityConfig.corsConfigurationSource()`) can be tightened to same-origin
  only in environments that route exclusively through nginx.
* **Single ingress** — only port `8088` (or `443` once TLS is configured) needs
  to be opened on a firewall/load balancer; internal runtime ports are never
  exposed directly to the network.
* **Centralized hardening** — gzip, baseline security headers
  (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`), request
  size limits, and generous proxy timeouts for long-running LLM calls are all
  enforced in one place (`nginx/nginx.conf`) instead of being duplicated
  across runtimes.

`:13000` and `:18080` remain published directly on the host for local
development and for exercising the **"Direct Java Spring Boot"** backend
target in the UI's Backend Settings dialog (which always points at the
absolute `http://localhost:18080/api/v1` URL regardless of nginx). The nginx
ingress is the recommended production path, not a replacement for those
direct dev-time connections.

> **Note on the "Integrated" backend preset:** its `baseUrl` is the relative
> `/api/v1`, which resolves against whatever origin served the page. Loaded
> through nginx (`http://localhost:8088`), that preset is routed to the **real
> Java backend**, not the Node mock implementation — nginx intentionally
> unifies `/api/v1` under one authoritative backend. To exercise the Node
> mock specifically, load the app directly at `http://localhost:13000`.

> 📘 **Deep dive:** see [`docs/DEVOPS_GUIDE.md`](docs/DEVOPS_GUIDE.md) for the full multi-stage `Dockerfile` breakdown, a service-by-service `docker-compose.yml` reference, the nginx routing table, and the complete `scripts/rebuild.sh` flag reference.

---

### Option 3: Clean Rebuild & Redeploy from Scratch

`scripts/rebuild.sh` performs a reproducible, end-to-end rebuild: it tears the
stack down, deletes every generated artifact, type-checks the frontend, rebuilds
the container image (Vite bundle + Spring Boot JAR), redeploys, and verifies that
the stack actually answers.

```bash
npm run rebuild                # routine clean rebuild and redeploy
npm run rebuild:deep           # also drop node_modules and GENERATED docs, build without layer cache
npm run clean:generated-docs   # wipe only generated docs (docs/typescript, docs/javadoc, docs/diagrams); no rebuild
npm run ops:factory-reset      # DESTRUCTIVE: wipes all data, models and generated docs — ops/CI use only

./scripts/rebuild.sh --help   # all options
```

**Doc safety.** `docs/` mixes generated output (`docs/typescript`, `docs/javadoc`,
`docs/diagrams` — reproducible via `npm run docs`/`diagrams`) with hand-authored
source content (architecture specs, presentations, `openapi.yaml`, the BPMN
file, ...). `--deep` and `clean:generated-docs` only ever delete the three
generated subdirectories above; hand-authored docs are never touched.

One subtlety: `docs/diagrams/` is **not** purely generated. Five hand-authored
sources live there and no generator can recreate them — `MINDMAP.md`,
`architecture_diagrams.mmd` (an *input* to `generate-architecture-from-mmd.ts`),
`rag_data_flow.drawio`, `system_architecture.drawio`, and
`system_architecture.puml`. `rebuild.sh` stashes and restores them around the
directory delete via its `PRESERVED_DIAGRAM_SOURCES` list. **Add any new
hand-authored file in that directory to that list**, or a `--deep` run will
destroy it.

After a `--deep` run the script reinstalls `node_modules` and regenerates all
three documentation trees automatically, so `git status` stays clean. The one
exception is `clean:generated-docs` (`--deep --clean-only`), which exits before
those phases by design; it prints the recovery command:

```bash
npm ci && npm run docs && npm run diagrams
```

**Data safety.** Persistent volumes are *preserved by default*. Deleting data is
always an explicit opt-in, and the script asks for confirmation first:

| Flag | Effect |
| :--- | :--- |
| *(none)* | Documents, vectors, uploaded files and models all survive. |
| `--purge-data` | Drops MongoDB, Qdrant and uploaded files. **Models are kept.** |
| `--purge-models` | Drops the Ollama model cache (forces a ~7 GB re-download). |
| `--purge-all` | `--deep` + `--purge-data` + `--purge-models` — a true factory reset. |
| `--force` | Required alongside a purge flag when run non-interactively (CI/scripted); there is no silent auto-skip of the confirmation prompt. |

`--purge-data` deliberately keeps the model cache, because re-pulling several
gigabytes through a corporate TLS proxy is slow and failure prone.

Other useful flags: `--no-cache` (ignore the Docker layer cache), `--pull`
(refresh base images), `--clean-only` (stop after cleaning), and `--skip-verify`.

The script fails fast with a non-zero exit code: a type error aborts the run
*before* any Docker work starts, and deployment waits on real container health
checks rather than a fixed sleep, so it is safe to use in CI.
* **MongoDB Port:** `localhost:37017`

---

## 🔒 Enterprise SSL/TLS Certificate Configuration

In corporate environments, traffic to Ollama model registries or external gateways may route through TLS-intercepting proxies. Personal Library natively supports custom enterprise certificates:

The application accepts enterprise CA certificates from `./certs/`; the steps
below show how to install and verify one.

1. Drop your PEM-encoded corporate root or intermediate certificates into `./certs/`.
   The file names do not matter — every `*.crt` and `*.pem` in that directory is
   picked up automatically:
   ```bash
   mkdir -p certs
   cp /path/to/enterprise-root-ca.crt certs/
   ```
2. Rebuild and restart:
   ```bash
   docker compose up -d --build
   ```
3. The certificates are then trusted everywhere TLS is used:

   | Target | Mechanism |
   |---|---|
   | Frontend build (`npm ci`) | `NODE_EXTRA_CA_CERTS` pointing at the staged bundle |
   | Backend build (`mvn package`) | OS trust store + JDK `cacerts` (needed for Maven Central) |
   | Runtime image (Spring Boot + Node gateway) | OS trust store, JDK `cacerts`, `NODE_EXTRA_CA_CERTS` |
   | Ollama container | `ollama-entrypoint.sh` runs `update-ca-certificates` before `ollama serve` |

> **Note:** the Ollama container must register the CA *before* the server starts,
> otherwise every pull from `registry.ollama.ai` fails the certificate check and no
> model can be downloaded. `SSL_CERT_FILE` is deliberately pointed at the merged
> bundle (`/etc/ssl/certs/ca-certificates.crt`) rather than at a single corporate
> certificate, which would otherwise discard all public root CAs.

---

## 🐳 Docker Inspection: Storage Volumes, Databases & Keycloak Administration

The application stack orchestrates 8 container services (app, swagger-editor, nginx, mongodb, mongo-express, qdrant, ollama, keycloak) bound to persistent Docker volumes. The commands below provide direct visibility into uploaded files, database contents, vector indexes, and Keycloak identity management.

> 💡 **Quick links in the app:** the ShellBar's user/profile menu includes a **"System Services & Admin Consoles"** entry that opens a dialog with direct, clickable links to every service below (Swagger Editor, Spring Boot Swagger UI, Actuator Health, Keycloak Admin Console, Qdrant Dashboard, Mongo Express, Ollama API, and the nginx single ingress) — handy as an alternative to the CLI commands in this section.

### 1. Uploaded File Storage & Volume Inspection

All uploaded binary documents (`.pdf`, `.docx`, `.md`, `.txt`, `.pptx`, `.xlsx`) and their historical version archives are stored in the persistent volume `personal-library-file-storage`, mounted inside the app container at `/app/storage/documents`.

Files are laid out as **`{documentGuid}/v{versionNumber}/{originalFileName}`** — one subdirectory per version, which is exactly why rollback is non-destructive: overwriting the active version never touches the bytes an earlier snapshot still points at.

#### Browse the volume in a web browser (easiest)

`docker compose up` starts a `storage-browser` container that serves a **read-only** directory listing of this volume:

* **URL:** [http://localhost:8092](http://localhost:8092)
* Click through `{guid}/` → `v{n}/` to reach any file; clicking a file streams it (PDFs open inline in most browsers).
* Also reachable from inside the app: **user avatar → System Services → Document Storage Browser**.
* The volume is mounted `:ro`, so nothing you do here can delete or alter a stored document.

#### Inspect from the command line

* **List all uploaded files in the storage volume:**
  ```bash
  docker exec -it personal-library-app ls -lah /app/storage/documents
  ```

* **Inspect file details, disk usage, and historical version archives:**
  ```bash
  docker exec -it personal-library-app find /app/storage/documents -type f -exec ls -lh {} +
  ```

* **Check the Docker volume mountpoint on the host filesystem:**
  ```bash
  docker volume inspect personal-library-file-storage
  
  # On Linux host systems with root/sudo:
  sudo ls -la $(docker volume inspect personal-library-file-storage --format '{{ .Mountpoint }}')
  ```

* **Copy uploaded files from the container to your local machine for backup:**
  ```bash
  mkdir -p ./local_document_backup
  docker cp personal-library-app:/app/storage/documents/. ./local_document_backup/
  ```

---

### 2. MongoDB Document Database Inspection

MongoDB stores document metadata, LaTeX BibTeX properties, version lineages, and AI summaries.

* **Database Connection Parameters:**
  * **Host / Port:** `localhost:37017`
  * **Database Name:** `personal_library`
  * **Root Username:** `root`
  * **Root Password:** `librarypass`
  * **Authentication Database:** `admin`

* **Launch the interactive MongoDB Shell (`mongosh`):**
  ```bash
  docker exec -it personal-library-mongodb mongosh -u root -p librarypass --authenticationDatabase admin personal_library
  ```

* **Inspect documents directly from your terminal (One-Liner Queries):**
  ```bash
  # 1. List all documents (GUID, Title, Version Number, File Name)
  docker exec -it personal-library-mongodb mongosh -u root -p librarypass --authenticationDatabase admin personal_library \
    --eval 'db.documents.find({}, {guid: 1, title: 1, versionNumber: 1, fileName: 1, _id: 0}).pretty()'

  # 2. View full document record with dual AI summaries (Llama & Mistral)
  docker exec -it personal-library-mongodb mongosh -u root -p librarypass --authenticationDatabase admin personal_library \
    --eval 'db.documents.findOne({}, {guid: 1, title: 1, summaries: 1, _id: 0}).pretty()'

  # 3. View immutable version history snapshots and rollback audit logs
  docker exec -it personal-library-mongodb mongosh -u root -p librarypass --authenticationDatabase admin personal_library \
    --eval 'db.documents.find({}, {guid: 1, versionNumber: 1, versionHistory: 1, _id: 0}).pretty()'

  # 4. Count total documents in collection
  docker exec -it personal-library-mongodb mongosh -u root -p librarypass --authenticationDatabase admin personal_library \
    --eval 'print("Total Documents: " + db.documents.countDocuments())'
  ```

---

### 3. Mongo Express Web Viewer (MongoDB GUI)

Mongo Express provides a lightweight, browser-based GUI for browsing the `personal_library` database without needing `mongosh`.

* **URL:** [http://localhost:8091](http://localhost:8091)
* **Authentication:** none at the Mongo Express layer (`ME_CONFIG_BASICAUTH=false`); it connects to MongoDB internally using the same `root`/`librarypass` credentials as above.
* Use it to browse collections, inspect individual documents, and run ad-hoc queries visually — equivalent to the `mongosh` one-liners in section 2, but point-and-click.

---

### 4. Qdrant Vector Database Inspection

Qdrant stores dense vector embeddings and text chunks in the `personal_library_embeddings` collection for RAG semantic search.

* **Qdrant Connection Ports:**
  * **HTTP REST API:** `http://localhost:16333`
  * **Internal gRPC Port:** `localhost:16334`

* **Query Qdrant via HTTP REST API (from host terminal):**
  ```bash
  # 1. View all Qdrant collections
  curl -s http://localhost:16333/collections | jq .

  # 2. View 'personal_library_embeddings' configuration (vector size, distance metric, HNSW parameters, points count)
  curl -s http://localhost:16333/collections/personal_library_embeddings | jq .

  # 3. Scroll through indexed document chunks and payloads (text excerpts, document GUIDs)
  curl -s -X POST http://localhost:16333/collections/personal_library_embeddings/points/scroll \
    -H 'Content-Type: application/json' \
    -d '{"limit": 5, "with_payload": true, "with_vector": false}' | jq .
  ```

* **Inspect Qdrant collection directly inside the container:**
  ```bash
  docker exec -it personal-library-qdrant curl -s http://localhost:6333/collections/personal_library_embeddings
  ```

---

### 5. Keycloak Identity Provider, Users & Passwords

Keycloak manages OAuth2 / OpenID Connect (OIDC) authentication, JWT Bearer tokens, and Role-Based Access Control (RBAC).

* **Keycloak Web Admin Console:**
  * **URL:** [http://localhost:8180](http://localhost:8180) (or `http://localhost:8180/admin`)
  * **Admin Username:** `admin`
  * **Admin Password:** `admin`
  * **Active Realm:** `personal-library-realm`
  * **Client ID:** `personal-library-client`
  * **Client Secret:** `enterprise-library-secret`

* **Pre-Configured Realm User Accounts:**

  | Username | Password | Email | Assigned Realm Roles | Capabilities |
  |---|---|---|---|---|
  | `admin` | `admin` | `admin@personallibrary.local` | `LIBRARY_ADMIN`, `CHIEF_RESEARCHER` | Full CRUD, rollback, deletion, and system administration |
  | `researcher` | `researcher123` | `researcher@personallibrary.local` | `CHIEF_RESEARCHER` | Document upload, version overwrite, AI summarization, RAG chat |
  | `viewer` | `viewer123` | `viewer@personallibrary.local` | `VIEWER` | Read-only discovery, BibTeX citation export, asset download |

* **Acquire a test JWT Bearer Token via CLI:**
  ```bash
  # Request an access token for user 'admin'
  curl -s -X POST http://localhost:8180/realms/personal-library-realm/protocol/openid-connect/token \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    -d 'client_id=personal-library-client' \
    -d 'client_secret=enterprise-library-secret' \
    -d 'grant_type=password' \
    -d 'username=admin' \
    -d 'password=admin' | jq .
  ```

---

### 6. Ollama LLM Container Inspection

* **List preloaded and cached models in Ollama:**
  ```bash
  docker exec -it personal-library-ollama ollama list
  ```

* **Test model inference directly inside the container:**
  ```bash
  docker exec -it personal-library-ollama ollama run llama3.2 "Explain the purpose of a cyclone cellar in Kansas."
  ```

* **Expect slow responses without a GPU.** Since removing the Gemini cloud fallback, all summarization, BibTeX extraction, and RAG chat run entirely on local Ollama inference. On CPU-only hosts, a single Mistral/Llama summarization call can take **1–3 minutes** (longer for larger documents). Critically, document **upload** chains up to **three sequential** Ollama calls in one request (BibTeX extraction, then a Llama summary, then a Mistral summary), and **overwrite** chains two (Llama + Mistral) — so the end-to-end timeout budget must cover the SUM of those calls, not just one. The app is configured with generous ceilings end-to-end:
  * Direct Java Spring Boot backend's Ollama client (`OllamaConfig.java`): 10-minute read timeout **per individual Ollama call**.
  * Frontend REST calls (`src/main/frontend/services/backend/types.ts`, `LLM_TIMEOUT_MS`): 35 minutes — sized for the worst case (3 x 10-minute calls during upload) plus a 5-minute buffer for storage/extraction/vector indexing.
  * nginx reverse proxy (`nginx/nginx.conf`, `proxy_read_timeout`/`proxy_send_timeout`): 36 minutes — kept just above the frontend's budget so nginx is never the first layer to cut off a model that's still genuinely working.
  * Node.js Integrated Gateway HTTP server (`server.ts`): 36 minutes, matching nginx.

  If you still see timeout errors on a very slow machine, increase all four values in lockstep: `LLM_TIMEOUT_MS` in `types.ts`, the `proxy_read_timeout`/`proxy_send_timeout` values in `nginx/nginx.conf`, `server.timeout`/`keepAliveTimeout` in `server.ts`, and `OLLAMA_READ_TIMEOUT` in `OllamaConfig.java` — then rebuild. Each outer layer must stay greater than or equal to the inner one it wraps, and must account for however many sequential Ollama calls the slowest endpoint (upload) can chain.

---

### 7. Docker Maintenance & Lifecycle Commands

| Command | Purpose |
|---|---|
| `docker compose ps` | Displays status and health checks for all 5 services. |
| `docker compose logs -f personal-library-app` | Streams real-time application and Spring Boot gateway logs. |
| `docker compose restart personal-library-app` | Safely restarts the web and API gateway service. |
| `docker compose down` | Stops and removes all containers while **preserving** database volumes. |
| `docker compose down -v` | **Full Reset**: Stops containers and **destroys all persistent volumes** (MongoDB, Qdrant vectors, Ollama models, uploaded documents). |
| `docker volume ls` | Lists all volumes managed by the Personal Library stack. |
| `docker volume prune -f` | Deletes dangling, unused Docker volumes. |

---

## 📖 Key Workflows

### 1. Document Upload & AI BibTeX Extraction
- Select any supported file (`.pdf`, `.docx`, `.md`, `.txt`, etc.). Only single file uploads are permitted per transaction.
- The system automatically previews the document, detects the BibTeX publication type (e.g. `@article`, `@book`, `@inproceedings`), and auto-populates relevant fields.
- The user can review, edit, and adjust any BibTeX parameter. Switching the BibTeX type dynamically updates the field set.
- Step-by-step progress tracking provides feedback across upload, vector indexing, and dual-model summarization.

### 2. Dual-Model AI Summarization
- Each uploaded document computes two distinct summaries:
  1. **Llama Model:** Structured, deep analytical summary with key technical findings.
  2. **Mistral Model:** Executive synthesis highlighting practical business and operational takeaways.
- Both summaries record creation date and generation duration (formatted in minutes and seconds).
- Individual "Regenerate" buttons allow users to re-run either model at any time with an active loading spinner.
- **Parallel Execution:** Both models can be regenerated concurrently in parallel; their in-flight progress, spinners, and document updates operate completely independently without race conditions.

### 3. Vector-Powered Semantic Search & RAG Chat
- **Semantic Search:** In the List Report filter bar, enter content terms. The system queries Qdrant vector space for conceptual matches across full text chunks.
- **Object Page RAG Chat:** Ask natural language questions regarding the document. The Llama model retrieves relevant excerpts from Qdrant and responds with cited evidence.

### 4. In-Place Version Overwrite, Snapshot Archival & Instant Rollback
- **In-Place Overwrite:** Uploading a new physical file version or updated BibTeX metadata from the Object Page overwrites document content and summaries in-place, retaining the document GUID and incrementing the version sequence (e.g. `v1` -> `v2`).
- **Immutable Snapshot Archival:** Prior to any overwrite or rollback mutation, the system captures an immutable snapshot (`DocumentVersionSnapshot`) containing the complete document state, raw LaTeX BibTeX, text chunks, dual summaries, and physical asset archive.
- **Historical Asset Download:** Users can download physical document files preserved at any historical revision directly from the **Version History & Rollback** tab in the Object Page (`/api/v1/documents/{guid}/versions/{version}/download`).
- **One-Click Non-Destructive Rollback:** Reverting to any past version snapshot restores its metadata, content excerpt, and summaries, archives the current state into version history, and advances the version sequence counter without data loss (`POST /api/v1/documents/{guid}/rollback/{version}`).
- Brand new documents uploaded from the List Report always generate a fresh unique GUID.
- Lineage, version history, and audit timestamps are tracked across iterations.

---

## 🔌 REST API Specification

The Personal Library exposes an enterprise OpenAPI 3.0.3 contract (`/openapi.yaml`).
A bundled **Swagger Editor** container (`swagger-editor` service in
`docker-compose.yml`) lets you browse, lint, and try out this contract in a
live UI — mounted directly from the repo's `openapi.yaml` onto the editor's
own static root, so no rebuild is needed after edits. Reach it at
`http://localhost:8088/swagger/?url=openapi.yaml` (via nginx) or
`http://localhost:8090/?url=openapi.yaml` (direct); the `?url=` query param
tells the editor to auto-load the spec instead of showing the default
Petstore example.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/documents` | Multi-criteria paginated document query and search |
| `POST` | `/api/v1/documents` | Upload new document with file payload and BibTeX metadata |
| `GET` | `/api/v1/documents/{guid}` | Retrieve full document details, metadata, and summaries |
| `PUT` | `/api/v1/documents/{guid}` | In-place version overwrite and metadata update |
| `DELETE` | `/api/v1/documents/{guid}` | Delete document entity, asset file, and vector embeddings |
| `GET` | `/api/v1/documents/{guid}/download` | Stream active physical document file asset |
| `GET` | `/api/v1/documents/{guid}/versions` | Retrieve historical version snapshots list |
| `GET` | `/api/v1/documents/{guid}/versions/{version}/download` | Download preserved asset file for a specific historical version |
| `POST` | `/api/v1/documents/{guid}/rollback/{version}` | Roll back document state to a designated historical version |
| `POST` | `/api/v1/documents/{guid}/summarize` | Trigger dual-model AI summary regeneration (Llama / Mistral) |
| `POST` | `/api/v1/chat` | Conversational RAG chat query with citation evidence |
| `GET` | `/api/v1/health` | Comprehensive multi-system health check |

---

## 📜 License: GNU Affero General Public License v3.0 (AGPL-3.0-or-later)

This project is licensed under the **GNU Affero General Public License v3.0 (GNU AGPLv3)**.

### Why AGPLv3?
The **GNU AGPLv3** is the **most restrictive, strongest copyleft open source license** recognized by the Open Source Initiative (OSI) and Free Software Foundation (FSF):

* **Network / SaaS Copyleft (Section 13):** Unlike standard GPLv3 (which only applies upon binary distribution), if you run a modified version of this software over a computer network (e.g. as a web service, API, private cloud instance, or SaaS platform), you **must make the complete corresponding source code freely available to all network users** under the AGPLv3.
* **Reciprocal Openness:** Any derivative work, plugin, modification, or linked backend module must remain free and open source under the same AGPLv3 terms.
* **Patent Protection:** Protects users and contributors against patent encumbrances and anti-circumvention lock-in.

See the full license terms in the [LICENSE](LICENSE) file or visit [gnu.org/licenses/agpl-3.0.html](https://www.gnu.org/licenses/agpl-3.0.html).
