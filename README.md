# Personal Library: Enterprise AI Document Management System

> **AI reproduction specification:** [`AI-REPRODUCTION-SPEC.md`](AI-REPRODUCTION-SPEC.md)
> contains the current architecture, implementation constraints, reproduction
> procedure, and acceptance checklist for rebuilding this project.

Personal Library is an enterprise-grade document management and research platform built with SAP Fiori Web Components following SAP UI5 floorplans (List Report and Object Page), automated BibTeX metadata extraction, vector-based semantic retrieval via Qdrant, dual-model AI summarization (Llama and Mistral), and an interactive RAG chat pipeline.

---

## 🏛️ System Architecture

```
                                  ┌─────────────────────────────┐
                                  │      Keycloak (OIDC)        │
                                  │  personal-library-realm     │
                                  └──────────────┬──────────────┘
                                                 │ JWT / Bearer
                                                 ▼
┌─────────────────────────┐         ┌─────────────────────────────┐
│  Personal Library Web   │ ◄─────► │  API Gateway / Spring Boot  │
│  (SAP Horizon Floorplans│  HTTP   │  Document Pipeline & RAG    │
│   List Report & Object) │         └──────────────┬──────────────┘
└─────────────────────────┘                        │
                                   ┌───────────────┼───────────────┐
                                   ▼               ▼               ▼
                        ┌────────────────┐ ┌──────────────┐ ┌──────────────┐
                        │    MongoDB     │ │    Qdrant    │ │    Ollama    │
                        │ Document Meta, │ │ Vector DB &  │ │ Dual Models: │
                        │ BibTeX, Audits │ │ RAG Chunks   │ │Llama/Mistral │
                        └────────────────┘ └──────────────┘ └──────────────┘
```

### Technical Stack
* **Frontend:** Vanilla TypeScript, Vite, SAP Fiori / UI5 Horizon Theme (`sap_horizon`).
* **UI Patterns:** SAP Fiori List Report Floorplan & SAP Fiori Object Page Floorplan.
* **Authentication:** Keycloak / OpenID Connect (OIDC) client.
* **AI & Embeddings:** Spring AI, Ollama (`llama` and `mistral` models) / Gemini 2.5/3.8 engine.
* **Databases:**
  * **MongoDB:** Document records, BibTeX properties, version histories, audit logs.
  * **Qdrant Vector Database:** Embedding index for high-precision semantic content search and RAG retrieval.
  * **Local File Storage:** Encrypted physical document assets (`md`, `docx`, `pdf`, `txt`, `doc`, `xls`, `xlsx`, `ppt`, `pptx`).
* **API Documentation:** OpenAPI 3.0.3 (`/openapi.yaml` and interactive viewer).

---

## 🚀 Quick Start & Installation

### Option 1: Running in Google AI Studio / Development Server
```bash
# 1. Install dependencies
npm install

# 2. Start the integrated dev server (Port 3000)
npm run dev
```
Open your browser at `http://localhost:3000`.

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

---

### Decoupled UI & Pluggable Backend Adapter Architecture
The UI is decoupled from the backend implementation via the **Backend Adapter Pattern** (`src/main/frontend/services/backend/` and the event-driven `BackendGateway`):
* **No hardcoded endpoints in UI components:** `ListReportView`, `ObjectPageView`, `UploadDialogView`, `VersionOverwriteDialogView`, and `AuthModalView` dispatch typed events on the gateway.
* **Instant Target Switching:** Users can switch backends directly from the UI header (ShellBar > **Backend Target Settings**):
  1. **Integrated Gateway (`/api/v1`)**: Default dev proxy forwarding to Spring AI, Qdrant, and Ollama.
  2. **Direct Java Spring Boot (`http://localhost:8080/api/v1`)**: Point directly to the standalone Spring Boot 3 Java server instance.
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

# Run the Spring Boot application locally (Port 8080)
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

---

### Option 2: Production Deployment with Docker Compose

Ensure Docker and Docker Compose are installed.

```bash
# 1. Pull and start all infrastructure containers (MongoDB, Qdrant, Ollama, Keycloak, Web App)
docker compose up -d

# 2. Verify container health status
docker compose ps

# 3. Watch the automatic model download (llama3.2, mistral, nomic-embed-text)
docker compose logs -f ollama | grep ollama-entrypoint

# 4. Confirm the models are installed
docker exec -it personal-library-ollama ollama list
```

