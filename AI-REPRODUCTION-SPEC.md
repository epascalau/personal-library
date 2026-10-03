# Personal Library — AI Reproduction Specification

**Status:** current implementation  
**Purpose:** give an AI coding agent or engineer enough deterministic context to
reproduce the work completed in this project without relying on conversation
history.

This document describes the current repository, not the historical React
prototype. The authoritative implementation is under `src/main/frontend/`,
with the Java backend under `src/main/java/`.

## 1. Product and architecture

Reproduce an enterprise document-management and research application with:

- SAP Fiori/Horizon-style List Report and Object Page experiences.
- Document upload, metadata editing, version overwrite, deletion, BibTeX
  export, pagination, filtering, and full-text search.
- Dual-model AI summarization and conversational RAG with citations.
- MongoDB document metadata and audit/version history.
- Qdrant vector storage and Ollama chat/embedding models.
- Keycloak/OIDC integration.
- A browser-local mock backend so the UI remains usable without infrastructure.
- Five locales: English, German, French, Spanish, and Romanian.

The deployment topology is:

```text
Browser/UI5 frontend :3000
        |
        +--> Node/Express gateway and static server
        |
        +--> Spring Boot API :8080
                |
                +--> MongoDB :27017
                +--> Qdrant :6333/:6334
                +--> Ollama :11434
                +--> Keycloak :8180
```

## 2. Non-negotiable implementation constraints

1. Use vanilla TypeScript and SAP UI5 Web Components. Do not reintroduce
   React or a third-party UI component framework.
2. Keep frontend code under `src/main/frontend/`.
3. Use the existing lightweight component/store/event-bus patterns rather than
   introducing a second state-management architecture.
4. UI components must communicate with the backend through typed events and
   `BackendGateway`; do not hardcode REST calls in views.
5. Preserve the `globalStylesheet` /
   `applyGlobalStylesheetPatch` approach in
   `src/main/frontend/ui5/globalStylesheet.ts` so shared CSS is adopted into
   UI5 shadow roots.
6. Language flags must be real inline SVG assets from `ui5/flags.ts`, never
   emoji.
7. Backend adapters must remain replaceable: integrated REST, direct/custom
   REST, and local in-memory/mock targets are supported.
8. User input used in repository search must be treated as literal text and
   must not be interpolated into unsafe query expressions.
9. Corporate certificates are runtime configuration. Never commit private keys,
   proxy credentials, API keys, or certificate contents that are not intended
   for the project.
10. Preserve persistent Docker volumes by default. Destructive data/model
    removal must be explicit.

## 3. Current source layout

### Frontend

- `src/main/frontend/main.ts` — bootstrap and application mount.
- `src/main/frontend/index.html` — Vite entry document.
- `src/main/frontend/core/` — HTML templating, component base, reactive store,
  and typed event bus.
- `src/main/frontend/stores/` — application, backend, i18n, and theme state.
- `src/main/frontend/services/backend/` — event definitions, gateway,
  adapters, and backend types.
- `src/main/frontend/views/` — shell bar, footer, language selector, list
  report, object page, toast, and dialogs.
- `src/main/frontend/ui5/` — UI5 bootstrap, icons, SVG flags, and shadow-DOM
  stylesheet patch.
- `src/main/frontend/i18n/translations/` — `en`, `de`, `fr`, `es`, and `ro`.
- `src/main/frontend/public/styles.css` — shared application styling.

### Backend

- `src/main/java/com/personallibrary/config/` — security, OpenAPI, and Ollama
  configuration.
- `src/main/java/com/personallibrary/controller/` — document and auth APIs.
- `src/main/java/com/personallibrary/dto/` — request/response contracts.
- `src/main/java/com/personallibrary/model/` — document, BibTeX, chunk, and
  summary entities.
- `src/main/java/com/personallibrary/repository/` — Spring Data repository
  plus the custom MongoTemplate search fragment.
- `src/main/java/com/personallibrary/service/` — storage, extraction,
  versioning, summarization, and vector RAG services.
- `src/main/resources/application.yml` and `application-docker.yml` —
  local and Docker profiles.

### Operations and documentation

- `docker-compose.yml` — MongoDB, Qdrant, Ollama, Keycloak, and app services.
- `Dockerfile` — frontend and Spring Boot image build.
- `src/main/server/server.ts` — Node gateway/static server.
- `scripts/rebuild.sh` — clean, build, deploy, and verify routine.
- `ollama-entrypoint.sh` — enterprise CA installation and model preloading.
- `certs/` — mounted corporate `.crt`/`.pem` files; keep `.gitkeep`.
- `openapi.yaml` — API contract.

## 4. Required behavior

### Frontend

Implement the shell bar with backend-target selection, theme switching,
language selection, authentication controls, backend health/status feedback,
and access to the OpenAPI viewer. The List Report must support search,
filters, sorting, pagination, upload, and row navigation. The Object Page must
support metadata, document content, summaries, RAG chat, versions, deletion,
overwrite, and BibTeX export. Dialogs must report failures visibly through the
toast/event mechanism.

