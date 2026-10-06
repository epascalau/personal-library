# Backend Technical Documentation

This document is the authoritative technical reference for the **Personal Library** Java backend: a **Spring Boot 4.1.1 / Spring AI 2.0.1** application on **Java 21**, providing real MongoDB persistence, genuine Qdrant vector search, Ollama-backed dual-model AI summarization, and Keycloak OIDC authentication. It covers package structure, request flow, data models, the AI/RAG pipeline, security, exception handling, and every Maven build task.

> For a narrative introduction see [README.md § Java Spring Boot Backend](../README.md#java-spring-boot-backend-maven). This document goes deeper into class responsibilities and the build/test pipeline.

---

## 1. Technology Stack

| Concern | Technology | Version | Notes |
| :--- | :--- | :--- | :--- |
| Framework | Spring Boot | 4.1.1 | Parent POM; web starter renamed `spring-boot-starter-webmvc` in Spring Boot 4 (was `-starter-web`). |
| AI Orchestration | Spring AI | 2.0.1 | Ollama chat/embedding client + Qdrant vector store client, both auto-configured from `application.yml`. |
| Language runtime | Java | 21 | LTS; required by `pom.xml` `<java.version>`. |
| Persistence (documents) | MongoDB | 7.0 | `spring-boot-starter-data-mongodb`; property prefix is `spring.mongodb.*` in Spring Boot 4 (not the deprecated `spring.data.mongodb.*`). |
| Persistence (vectors) | Qdrant | v1.11.0 | Connected over gRPC (port 6334) for binary embedding transfer. |
| LLM inference | Ollama | `llama3.2`/`llama3.3`, `mistral`, `nomic-embed-text` | Local, no cloud egress; see §5. |
| Authentication | Keycloak | 24.0.5 | OAuth2/OIDC Resource Server (`spring-boot-starter-oauth2-resource-server`) validating Bearer JWTs. |
| Document text extraction | Apache Tika | 2.9.2 | `tika-core` + `tika-parsers-standard-package`; parses PDF/DOCX/DOC/XLS/PPT/TXT/MD. |
| API documentation | springdoc-openapi | 3.1.1 | Auto-exposes `/api-docs` and `/swagger-ui.html` from the controller annotations (separate from the hand-authored `openapi.yaml` contract — see §8). |
| Boilerplate reduction | Lombok | (BOM-managed) | `@Data`, `@Builder`, `@NoArgsConstructor`/`@AllArgsConstructor` on all models/DTOs; excluded from the final JAR by the Spring Boot Maven plugin. |
| Build tool | Maven | 3.9.8 (container) / any local `mvn` | See §9. |

---

## 2. Package Structure

```
src/main/java/com/personallibrary/
├── PersonalLibraryApplication.java   # @SpringBootApplication entry point
│
├── controller/        # REST endpoints — thin: validate input, delegate to service, map to HTTP response
│   ├── DocumentController.java   # /api/v1/documents/** — CRUD, upload/overwrite, download, versions, rollback, chat
│   ├── ChatController.java       # /api/v1/chat — top-level conversational RAG convenience endpoint
│   ├── AuthController.java       # /api/v1/auth/** — Keycloak userinfo + direct login/token issuance
│   ├── HealthController.java     # /api/v1/health — readiness probe (models, vector store, Mongo connectivity)
│   └── ApiExceptionHandler.java   # @RestControllerAdvice — global 404/400 JSON error mapping
│
├── service/            # Business logic — the only layer allowed to talk to repositories/external clients
│   ├── DocumentService.java        # Document lifecycle: CRUD, version archiving, rollback, download resolution
│   ├── StorageService.java         # Physical file I/O: version-isolated disk storage, content-type detection
│   ├── BibTeXExtractionService.java # Regex/AST-based LaTeX BibTeX parsing + AI-assisted metadata inference
│   ├── AiSummarizationService.java  # Dual-model (Llama + Mistral) summarization via Spring AI ChatClient
│   └── VectorRagService.java        # Qdrant chunk indexing, similarity search, grounded RAG chat synthesis
│
├── model/              # MongoDB-persisted domain entities (Lombok @Data classes, no JPA — Spring Data MongoDB)
│   ├── DocumentEntity.java            # Root aggregate: one document's current state + embedded versionHistory
│   ├── DocumentVersionSnapshot.java   # Immutable archived snapshot of a prior version (embedded array element)
│   ├── BibTeXMetadata.java            # 14-field normalized citation record
│   ├── BibTeXType.java                 # Enum: article, book, inproceedings, techreport, phdthesis, misc, ...
│   ├── DocumentChunk.java               # One semantic text chunk (id, chunkIndex, text) — mirrored into Qdrant
│   └── SummaryRecord.java               # One AI model's summary + timing metadata
│
├── dto/                 # Request/response payloads — never the same class as a model/entity
│   ├── DocumentResponse.java       # Outbound shape for all document read endpoints (includes computed downloadUrl)
│   ├── DownloadAsset.java           # Internal record: (physicalFilePath, fileName) — decouples service from controller streaming
│   ├── ChatRequest.java / ChatResponse.java   # Per-document RAG chat contract
│   ├── ChatConvenienceRequest.java   # Top-level /chat contract (documentGuid/guid + question + history)
│   ├── SummarizeRequest.java          # { model: "llama" | "mistral" }
│   ├── PaginatedResponse.java          # Generic { items, page, pageSize, totalItems, totalPages }
│   └── DocumentUploadRequest.java      # (legacy/unused — see §10.1 "Known Issues")
│
├── repository/          # Spring Data MongoDB
│   ├── DocumentRepository.java           # Standard CrudRepository<DocumentEntity, String> + derived finders
│   ├── DocumentRepositoryCustom.java      # Interface for hand-written complex queries
│   └── DocumentRepositoryCustomImpl.java  # MongoTemplate-based multi-field filter/sort/paginate implementation
│
└── config/
    ├── SecurityConfig.java   # Spring Security filter chain, CORS, Keycloak realm-role → GrantedAuthority mapping
    ├── OllamaConfig.java     # Per-model ChatClient beans (Llama temperature 0.2, Mistral 0.3) + timeout configuration
    └── OpenApiConfig.java    # springdoc bean customization (title, Keycloak bearer security scheme)
```

---

## 3. Request Flow (Controller → Service → Repository/Client)

```
HTTP Request
     │
     ▼
[Spring Security Filter Chain]   (SecurityConfig)
     │ validates Bearer JWT (or permits public paths: /auth/**, /health, /swagger-ui/**)
     ▼
[Controller]   (@RestController, thin — Jakarta Bean Validation on DTOs via @Valid)
     │ delegates to exactly one Service method
     ▼
[Service]   (business logic, transaction boundary, orchestrates multiple collaborators)
     │
     ├──▶ [Repository]  (Spring Data MongoDB — DocumentEntity persistence)
     ├──▶ [StorageService]  (physical file read/write under storage/documents/{guid}/v{version}/)
     ├──▶ [VectorRagService]  (Qdrant upsert/search via Spring AI VectorStore)
     └──▶ [AiSummarizationService / BibTeXExtractionService]  (Ollama ChatClient calls)
     │
     ▼
[ApiExceptionHandler]   (only engaged if a Service throws NoSuchElementException/IllegalArgumentException)
     │ maps to { "error": message } with 404/400
     ▼
HTTP Response   (DTO serialized to JSON by Jackson, or a FileSystemResource stream for downloads)
```

**Design rule enforced throughout the codebase**: controllers never touch `DocumentRepository`, `StorageService`, or Spring AI clients directly — every one of those calls is one level removed, behind `DocumentService`. This keeps the HTTP-mapping concern (status codes, content negotiation, `@Valid`) fully separate from business rules (version archiving, rollback semantics, exception types).

---

## 4. REST API Surface

All endpoints are rooted at `/api/v1` and are routed exclusively to this Java backend by nginx (see [DEVOPS_GUIDE.md §4](DEVOPS_GUIDE.md)). The authoritative machine-readable contract is [`openapi.yaml`](../openapi.yaml) at the repo root (mirrored byte-for-byte at `docs/openapi.yaml`).

| Method | Path | Controller method | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/documents` | `DocumentController.getDocuments` | Paginated, multi-field filter + sort search. |
| `POST` | `/documents` | `DocumentController.uploadDocument` | **Multipart** upload (`file`, `bibtex` JSON string); creates version 1. |
| `POST` | `/documents/extract-metadata` | `DocumentController.extractMetadata` | AI-assisted BibTeX inference from a content sample, without persisting. |
| `GET` | `/documents/{guid}` | `DocumentController.getDocument` | Full entity detail. 404 (not 500) if missing. |
| `PUT` | `/documents/{guid}` | `DocumentController.updateDocument` | **Multipart** in-place overwrite (file and/or metadata); archives prior state, increments version. |
| `DELETE` | `/documents/{guid}` | `DocumentController.deleteDocument` | Purges MongoDB entity, physical files, and Qdrant vectors. |
| `GET` | `/documents/{guid}/download` | `DocumentController.downloadDocument` | Streams the **current** active physical file asset. |
| `GET` | `/documents/{guid}/versions` | `DocumentController.getVersionHistory` | Lists all archived `DocumentVersionSnapshot`s. |
| `GET` | `/documents/{guid}/versions/{version}/download` | `DocumentController.downloadHistoricalVersion` | Streams a **preserved historical** file asset. |
| `POST` | `/documents/{guid}/rollback/{version}` | `DocumentController.rollbackVersion` | Non-destructive rollback (see §6.3). |
| `POST` | `/documents/{guid}/summarize` | `DocumentController.regenerateSummary` | Re-runs one model's summary on demand. |
| `POST` | `/documents/{guid}/chat` | `DocumentController.chatWithDocument` | Per-document conversational RAG query. |
| `POST` | `/chat` | `ChatController.chat` | Top-level RAG convenience endpoint (resolves target document from the request body). |
| `GET` | `/auth/userinfo` | `AuthController.getUserInfo` | Resolves claims from the active JWT (or a dev-mode default persona). |
| `POST` | `/auth/login` | `AuthController.login` | Direct credential exchange for a bearer token (dev/demo convenience). |
| `POST` | `/auth/logout` | `AuthController.logout` | Stateless no-op acknowledging client-side token discard. |
| `GET` | `/health` | `HealthController.health` | Aggregated readiness: Ollama model availability, Qdrant collection status, Mongo ping. |

---

## 5. AI / RAG Pipeline (`VectorRagService`, `AiSummarizationService`)

### 5.1 Ingestion (on upload/overwrite)
1. **Text extraction** — `StorageService` writes the raw file, then Apache Tika (`tika.parseToString`) extracts plain text + `detectContentType`.
2. **BibTeX extraction** — `BibTeXExtractionService` first attempts deterministic regex/AST parsing of an embedded `@article{...}` block; if absent, falls back to an Ollama call to infer `title`/`author`/`year` from the extracted text.
3. **Chunking** — the full text is split on paragraph boundaries into non-overlapping `DocumentChunk`s (flushed at ~400 characters, 50-character minimum) and both embedded in `DocumentEntity.chunks` (for the in-document display) **and** upserted into Qdrant via `VectorRagService.indexDocumentChunks(guid, fullContent)` (`nomic-embed-text`, 768-dim).
4. **Dual summarization** — `AiSummarizationService` calls **both** `llama3.2`/`llama3.3` (temperature 0.2, tuned for citation-grounded technical analysis) and `mistral` (temperature 0.3, tuned for fluent executive synthesis) sequentially, storing both as separate `SummaryRecord`s under `summaries.llama` / `summaries.mistral`.

> Upload therefore chains **three sequential Ollama calls** (BibTeX fallback + 2 summaries); overwrite chains **two** (summaries only, BibTeX is user-supplied or kept). This directly drives the timeout budgets documented in [README.md § Timeout Configuration](../README.md) and the nginx `proxy_read_timeout` (see [DEVOPS_GUIDE.md §4](DEVOPS_GUIDE.md)).

### 5.2 Conversational RAG Chat
`VectorRagService.chatWithDocument()`:
1. Embeds the user's question (`nomic-embed-text`).
2. Executes a Qdrant cosine similarity search scoped to the target document's GUID (payload filter — no post-filter scan).
3. Falls back to the document's plain `contentExcerpt` if Qdrant search fails/returns nothing (graceful degradation, never a hard error).
4. Constructs a grounded prompt (retrieved chunks + chat history) and calls the Llama `ChatClient`.
5. Returns a `ChatResponse` with `answer` plus `citations[]` (chunk index, similarity score, text snippet) — the frontend's anti-hallucination citation drawer renders these directly.

### 5.3 Model Configuration (`OllamaConfig.java`)
Two named `ChatClient` beans are defined, **not** a single shared client, specifically because Llama and Mistral are tuned with different `temperature` values for their different roles (deterministic citation-grounding vs. fluent synthesis) — see `application.yml` for the global default (0.3) and `OllamaConfig` for the per-model override (Llama → 0.2).

---

## 6. Document Versioning & Rollback Architecture

This is the most architecturally significant subsystem added in this project's most recent evolution — fully documented here since it spans `StorageService`, `DocumentService`, and `DocumentController`.

### 6.1 Version-Isolated Physical Storage
`StorageService.storeFile(MultipartFile file, String guid, int version)` writes every uploaded version to its **own** subdirectory:
```
storage/documents/{guid}/v{version}/{filename}
```
This is deliberate: a naive "overwrite in place" design (writing every version to `storage/documents/{guid}/{filename}`) would destroy version N's bytes the moment version N+1 is uploaded with the same filename — making "download version 1's exact original file" impossible even with full metadata history. The version-isolated path means **every** historical file remains byte-for-byte downloadable forever (until the document itself is deleted).

### 6.2 Snapshot Archiving (`DocumentService.buildSnapshot()`)
On **every** overwrite (`PUT /documents/{guid}`), before any field is mutated, the current live state is captured into a `DocumentVersionSnapshot` and prepended (newest-first) to `DocumentEntity.versionHistory`. The snapshot carries a full copy of: `fileName`, `fileSize`, `format`, `physicalFilePath`, `bibtex`/`bibtexRaw`, both `summaries`, `contentExcerpt`, `fullContent`, and `chunksCount` — enough to fully restore the document to that exact state later (see §6.3). This happens **unconditionally on every overwrite**, even metadata-only edits with no new file — preserving the pre-existing behavior that every `PUT` bumps `versionNumber`.

### 6.3 Non-Destructive Rollback (`DocumentService.rollbackToVersion()`)
Rolling back to version *N* does **not** delete versions *N+1, N+2, ...* and does **not** literally reset `versionNumber` back to *N*. Instead:
1. The **current** state is archived as a new snapshot (same `buildSnapshot()` helper as a normal overwrite).
2. The **target** snapshot *N* is located in `versionHistory` (throws `NoSuchElementException` → 404 if absent).
3. All content/metadata fields are restored from snapshot *N* onto the live entity.
4. Qdrant chunks are **re-indexed** from the restored `fullContent` (`vectorRagService.indexDocumentChunks`), so RAG chat reflects the restored content immediately.
5. `versionNumber` is set to `currentVersion + 1` — **a new highest version**, whose content happens to match an old snapshot.

This means the full audit trail is always monotonically increasing and nothing is ever destroyed — "rollback" is really "create a new version from historical content," which is why `IllegalArgumentException` (→ 400) is thrown if you "rollback" to the version you're already on (a no-op that would otherwise silently churn the version counter).

### 6.4 Download Resolution (`DocumentController.streamAsset()`)
Both `GET /{guid}/download` (current) and `GET /{guid}/versions/{version}/download` (historical) converge on the same private `streamAsset(DownloadAsset asset)` helper: resolve the physical `Path`, return `404` if the file is missing on disk (defensive — should not normally happen), otherwise stream via `FileSystemResource` with `Content-Type` from `StorageService.detectContentType()` (Apache Tika) and a `Content-Disposition: attachment` header.

---

## 7. Security (`SecurityConfig.java`)

- **Stateless** (`SessionCreationPolicy.STATELESS`) — no server-side session state; every request is independently authenticated.
- **CSRF disabled** — appropriate for a pure stateless REST API with no cookie-based session to forge.
- **Public paths**: `/auth/**`, `/health`, `/status`, `/api-docs/**`, `/swagger-ui/**`, `/actuator/health`, `/openapi.yaml`.
- **JWT validation**: `oauth2ResourceServer().jwt(...)` validates every other request's Bearer token against the configured Keycloak `issuer-uri`/`jwk-set-uri`.
- **Role mapping**: `KeycloakRealmRoleConverter` reads the non-standard `realm_access.roles` claim Keycloak embeds (Spring Security's default converter only understands flat `scope`/`scp` claims) and maps each role to a `ROLE_`-prefixed `GrantedAuthority`, enabling `@PreAuthorize("hasRole('LIBRARY_ADMIN')")`-style method security (`@EnableMethodSecurity`) should individual endpoints need it.
- **CORS**: wide-open (`allowedOriginPatterns: ["*"]`) with credentials allowed — acceptable because the real production ingress (nginx) serves the frontend and this API from the **same origin**, making CORS largely a development-mode convenience for direct `:18080` access.

> **Current gap**: `.anyRequest().permitAll()` is present as a fallback alongside the JWT resource server config — meaning authentication is currently **not actually enforced** on most endpoints at the HTTP layer (JWTs are parsed/roles mapped if present, but their absence doesn't reject the request). This is a deliberate development/demo-mode convenience documented in code comments ("Allow development access or fallback"); tightening this to `.anyRequest().authenticated()` is the natural hardening step for a genuine production deployment.

---

## 8. Error Handling (`ApiExceptionHandler.java`)

A single `@RestControllerAdvice` maps the two exception types services are expected to throw for client-facing errors:

| Exception | HTTP Status | Thrown by |
| :--- | :--- | :--- |
| `NoSuchElementException` | `404 Not Found` | Any `DocumentService` lookup by GUID/version that doesn't exist. |
| `IllegalArgumentException` | `400 Bad Request` | Invalid operation state (e.g., "rollback to the version you're already on"). |

Both map to a minimal `{ "error": "<message>" }` JSON body. Without this handler, both exception types would otherwise propagate as undocumented raw `500`s (Spring's default behavior for unmapped exceptions) — this was a real, previously-shipped bug (confirmed via live `curl` against `GET /documents/{bad-guid}` returning 500) fixed alongside the versioning work in §6.

---

## 9. Build, Test & Documentation Tasks (Maven)

All commands run from the repository root. The system `mvn` binary is used directly — there is **no** `./mvnw` wrapper script committed to this repo.

| Command | What it does | Notes |
| :--- | :--- | :--- |
| `mvn clean` | Deletes `target/`. | **Caution**: inside this workspace `target/` may be root-owned if it was last populated by a Docker build (which runs as root inside the container but writes to the host-bind-mounted directory) — `mvn clean` or any local compile will fail with `Operation not permitted` until that ownership is resolved (see [DEVOPS_GUIDE.md §7 Troubleshooting](DEVOPS_GUIDE.md)). |
| `mvn compile` | Compiles `src/main/java` to `target/classes`. | Fast inner-loop check; does not run tests or package a JAR. |
| `mvn test` | Runs the test suite (JUnit via `spring-boot-starter-test` + `spring-security-test`). | No custom Surefire configuration — standard `**/*Test.java` discovery. |
| `mvn package` | Compiles, tests, and produces the executable JAR at `target/personal-library-backend-1.0.0.jar` via the `spring-boot-maven-plugin`. | Lombok is explicitly **excluded** from the repackaged JAR (`<excludes>` in the plugin config) since it's a compile-time-only annotation processor, not a runtime dependency. |
| `mvn clean package -DskipTests` | Same as above, skipping tests. | **This is the exact command the Dockerfile's `backend-builder` stage runs** — see [DEVOPS_GUIDE.md §2](DEVOPS_GUIDE.md). |
| `java -jar target/personal-library-backend-1.0.0.jar` | Runs the packaged JAR directly. | Requires `MONGODB_HOST`, `OLLAMA_BASE_URL`, `QDRANT_HOST`, Keycloak env vars to be reachable — see `application.yml` defaults (all default to `localhost`, suitable only if every dependency is also running on `localhost`). |
| `npm run docs:java` | `tsx scripts/generate-javadoc.ts` — **not a Maven task.** A hand-written Node/TypeScript parser that walks every `.java` file and emits HTML into `docs/javadoc/`. | See [FRONTEND_ARCHITECTURE.md §7](FRONTEND_ARCHITECTURE.md) — included here because it documents this backend's own source, just generated from the Node toolchain rather than the real `javadoc` binary (avoids a JDK Javadoc-doclet dependency entirely). |

### 9.1 Active Spring Profiles

| Profile | Activated by | Key differences from base `application.yml` |
| :--- | :--- | :--- |
| *(default)* | No `SPRING_PROFILES_ACTIVE` set (local `mvn`/IDE run) | All service hosts default to `localhost`; Qdrant `initialize-schema: true` (auto-creates the collection on startup — safe for a single local instance). |
| `docker` | `SPRING_PROFILES_ACTIVE=docker` (set in `docker-compose.yml`) | `application-docker.yml` overrides hostnames to the Compose service names (`mongodb`, `qdrant`, `ollama`, `keycloak`); `initialize-schema: false` to avoid a startup race condition if this service were ever horizontally scaled to multiple replicas sharing one Qdrant instance. |

### 9.2 Resolving a locally root-owned `target/`
If `target/` was last written by a container-run Maven build (bind-mounted into the container, built as root), a host-side `mvn compile`/`package` will fail with `Operation not permitted`. Verified workaround used during backend development in this repo: generate the dependency classpath with `mvn -o dependency:build-classpath -Dmdep.outputFile=/tmp/cp.txt`, then compile directly with `javac -cp "$(cat /tmp/cp.txt)" -processorpath <lombok-jar> -d /tmp/scratch-out @<(find src/main/java -name '*.java')` — this sidesteps Maven's own `target/` output directory entirely for a quick correctness check, though a real `mvn package` (for an actual deployable JAR) still requires fixing the directory ownership first (e.g., via `docker compose build`, which runs its own isolated build inside the container and writes the final JAR into the image layer, not back onto the host bind mount).

---

## 10. Data Model Reference

### 10.1 `DocumentEntity` (MongoDB collection: `documents`)
Root aggregate. Key fields: `guid` (primary key), `fileName`, `fileSize`, `format`, `physicalFilePath`, `versionNumber`, `uploadDate`, `editDate`, `bibtex` (embedded `BibTeXMetadata`), `bibtexRaw`, `summaries` (`Map<String, SummaryRecord>`), `contentExcerpt`, `fullContent`, `chunks` (`List<DocumentChunk>`), `versionHistory` (`List<DocumentVersionSnapshot>`, embedded array — see §6.2).

### 10.2 `DocumentVersionSnapshot` (embedded, not a separate collection)
See the full field table in [ENTITY_RELATIONSHIP_SPEC.md §2.5](ENTITY_RELATIONSHIP_SPEC.md) for the authoritative, field-by-field ERD-style reference kept in sync with this class.

### 10.3 Known Issues / Dead Code
- `dto/DocumentUploadRequest.java` is imported in `DocumentService.java` but **never used** (dead import, dead class) — a leftover from before the real controller switched to `@RequestParam MultipartFile` + a raw JSON `bibtex` string parameter. Safe to remove in a future cleanup pass; left as-is here since it causes no runtime behavior difference and removing it is out of scope for documentation.

---

## 11. Related Documents

- [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) — the TypeScript client this API serves.
- [DEVOPS_GUIDE.md](DEVOPS_GUIDE.md) — how this backend is built, containerized, and deployed alongside Mongo/Qdrant/Ollama/Keycloak/nginx.
- [../openapi.yaml](../openapi.yaml) — authoritative REST contract (kept in sync with the controllers listed in §4).
- [ENTITY_RELATIONSHIP_SPEC.md](ENTITY_RELATIONSHIP_SPEC.md) — full MongoDB schema ERD.
- [RAG_ARCHITECTURE_COMPARISON.md](RAG_ARCHITECTURE_COMPARISON.md) — gap analysis of §5's RAG pipeline against canonical reference architectures.