The Ollama container pulls every model the backend needs on first start and
caches them in the `ollama_models` volume, so later starts are instant. Override
the list with the `OLLAMA_PRELOAD_MODELS` environment variable (space separated)
or pull extra models manually with
`docker exec -it personal-library-ollama ollama pull <model>`.

Access Points:
* **Web Application:** `http://localhost:3000`
* **OpenAPI Spec:** `http://localhost:3000/api/v1/openapi.yaml`
* **Keycloak Administration:** `http://localhost:8180` (admin/admin)
* **Qdrant Vector Dashboard:** `http://localhost:6333/dashboard`

---

### Option 3: Clean Rebuild & Redeploy from Scratch

`scripts/rebuild.sh` performs a reproducible, end-to-end rebuild: it tears the
stack down, deletes every generated artifact, type-checks the frontend, rebuilds
the container image (Vite bundle + Spring Boot JAR), redeploys, and verifies that
the stack actually answers.

```bash
npm run rebuild          # routine clean rebuild and redeploy
npm run rebuild:deep     # also drop node_modules and generated artifacts, build without layer cache
npm run clean:all        # clean everything, do not rebuild
npm run rebuild:reset    # factory reset, including all data and models

./scripts/rebuild.sh --help   # all options
```

**Data safety.** Persistent volumes are *preserved by default*. Deleting data is
always an explicit opt-in, and the script asks for confirmation first:

| Flag | Effect |
| :--- | :--- |
| *(none)* | Documents, vectors, uploaded files and models all survive. |
| `--purge-data` | Drops MongoDB, Qdrant and uploaded files. **Models are kept.** |
| `--purge-models` | Drops the Ollama model cache (forces a ~7 GB re-download). |
| `--purge-all` | `--deep` + `--purge-data` + `--purge-models` — a true factory reset. |

`--purge-data` deliberately keeps the model cache, because re-pulling several
gigabytes through a corporate TLS proxy is slow and failure prone.

Other useful flags: `--no-cache` (ignore the Docker layer cache), `--pull`
(refresh base images), `--clean-only` (stop after cleaning), and `--skip-verify`.

The script fails fast with a non-zero exit code: a type error aborts the run
*before* any Docker work starts, and deployment waits on real container health
checks rather than a fixed sleep, so it is safe to use in CI.
* **MongoDB Port:** `localhost:27017`

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

## 🧹 Docker Maintenance & Cleanup Commands

| Command | Purpose |
|---|---|
| `docker compose down` | Stops and removes all containers while preserving database volumes. |
| `docker compose down -v` | **Full Reset**: Stops containers and destroys all persistent data volumes (MongoDB data, Qdrant vectors, Ollama models). |
| `docker volume prune -f` | Deletes dangling, unused Docker volumes. |
| `docker compose logs -f personal-library-app` | Streams real-time application logs. |
| `docker compose restart personal-library-app` | Safely restarts the web and API gateway service. |
| `docker exec -it personal-library-mongodb mongosh -u root -p librarypass` | Connects to interactive MongoDB shell. |

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

### 4. In-Place Version Overwrite & Lineage
- Uploading a new physical file version or updated BibTeX metadata from the Object Page overwrites document content and summaries in-place, retaining the document GUID and incrementing the version number (e.g. `v1` -> `v2`).
- Brand new documents uploaded from the List Report always generate a fresh unique GUID.
- Lineage, version history, and audit timestamps are tracked across iterations.

---

## 📜 License: GNU Affero General Public License v3.0 (AGPL-3.0-or-later)

This project is licensed under the **GNU Affero General Public License v3.0 (GNU AGPLv3)**.

### Why AGPLv3?
The **GNU AGPLv3** is the **most restrictive, strongest copyleft open source license** recognized by the Open Source Initiative (OSI) and Free Software Foundation (FSF):

* **Network / SaaS Copyleft (Section 13):** Unlike standard GPLv3 (which only applies upon binary distribution), if you run a modified version of this software over a computer network (e.g. as a web service, API, private cloud instance, or SaaS platform), you **must make the complete corresponding source code freely available to all network users** under the AGPLv3.
* **Reciprocal Openness:** Any derivative work, plugin, modification, or linked backend module must remain free and open source under the same AGPLv3 terms.
* **Patent Protection:** Protects users and contributors against patent encumbrances and anti-circumvention lock-in.

See the full license terms in the [LICENSE](LICENSE) file or visit [gnu.org/licenses/agpl-3.0.html](https://www.gnu.org/licenses/agpl-3.0.html).