All views dispatch typed gateway events. `BackendGateway` translates those
events to the selected adapter. A new adapter should be addable by implementing
the shared adapter interface and registering it in the backend index.

### Backend

The Spring Boot API must provide document lifecycle endpoints under
`/api/v1`, including list/search, retrieve, upload, update, version overwrite,
delete, summarize, RAG chat, and BibTeX export. Keep document GUIDs stable
across versions and retain version lineage/audit information.

Document ingestion stores the physical asset, extracts text and BibTeX
metadata, chunks content, creates embeddings in Qdrant, and supports
independent dual-model summaries. RAG responses must be grounded in retrieved
chunks and expose citation metadata.

### Infrastructure

Docker Compose must start healthy services in dependency order. Ollama must
preload:

```text
nomic-embed-text llama3.2 mistral
```

The list is configurable through `OLLAMA_PRELOAD_MODELS`. Models are cached in
the named `personal-library-ollama-models` volume.

If a corporate TLS-intercepting proxy is present, mount `certs/` into the
Ollama container before startup. `ollama-entrypoint.sh` must install all
`*.crt`/`*.pem` files into the OS trust store, preserve the public CA bundle,
start Ollama, and then pull missing models.

## 5. Reproduction procedure

Run from the repository root.

### Development

```bash
npm ci
npm run lint
npm run build
npm run dev
```

The development server is available at `http://localhost:3000`.

### Java backend

```bash
mvn clean package -DskipTests
mvn spring-boot:run
```

The backend listens on port `8080`.

### Docker deployment

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f ollama | grep ollama-entrypoint
docker compose exec ollama ollama list
```

For a reproducible clean rebuild, prefer:

```bash
npm run rebuild
```

Use `npm run rebuild:deep` for a dependency/documentation clean build.
`npm run rebuild:reset` is a factory reset and removes persistent application
data and the Ollama model cache; use it only intentionally.

The rebuild routine must:

1. Check Docker and Compose availability.
2. Stop the current stack without deleting persistent volumes by default.
3. Remove generated `dist/`, `target/`, and `server.js`.
4. Optionally remove `node_modules/` and generated documentation artifacts.
5. Run the frontend type check before the image build.
6. Build and deploy the Compose stack.
7. Wait for real health checks rather than a fixed sleep.
8. Verify the frontend, Spring health endpoint, documents API, and Ollama
   model availability.

## 6. Enterprise CA procedure

1. Obtain the corporate root/intermediate CA from IT in PEM format.
2. Confirm it contains a `BEGIN CERTIFICATE` block and is a CA.
3. Place it in `certs/` as `.crt` or `.pem`.
4. Rebuild with `npm run rebuild`.
5. Verify from the container:

```bash
docker compose exec ollama \
  openssl s_client -connect registry.ollama.ai:443 </dev/null 2>&1 \
  | grep -E "issuer=|Verify return code"

docker compose exec ollama ollama list
```

Success requires `Verify return code: 0 (ok)` and all three configured models
to be listed. See the certificate setup steps in `README.md` for certificate
encoding, proxy, and troubleshooting details.

## 7. Acceptance checklist

An AI reproduction is complete only when all of the following are true:

- `npm run lint` succeeds with no TypeScript errors.
- `npm run build` emits the frontend bundle.
- The app loads at `http://localhost:3000`.
- The UI contains no React runtime or React source dependency.
- UI5 shadow-root styling is installed through the shared stylesheet patch.
- The five locale selectors render SVG flags and change translated UI text.
- Backend operations are routed through typed gateway events.
- `mvn clean package -DskipTests` succeeds.
- Docker Compose services become healthy.
- `/actuator/health` and `/api/v1/documents` respond.
- `ollama list` contains `nomic-embed-text`, `llama3.2`, and `mistral`.
- A document can be uploaded, searched, opened, versioned, summarized, and
  queried through RAG with citations.
- The rebuild script is idempotent and does not delete persistent data unless a
  purge flag is supplied.
- If a corporate proxy is used, the registry TLS verification succeeds.

## 8. Known completion state

The frontend migration, typed event-bus integration, SVG flags, Docker
rebuild/deploy routine, and enterprise CA/model-download path were completed in
the preceding implementation work. The final verification to repeat after
regeneration is the complete Spring Boot AI path: upload a representative
document, confirm embedding/indexing, run both summaries, and perform a
citation-bearing RAG query.

## 9. Agent operating instructions

Before changing code, inspect the existing implementation and reuse its
patterns. Make surgical changes, preserve unrelated work, and update this file
when architecture or reproduction commands change. Never replace the current
UI with React, silently swallow backend errors, hardcode secrets, or remove
Docker volumes as part of a normal rebuild.
