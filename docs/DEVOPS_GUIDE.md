# DevOps & Deployment Guide

This document is the authoritative technical reference for how **Personal Library** is built, containerized, networked, and operated: the multi-stage `Dockerfile`, the 8-service `docker-compose.yml` stack, the `nginx` ingress, and the `scripts/rebuild.sh` operational tooling. It complements [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) and [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md), which cover what is being built; this document covers how it is built, shipped, and run.

---

## 1. Container Topology at a Glance

```
                                   ┌─────────────────────────────┐
   Browser ───▶ :8088 (nginx) ─────┤ single ingress / reverse proxy│
                                   └───────────┬─────────┬────────┘
                         /api/v1/* ────────────┘         └──────── everything else
                                   ▼                               ▼
                      ┌─────────────────────┐          ┌─────────────────────┐
                      │ personal-library-app │          │ personal-library-app │
                      │  :18080 (Java/Spring) │          │  :13000 (Node/Express)│
                      └──────────┬──────────┘          └──────────┬──────────┘
                                 │                                 │ (mock/Integrated preset only)
          ┌──────────┬──────────┼──────────┬──────────┐           │
          ▼          ▼          ▼          ▼          ▼           ▼
      mongodb    qdrant      ollama    keycloak   (storage      serves dist/
      :37017  :16333/16334  :21434     :8180       volume)      (Vite build)

                      swagger-editor  :8090 ── (also reachable via nginx /swagger/)
                      mongo-express   :8091 ── (MongoDB web viewer)
                      storage-browser :8092 ── (read-only view of library_storage)
                      library-seeder   (—)  ── one-shot: seeds initial_data + remote PDF, then exits
```

**Key fact**: `personal-library-app` is a **single container image** running **two runtimes side by side** (Node/Express on 13000 *and* the Spring Boot JAR on 18080), started together by `docker-entrypoint.sh`. This is not two separate services — see §3.

---

## 2. The `Dockerfile`: Multi-Stage Build

| Stage | Base image | Purpose |
| :--- | :--- | :--- |
| `enterprise-certs` | `alpine:3.20` | Normalizes every `*.crt`/`*.pem` dropped into `./certs/` into one PEM bundle (`enterprise-ca-bundle.pem`) **and** a per-file `/out/*.crt` set, so later stages never need to know individual filenames. `certs/.gitkeep` guarantees the `COPY` never fails even with zero certs present. |
| `frontend-builder` | `node:24.21.0-alpine` | Trusts the enterprise bundle via `NODE_EXTRA_CA_CERTS` (Node merges this with its built-in roots — no OS trust-store rebuild needed on Alpine), then `npm ci && npm run build` → emits the Vite production bundle to `./dist`. |
| `node-runtime` | `node:24.21.0-bookworm-slim` | **Not actually run** — exists purely so stage 3 can `COPY --from=node-runtime /usr/local/ /usr/local/` and inherit a known-good Node.js installation without re-fetching/re-installing it on top of the JRE base image. |
| `backend-builder` | `maven:3.9.8-eclipse-temurin-21` | Installs every enterprise cert into **both** `update-ca-certificates` (OS bundle, for Maven's own HTTPS calls) **and** the JDK `cacerts` keystore via `keytool -importcert` (needed because the JVM's HTTPS client ignores the OS bundle and only trusts its own keystore). Then `mvn clean package -DskipTests` under a BuildKit cache mount (`--mount=type=cache,target=/root/.m2`), so repeated builds only re-fetch dependencies that weren't already cached from a previous build — a transient Maven Central blip no longer means refetching the entire dependency graph. |
| *(final, unnamed)* | `eclipse-temurin:21-jre-jammy` | Production runtime. Installs `ca-certificates`/`curl`, re-applies the same enterprise cert trust (OS bundle + JDK keystore — this is a **separate, smaller JRE image** from the builder, so trust must be re-established here too), copies in the Node install from `node-runtime`, the Vite `dist/` from `frontend-builder`, and the Spring Boot JAR from `backend-builder`, then copies the Node gateway source (`src/main/server`), `openapi.yaml`, and `docker-entrypoint.sh`. |

**Why bundle enterprise certs at all four points (Alpine, Maven builder, JRE OS bundle, JDK keystore)?** Each runtime/tool has its own independent trust mechanism (Node's `NODE_EXTRA_CA_CERTS`, the OS `ca-certificates` package used by `curl`/`apt`, and the JVM's own `cacerts` keystore used by both Maven's and Spring Boot's own HTTPS clients) — trusting only one would leave the others failing TLS verification against a corporate TLS-intercepting proxy (Zscaler/BlueCoat-style). See [README.md's enterprise certificate section](../README.md) for how to populate `./certs/`.

---

## 3. `docker-entrypoint.sh`: Dual-Runtime Startup

The final image's `CMD` runs this script, which starts **both** runtimes in the same container:
1. Launches the Spring Boot JAR (`java -jar app.jar`) in the background.
2. Launches the Node/Express gateway (`node src/main/server/server.js` — compiled from `server.ts`, or run via the TypeScript loader) in the foreground (or vice versa, with process supervision so the container exits if either process dies).

This single-container-two-process design was chosen over two separate images/containers because the Node gateway's **mock/"Integrated" backend preset** needs to serve the exact same `dist/` bundle and optionally proxy to the Java service without introducing a third network hop — keeping the simplest "just run one container" story for local development while still supporting the genuinely separate Java service for production-grade persistence.

---

## 4. `docker-compose.yml`: Service Reference

| Service | Image | Published Ports | Depends On (`condition`) | Role |
| :--- | :--- | :--- | :--- | :--- |
| `personal-library-app` | built locally (`Dockerfile`) | `13000`, `18080` | `mongodb` (healthy), `qdrant` (started), `keycloak` (healthy), `ollama` (healthy) | The application itself — both runtimes (§3). Healthcheck requires **both** `:13000/` and `:18080/actuator/health` to respond before the stack is considered deployed. |
| `swagger-editor` | `swaggerapi/swagger-editor:v5.8.10` | `8090` | — | Serves the official Swagger Editor SPA with the repo's `openapi.yaml` **bind-mounted read-only** directly onto its static web root (`/usr/share/nginx/html/openapi.yaml`) — not the older `SWAGGER_FILE` env var mechanism, which this v5.x nginx-based image doesn't actually wire up. Mounting the real file (not a copy) means the spec is always current with zero rebuild, and edits are easy to diff back against source control. |
| `nginx` | `nginx:1.27-alpine` | `8088→80` | `personal-library-app` (healthy), `swagger-editor` (healthy) | Single ingress — see §5. Host-published on `8088`, not the standard `80`, so this educational stack never collides with another local web server already bound to port 80. |
| `mongodb` | `mongo:7.0` | `37017→27017` | — | Document metadata + version history persistence. Host-published on `37017`, not MongoDB's own `27017` default, to avoid colliding with a MongoDB instance already running locally; internal service-to-service traffic still uses the real `27017`. |
| `mongo-express` | `mongo-express:1.0.2` | `8091→8081` | `mongodb` (healthy) | Lightweight browser GUI for `personal_library` (collections, documents, ad-hoc queries) — an alternative to `mongosh` one-liners. `ME_CONFIG_BASICAUTH=false` since it sits behind the same trust boundary as the other dev-time admin ports; connects internally using the `mongodb` service's `root`/`librarypass` credentials. |
| `storage-browser` | `halverneus/static-file-server:v1.8.10` | `8092→8080` | — | Read-only directory listing of the `library_storage` volume, exposing the physical uploaded files as `{guid}/v{version}/{fileName}`. Complements `mongo-express` (metadata) and the Qdrant dashboard (embeddings) by making the third persistence tier — the bytes on disk — inspectable too, which is what demonstrates that version-isolated subdirectories keep rollback non-destructive. Mounted `:ro` so the viewer can never mutate an asset a version snapshot depends on. **No healthcheck**: the image is built `FROM scratch` (one static Go binary, no shell/wget/curl), so no in-container probe can run. |
| `qdrant` | `qdrant/qdrant:v1.18.0` | `16333→6333` (REST), `16334→6334` (gRPC) | — | Vector search; Spring AI connects over gRPC (6334, internal) for binary embedding transfer; TLS disabled since traffic never leaves the internal `library-net` bridge network (edge TLS belongs at nginx). Host-published on `16333`/`16334`, not Qdrant's own `6333`/`6334` defaults, to avoid colliding with a Qdrant instance already running locally. |
| `ollama` | `ollama/ollama:latest` | `21434→11434` | — | Local LLM + embedding inference. Custom `entrypoint: ollama-entrypoint.sh` (not the stock image entrypoint) trusts `./certs` **before** `ollama serve` starts, so the very first model pull can succeed through a corporate TLS-intercepting proxy. `OLLAMA_PRELOAD_MODELS` controls which models are pulled on first boot (default `nomic-embed-text llama3.2 mistral`). Host-published on `21434`, not Ollama's own `11434` default, to avoid colliding with an Ollama daemon already running locally; internal service-to-service traffic still uses the real `11434`. |
| `keycloak` | `quay.io/keycloak/keycloak:24.0.5` | `8180→8080` | — | OIDC identity provider; `start-dev --import-realm` auto-imports `./config/keycloak-realm.json` on first boot. |
| `library-seeder` | `curlimages/curl:8.11.1` | — | `personal-library-app` (healthy) | **One-shot task container, not a service** (`restart: "no"`). Runs `scripts/seed-initial-documents.sh` once the app is healthy, ingesting every file in `./initial_data` plus a remote public-domain PDF, then exits — see §4.3. |

> **Every image tag and host port in this table is a variable.** The values shown are the defaults; all of them — plus the demo credentials — are set in one place, [`config/settings.env`](../config/settings.env). See §4.5 for how to change them and how precedence works.

### 4.1 Persistent Volumes
`mongodb_data`, `qdrant_data`, `ollama_models` (~7 GB), `library_storage` (uploaded physical files, browsable read-only at `http://localhost:8092` — see `storage-browser` in §4) — all **named, external-lifetime** volumes that survive `docker compose down` and ordinary rebuilds. Only `scripts/rebuild.sh --purge-data`/`--purge-models` removes them (§6).

### 4.2 Why `qdrant: condition: service_started` (not `service_healthy`)
Unlike every other dependency, `qdrant` has no `healthcheck:` block in Compose — `personal-library-app` only waits for the container process to **start**, not for a verified-healthy response. The Spring AI Qdrant client itself handles retry/backoff on first connection, and `VectorRagService`'s RAG chat path gracefully degrades to the document's plain-text excerpt if a Qdrant query fails (see [BACKEND_ARCHITECTURE.md §5.2](BACKEND_ARCHITECTURE.md)) — so the extra startup-ordering guarantee was judged unnecessary for this one dependency.

### 4.3 `library-seeder`: Initial Document Ingestion

A freshly provisioned stack would otherwise present an empty List Report, making
RAG chat, dual summaries, and vector search impossible to evaluate without
manual setup. This sidecar fixes that by seeding two documents:

| Source | Document |
| :--- | :--- |
| `./initial_data/` (mounted `:ro`, every `.pdf`/`.docx`/`.doc`/`.txt`/`.md`) | *Natural Language Processing: A 15-Minute Primer* |
| `SEED_REMOTE_PDF_URL` (public CDN) | *The Wonderful Wizard of Oz* |

**Why it uploads via `POST /api/v1/documents` rather than inserting into
MongoDB/Qdrant directly:** the REST path runs the real pipeline — Tika
extraction, BibTeX metadata, chunking, 768-D embeddings, and the dual
Llama/Mistral summaries. A direct database insert would produce records that
render correctly in the UI but return **nothing** from semantic retrieval,
i.e. precisely the "looks right, isn't" failure mode this project documents
elsewhere (cf. the BPMN reality check in [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md)).

**Why a stock `curlimages/curl` image instead of the application image:** the
seeder only needs HTTP and a POSIX shell. Reusing the app image would force a
second (cache-hit but still resolved) build of a ~1 GB JRE+Node image for a task
that exits in seconds, and would couple seeding to the application build graph.

Design properties:
* **Idempotent** — queries the list report with a `fileName` filter before each
  upload, so repeated `docker compose up` never duplicates records.
* **Non-fatal everywhere** — unreachable API, offline CDN, non-PDF payload, or a
  failed upload all log a warning and `exit 0`; the stack stays healthy.
* **Waits for the API, not just the container** — the Compose health condition
  guarantees the process is up; the script additionally polls
  `GET /documents?pageSize=1` (60 × 5 s) before the first multipart POST.
* **Enterprise TLS aware** — appends every `./certs/*.crt|*.pem` to the stock CA
  bundle at runtime and exports `CURL_CA_BUNDLE`, mirroring the Dockerfile's
  trust strategy (§2) so the HTTPS download survives a TLS-intercepting proxy.
* **Generous timeout** — `SEED_MAX_TIME` (default `900`s) per document, since
  first ingestion is LLM-bound on CPU-only inference.

Environment knobs: `SEED_ENABLED` (`true`), `SEED_REMOTE_PDF_URL`,
`SEED_REMOTE_PDF_NAME`, `SEED_MAX_TIME`, `SEED_API_BASE`, `SEED_LOCAL_DIR`,
`SEED_CERTS_DIR` — the first four live in [`config/settings.env`](../config/settings.env).
Re-run on demand with `npm run compose -- up -d --force-recreate library-seeder`.

#### Why `rebuild.sh` waits for it

Ingestion is **fully synchronous and CPU-bound**: extraction, embedding and two
LLM summarizations all happen inside the upload request, and the MongoDB record
is only written when that finishes. A document is therefore invisible in the UI
for minutes — measured at ~190 s for the Wizard of Oz PDF — while the stack has
been reporting `healthy` the whole time.

That gap is actively misleading: the rebuild used to print its success summary
and URLs over an empty library, which is indistinguishable from a failed seed.
`rebuild.sh` now blocks until the seeder exits, printing live progress, and only
then tells you to open the app:

```
    ✓ Seeding finished in 190s — 2 document(s) in the library.
    ✓ The library is seeded with 2 document(s) — open it now:
      http://localhost:13000/
```

Use `--no-wait-seed` to return immediately instead (seeding still runs in the
background); `SEED_WAIT_TIMEOUT` (default `1800`s) caps the wait either way.

**The exit code is not sufficient on its own.** Because the seeder is non-fatal
by design, an unreachable CDN logs a `WARN` and still exits `0` — so a missing
document would otherwise be reported as a complete library. The wait therefore
greps the seeder's own log for `WARN`/`ERROR` lines and surfaces them:

```
    ! The seeder reported problems; some starter documents may be missing:
      [seed] WARN  Could not download 'the-wonderful-wizard-of-oz.pdf' ...
```

In practice that warning almost always means the DNS problem in §4.4 — the
remote download is the one step that needs outbound name resolution.

### 4.4 `LIBRARY_DNS`: Outbound DNS for `ollama` and `library-seeder`
Two services need to reach the public internet: `ollama` (pulls models from `registry.ollama.ai`) and `library-seeder` (downloads the remote PDF).

Containers do **not** use the host's `/etc/resolv.conf` — they inherit whatever resolver the Docker daemon hands out. If `/etc/docker/daemon.json` pins a public resolver that your network blocks, every outbound lookup fails inside containers while the host itself resolves perfectly:

```jsonc
// /etc/docker/daemon.json — a common cause
{ "dns": ["8.8.8.8"] }
```

The failure is quiet and easy to misread, and it is usually **intermittent** rather than total — a measured ~1-in-6 lookup failure rate on one corporate network. A single `nslookup` from a container therefore usually *succeeds*, while a multi-gigabyte model pull, which performs many lookups, reliably dies partway through (observed: `mistral` failing after 2.5 GB of 4.4 GB). Ollama logs `lookup registry.ollama.ai on 127.0.0.11:53: server misbehaving` and the entrypoint only emits a `WARNING`.

Set `LIBRARY_DNS` to the resolver from the host's `/etc/resolv.conf`; both services pick it up and no Docker daemon change (or `sudo`) is needed:

```bash
grep nameserver /etc/resolv.conf          # e.g. 10.0.0.53
export LIBRARY_DNS=10.0.0.53              # or set it in config/settings.env
docker compose up -d --build
```

**`rebuild.sh` detects this automatically.** Because the symptom is intermittent, its preflight does *not* probe connectivity (a probe usually passes and proves nothing). Instead it compares the daemon's pinned `dns` in `/etc/docker/daemon.json` against the host's own resolver; if the daemon routes container DNS somewhere the host itself does not use, the script exports `LIBRARY_DNS` for that run and says so:

```
! Docker pins container DNS to '8.8.8.8', which the host itself does not use.
    Using the host resolver 10.255.255.254 for Ollama and the seeder this run.
```

It stays silent when the daemon pins nothing, or pins a list that already includes the host resolver. An explicit `LIBRARY_DNS` (environment or `config/settings.env`) always wins. Persist it so plain `docker compose up` — which has no preflight — benefits too:

```bash
grep nameserver /etc/resolv.conf     # then set LIBRARY_DNS in config/settings.env
```

Fixing the daemon's own `dns` setting is the broader cure; `LIBRARY_DNS` is the per-project escape hatch.

Always confirm models before trusting a RAG result:

```bash
docker exec personal-library-ollama ollama list   # expect 3 models
```

### 4.5 Complete Environment Variable Reference

**[`config/settings.env`](../config/settings.env) is the single place to change any of these.** Ports, image versions, demo credentials, model names, DNS/proxy and seeding options all live there, grouped and commented.

#### How a value is resolved

Highest priority first:

| # | Source | Use it for |
| :--- | :--- | :--- |
| 1 | Shell environment | One-off runs: `LIBRARY_DNS=10.0.0.53 npm run rebuild` |
| 2 | Your personal dotenv in the project root | Machine-specific values and real secrets (gitignored) |
| 3 | `config/settings.env` | Shared defaults, committed |
| 4 | `${VAR:-default}` inside `docker-compose.yml` | Last-resort fallback |

Levels 3 and 4 are kept **identical on purpose**, so a bare `docker compose up` — which reads neither an `--env-file` nor `config/settings.env` — still produces exactly the same stack. [`scripts/check-config.sh`](../scripts/check-config.sh) enforces that:

```bash
npm run config:check     # also runs automatically in rebuild.sh preflight
```

It fails if the two disagree, if a compose variable is missing from the central file, or if any variable lacks a `:-default`. Without it the central file could quietly become a lie — someone edits a value, runs plain `docker compose up`, and silently gets the stale inline default.

#### Applying a change

Compose only auto-loads a dotenv file from the project root; it never picks up `config/settings.env` on its own. Use the project's entrypoints, which pass the chain for you:

```bash
npm run rebuild               # and every other rebuild:/ops: script
npm run compose -- up -d      # plain Compose with the env chain wired up
npm run compose -- logs -f personal-library-app
```

#### Ports, images and credentials

| Group | Variables | Notes |
| :--- | :--- | :--- |
| Host ports | `NGINX_HTTP_PORT` `APP_UI_PORT` `APP_BACKEND_PORT` `MONGO_PORT` `MONGO_EXPRESS_PORT` `STORAGE_BROWSER_PORT` `SWAGGER_EDITOR_PORT` `QDRANT_HTTP_PORT` `QDRANT_GRPC_PORT` `OLLAMA_PORT` `KEYCLOAK_PORT` | **Host side only.** Container-internal ports stay fixed, because `nginx.conf` and the inter-service URLs address services by name and internal port. The non-default host values avoid colliding with a MongoDB/Qdrant/Ollama/Keycloak already running locally. |
| Image versions | `IMAGE_MONGO` `IMAGE_MONGO_EXPRESS` `IMAGE_NGINX` `IMAGE_QDRANT` `IMAGE_KEYCLOAK` `IMAGE_SWAGGER_EDITOR` `IMAGE_STORAGE_BROWSER` `IMAGE_SEEDER` `IMAGE_OLLAMA` | Keep `IMAGE_QDRANT`'s major/minor aligned with the Spring AI Qdrant client in `pom.xml`, or startup logs an incompatibility warning. `IMAGE_OLLAMA` is deliberately left at `:latest` — see the note in the file. |
| Demo credentials | `MONGO_ROOT_USERNAME` `MONGO_ROOT_PASSWORD` `MONGO_DATABASE` `KEYCLOAK_ADMIN_USER` `KEYCLOAK_ADMIN_PASSWORD` `KEYCLOAK_REALM` `KEYCLOAK_CLIENT_ID` `KEYCLOAK_CLIENT_SECRET` | **Not secrets** — local throwaway values, committed so the stack starts with zero setup. `MONGO_ROOT_USERNAME`/`MONGO_ROOT_PASSWORD` each feed three services (mongodb, mongo-express, and the backend's `SPRING_MONGODB_URI`), which is exactly why they were centralized. For anything reachable by others, override them in your personal dotenv instead. |

#### Operational knobs

Each one below, its default, and **the code that consumes it**:

| Variable | Default | Consumed by | Purpose |
| :--- | :--- | :--- | :--- |
| `OLLAMA_PRELOAD_MODELS` | `nomic-embed-text llama3.2 mistral` | [`ollama-entrypoint.sh`](../ollama-entrypoint.sh) | Space-separated models pulled on first boot. **All three are required**: `nomic-embed-text` for embeddings, the other two for the dual summaries. |
| `OLLAMA_LLAMA_MODEL` | `llama3.2` | [`AiSummarizationService`](../src/main/java/com/personallibrary/service/AiSummarizationService.java), [`OllamaConfig`](../src/main/java/com/personallibrary/config/OllamaConfig.java) | Chat/citation-grounding model. Must also appear in `OLLAMA_PRELOAD_MODELS`. |
| `OLLAMA_MISTRAL_MODEL` | `mistral` | [`AiSummarizationService`](../src/main/java/com/personallibrary/service/AiSummarizationService.java), [`OllamaConfig`](../src/main/java/com/personallibrary/config/OllamaConfig.java) | Executive-synthesis model. Must also appear in `OLLAMA_PRELOAD_MODELS`. |
| `LIBRARY_DNS` | *(unset — no override)* | `ollama` + `library-seeder` services | Container DNS resolver. Required when the Docker daemon's resolver is blocked — see §4.4. |
| `ENTERPRISE_HTTP_PROXY` | *(unset)* | `ollama` service → `HTTP_PROXY` | Outbound HTTP proxy for model pulls. |
| `ENTERPRISE_HTTPS_PROXY` | *(unset)* | `ollama` service → `HTTPS_PROXY` | Outbound HTTPS proxy for model pulls. Pair with a CA in `./certs` if the proxy intercepts TLS (§2). |
| `ENTERPRISE_NO_PROXY` | `localhost,127.0.0.1,qdrant,mongodb,keycloak` | `ollama` service → `NO_PROXY` | Hosts that must bypass the proxy. **Keep the service names** — routing internal traffic through a proxy breaks the stack. |
| `SEED_ENABLED` | `true` | [`seed-initial-documents.sh`](../scripts/seed-initial-documents.sh) | Set `false` to skip initial document ingestion entirely (§4.3). |
| `SEED_REMOTE_PDF_URL` | Wizard of Oz CDN URL | [`seed-initial-documents.sh`](../scripts/seed-initial-documents.sh) | Remote document to fetch and ingest. |
| `SEED_REMOTE_PDF_NAME` | `the-wonderful-wizard-of-oz.pdf` | [`seed-initial-documents.sh`](../scripts/seed-initial-documents.sh) | File name used for upload **and** for the idempotency check. |
| `SEED_MAX_TIME` | `900` | [`seed-initial-documents.sh`](../scripts/seed-initial-documents.sh) | Per-document timeout (seconds). First ingestion is LLM-bound on CPU-only inference. |

Fixed container-internal values — change these in `docker-compose.yml` itself, not in `config/settings.env`: `SEED_API_BASE`, `SEED_LOCAL_DIR`, `SEED_CERTS_DIR`, `ENTERPRISE_CA_DIR`, `OLLAMA_ORIGINS`, and every container-side port.

#### Spring Boot application properties

The backend's own configuration lives in [`application.yml`](../src/main/resources/application.yml) (defaults) and [`application-docker.yml`](../src/main/resources/application-docker.yml) (the `docker` profile overrides, activated by `SPRING_PROFILES_ACTIVE=docker` in Compose).

| Property | Value | Consumed by | Why it matters |
| :--- | :--- | :--- | :--- |
| `spring.ai.vectorstore.qdrant.collection-name` | `personal_library_embeddings` | [`VectorRagService`](../src/main/java/com/personallibrary/service/VectorRagService.java) | Qdrant collection holding all chunk embeddings. |
| `spring.ai.vectorstore.qdrant.initialize-schema` | `true` (**both** profiles) | Spring AI Qdrant starter | **Must stay `true`** — nothing else provisions the collection. Setting it `false` makes every index call fail with "Collection doesn't exist!", which is caught and logged as a warning, so uploads still return 200 while Qdrant stays empty. |
| `spring.ai.vectorstore.qdrant.port` | `6334` | Spring AI Qdrant starter | gRPC, not the `6333` REST port. |
| `app.models.llama` | `${OLLAMA_LLAMA_MODEL:llama3.2}` | [`AiSummarizationService`](../src/main/java/com/personallibrary/service/AiSummarizationService.java) | Binds `OLLAMA_LLAMA_MODEL` into the dual-summary service. |
| `app.models.mistral` | `${OLLAMA_MISTRAL_MODEL:mistral}` | [`AiSummarizationService`](../src/main/java/com/personallibrary/service/AiSummarizationService.java) | Binds `OLLAMA_MISTRAL_MODEL` into the dual-summary service. |
| `app.storage.upload-dir` | `${STORAGE_DIR:./storage/documents}`, overridden to `/app/storage/documents` in the `docker` profile | [`StorageService`](../src/main/java/com/personallibrary/service/StorageService.java) | Backed by the `library_storage` volume (§4.1). `STORAGE_DIR` only affects a **non-Docker** local run; the `docker` profile hardcodes the container path. |
| `spring.mongodb.uri` | `mongodb://…@mongodb:27017/personal_library` (`docker` profile) | Spring Data MongoDB | Spring Boot 4 renamed this prefix from `spring.data.mongodb`. |
| `spring.ai.ollama.base-url` | `http://ollama:11434` (`docker` profile) | Spring AI Ollama starter | Internal port `11434`, **not** the host-published `21434`. |

---

### 4.6 Recreating Everything After a Factory Reset

`npm run ops:factory-reset` (`rebuild.sh --purge-all`) is the most destructive operation in the repo. It implies `--deep`, `--purge-data`, and `--purge-models`, so it removes:

| Removed | Restored by | Automatic? |
| :--- | :--- | :--- |
| Containers, network, application image | Phase 4–5 of the same script | ✅ |
| `dist/`, `target/`, `server.js` | The container build | ✅ |
| `node_modules/` | `npm ci` in phase 3 | ✅ |
| `docs/typescript/`, `docs/javadoc/`, `docs/diagrams/` *(207 tracked files)* | `npm run docs` + `npm run diagrams` in phase 3b | ✅ |
| MongoDB documents, Qdrant vectors, uploaded files | `library-seeder` re-ingests the two starter documents (§4.3) | ✅ |
| Ollama models (~7 GB) | Re-pulled on next `ollama` start | ✅ *(needs working DNS — §4.4)* |

**Never removed**, and therefore the things that genuinely must live in version control:

* All hand-authored `docs/*.md`, `docs/presentations/`, `openapi.yaml`, the BPMN file.
* The five hand-authored sources inside the otherwise-generated `docs/diagrams/`: `MINDMAP.md`, `architecture_diagrams.mmd` (an **input** to `generate-architecture-from-mmd.ts`), `rag_data_flow.drawio`, `system_architecture.drawio`, `system_architecture.puml`. `rebuild.sh` stashes and restores these around the directory delete — see `PRESERVED_DIAGRAM_SOURCES` in [`rebuild.sh`](../scripts/rebuild.sh). **Add to that list when you add a hand-authored file there.**
* `./certs/` CA material (git-ignored by `certs/*.crt`) — re-supply it manually on a new machine.
* `./initial_data/` — tracked, so the local seed document survives.
* [`config/settings.env`](../config/settings.env) — tracked, so every port, image version and credential comes back exactly as configured. This is what makes the stack reproducible rather than merely rebuildable.
* Your personal dotenv in the project root, if you created one (git-ignored) — so machine-specific overrides and secrets are **not** restored by a fresh clone. Anything you cannot afford to retype belongs in `config/settings.env` instead.

Full recreation from a clean checkout:

```bash
# optional: set LIBRARY_DNS / ENTERPRISE_* in config/settings.env (§4.4, §4.5)
# drop any corporate CA into ./certs/
npm ci                        # host toolchain
npm run ops:factory-reset     # or: npm run compose -- up -d --build
```

No configuration step is required for a default local run — the committed `config/settings.env` and the matching inline defaults in `docker-compose.yml` are sufficient, and `rebuild.sh` auto-detects the broken-DNS case described in §4.4.

Verify the result — a healthy stack is **not** sufficient evidence that RAG works:

```bash
docker exec personal-library-ollama ollama list          # expect 3 models
curl -s localhost:18080/api/v1/documents | head -c 200   # expect totalCount: 2
curl -s localhost:16333/collections/personal_library_embeddings \
  | grep -o '"points_count":[0-9]*'                      # expect > 0
```

That last check is the important one. Every failure in the ingestion path is caught and logged at `warn` level, so an empty Qdrant collection still presents as a perfectly healthy stack with documents visible in the UI. See the troubleshooting rows in §9.

> **Caveat:** `npm run clean:generated-docs` (`--deep --clean-only`) deletes `node_modules` and the generated docs but exits *before* the phases that rebuild them. The script now prints the recovery command; run `npm ci && npm run docs && npm run diagrams` afterwards.

---

## 5. `nginx/nginx.conf`: Routing Table

| Location | Proxies to | Notes |
| :--- | :--- | :--- |
| `/api/v1/` | `java_backend` → `personal-library-app:18080` | The real Spring Boot REST contract (JSON + multipart uploads). `proxy_read_timeout 2160s` (36 min) — sized to exceed the **sum** of up to three sequential Ollama calls during upload (BibTeX fallback + Llama summary + Mistral summary, each budgeted up to the backend's 10-minute per-call Ollama read timeout), matching the frontend's `LLM_TIMEOUT_MS` budget (35 min = 3×10min + 5min buffer) with a small margin so nginx is never the layer that cuts off a model still genuinely working. |
| `/actuator/` | `java_backend` | Spring Boot Actuator health/readiness, proxied for uniform monitoring through the single ingress port. |
| `/swagger/` | `swagger_editor` → `swagger-editor:80` | Trailing slash on both the location and `proxy_pass` strips the `/swagger` prefix so the Editor SPA (which expects to be served from `/`) resolves its own assets correctly behind the sub-path. |
| `/` (catch-all) | `node_gateway` → `personal-library-app:13000` | SPA shell, static assets, and the Node-hosted mock API routes used by the "Integrated" backend preset. Same `2160s` timeout budget as `/api/v1/`, since the mock backend simulates the same long-running flows. |

**Baseline security headers** (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-XSS-Protection`) are applied globally to every response regardless of upstream. `client_max_body_size 50m` matches the Express JSON body limit so legitimate large PDF/DOCX uploads are never rejected at the proxy layer before even reaching either backend.

**Why a single ingress at all?** (enterprise rationale, from the file's own header comment): one firewall/load-balancer port instead of two independently-versioned runtimes exposed directly; same-origin API calls let the backend's CORS policy eventually be tightened from "allow any origin" to same-origin-only; TLS termination/headers/gzip/timeouts are enforced in exactly one place instead of duplicated across runtimes; internal container ports/hostnames are never exposed to the browser or outside network. Direct `:13000`/`:18080` access remains published for local development and for exercising the "Direct Java Spring Boot" preset in the UI's Backend Settings dialog — nginx is the **recommended** production ingress, not the only path.

---

## 6. `scripts/rebuild.sh`: Operational Tooling

A single script drives the full clean-rebuild-redeploy-verify cycle. All flags are additive/composable unless noted.

| Flag | Effect |
| :--- | :--- |
| *(none)* | Routine clean rebuild: removes `dist/`, `target/`, `server.js`, and the project's existing containers/image; rebuilds; redeploys; verifies. Named volumes (Mongo/Qdrant/uploaded files/Ollama models) are **preserved**. |
| `--deep` | Additionally removes `node_modules/` **and generated documentation** (`docs/typescript`, `docs/javadoc`, `docs/diagrams` — see §7), then **reinstalls dependencies and regenerates all three trees automatically** (phases 3 and 3b), so the working tree is left clean. Hand-authored docs are never touched; the five hand-authored sources inside `docs/diagrams/` are stashed and restored around the delete — see `PRESERVED_DIAGRAM_SOURCES` and §4.6. |
| `--purge-data` | Removes the MongoDB, Qdrant, and uploaded-file **volumes**. Destroys all stored documents and vectors. Ollama models are explicitly kept (re-pulling ~7 GB through a corporate TLS proxy is slow and failure-prone). |
| `--purge-models` | Additionally removes the Ollama model cache volume (forces a fresh ~7 GB pull on next start). |
| `--purge-all` | Shorthand for `--deep --purge-data --purge-models` — a genuine **factory reset**: all stored documents, vectors, and models destroyed. Use deliberately, never by habit. |
| `--force` | Required, in addition to any purge flag, when running **non-interactively** (no TTY on stdin — CI or a scripted/agent invocation). There is no silent auto-skip of the confirmation prompt: without `--force`, a non-interactive purge **aborts** rather than proceeding unattended. |
| `--no-cache` | Builds the Docker image without the layer cache (fully reproducible build). |
| `--pull` | Refreshes third-party base/service images (`mongo`, `mongo-express`, `qdrant`, `ollama`, `keycloak`, `nginx`, `swagger-editor`) before building. |
| `--clean-only` | Stops after the cleaning phase — no build, no deploy. This is exactly what `npm run clean:generated-docs` invokes (`./scripts/rebuild.sh --deep --clean-only`), reusing the same safe generated-vs-hand-authored doc distinction instead of a separate ad hoc `rm`. |
| `--skip-verify` | Skips the post-deploy verification phase (see §6.2). |
| `--no-wait-seed` | Returns without waiting for starter-document seeding. Seeding still runs, but the library may be empty when the summary prints (§4.3). |

**Always removed** regardless of flags: `dist/`, `target/`, `server.js`, and the project's own containers/image. **Always kept** unless explicitly purged: MongoDB data, Qdrant vectors, uploaded files, Ollama models. **Never removed**: hand-authored `docs/` content.

### 6.1 Resolving a root-owned `target/` (local Maven builds)
Because `docker compose build` runs Maven **inside the container as root** while `target/` is not bind-mounted back to the host in the default Compose setup, a subsequent host-side `mvn clean`/`mvn compile` can fail with `Operation not permitted` if a local `target/` directory was ever created by a root process on this host. See [BACKEND_ARCHITECTURE.md §9.2](BACKEND_ARCHITECTURE.md) for the verified `javac`-based workaround used during backend development to sidestep this without requiring `sudo chown`.

`rebuild.sh` itself is **immune** to this. Its artifact-deletion step first attempts an ordinary host-side `rm -rf`; if that is denied, it retries the delete from a throwaway `alpine:3.20` root container with the project root bind-mounted. Only the named artifact (`dist`, `target`, `server.js`, …) is removed, and the script fails loudly if even the root-container attempt does not succeed. This keeps `sudo` out of the reset path entirely — Docker is already a verified preflight dependency, so no new requirement is introduced.

### 6.2 Post-deploy verification: why "healthy" is not enough

Deployment waits on real container health checks (`docker compose up -d --wait`) rather than a fixed sleep. Verification then checks, in order: the frontend, the Spring Boot `/actuator/health` endpoint, the documents API, the installed Ollama models, and **the Qdrant vector count**.

A health check is only as honest as its probe. The `ollama` check originally ran `ollama list`, which succeeds the moment the daemon accepts connections — **even with zero models installed**. The container therefore reported healthy about six seconds after start while a ~7 GB pull was still running, and every dependent gated on `condition: service_healthy` started far too early. The backend then died during context initialization, because `QdrantVectorStore.afterPropertiesSet()` calls `EmbeddingModel.dimensions()`, which embeds a probe string:

```
Caused by: org.springframework.ai.retry.NonTransientAiException:
  404 - {"error":"model \"nomic-embed-text\" not found, try pulling it first"}
```

The check now asserts that **every** model in `OLLAMA_PRELOAD_MODELS` is present, with a `start_period` long enough for a cold pull. Health means "the models are usable", not "the daemon is listening", which makes the model-less deployment described in §4.4 structurally impossible rather than merely documented.

The same scepticism applies to vectors. Indexing and retrieval failures in `VectorRagService` are caught and logged at `warn` while the HTTP layer still returns **200**, so a fully healthy stack can hold zero vectors and answer from the model's own training data instead of the library — the exact failure this application exists to prevent. The two checks that cannot be faked:

```bash
docker exec personal-library-ollama ollama list                 # expect 3 models
curl -s localhost:16333/collections/personal_library_embeddings # expect points_count > 0
```

A `points_count` of `0` is only legitimate immediately after `--purge-data`, before seeding or the first upload finishes.

### 6.3 One-shot services and `--wait`

`docker compose up --wait` fails when **any** waited container exits — including a one-shot job that finished successfully with exit code `0`. `library-seeder` is exactly such a job: it uploads the starter documents and terminates.

`rebuild.sh` therefore excludes the services listed in its `ONESHOT_SERVICES` array from the waited set and starts the seeder separately **after** the stack is confirmed healthy, treating a seeding failure as non-fatal (no network must not fail an otherwise good deployment). Plain `docker compose up` is unaffected and still seeds as documented in §7.1. **Add any future run-to-completion service to `ONESHOT_SERVICES`**, or it will report every successful deployment as a failure.

---

## 7. Documentation Build Tasks (`npm run docs`, `npm run diagrams`)

These are genuinely DevOps-adjacent (they produce the very documentation artifacts this guide and its siblings describe) and are listed here rather than in FRONTEND_ARCHITECTURE.md because they touch both frontend (`typedoc`) and backend (`generate-javadoc.ts`) source.

| Command | Expands to | Output |
| :--- | :--- | :--- |
| `npm run docs:ts` | `typedoc` (config: `typedoc.json`) | `docs/typescript/` — HTML API reference generated from the frontend's TSDoc comments. |
| `npm run docs:java` | `tsx scripts/generate-javadoc.ts` | `docs/javadoc/` — a hand-written Node/TypeScript parser that walks every `.java` source file and emits HTML, deliberately avoiding a dependency on the real `javadoc` binary/JDK doclet toolchain. |
| `npm run docs` | `typedoc && tsx scripts/generate-javadoc.ts` | Both of the above, sequentially. |
| `npm run diagrams` | 8 chained `tsx` scripts, in order (`&&`, so any failure stops the chain): | `docs/diagrams/` |

**The 8 `diagrams` sub-scripts, individually:**
1. `generate-diagrams.ts` — base Mermaid diagram set (system overview, deployment).
2. `generate-architecture-diagrams.ts` — component/container architecture diagrams.
3. `generate-uml-diagrams.ts` — UML class diagrams from the Java model/DTO classes.
4. `generate-architecture-from-mmd.ts` — renders any hand-authored `.mmd` (raw Mermaid source) files into the same output format as the generated ones, so hand-tuned diagrams aren't a special case for downstream consumers.
5. `generate-mindmap.ts` — project concept mindmap.
6. `generate-entity-diagrams.ts` — MongoDB entity/ERD diagrams (feeds [ENTITY_RELATIONSHIP_SPEC.md](ENTITY_RELATIONSHIP_SPEC.md)).
7. `generate-ontology-diagrams.ts` — domain ontology/concept-relationship diagrams.
8. `generate-rag-diagrams.ts` — RAG pipeline/data-flow diagrams (feeds the RAG docs, see [RAG_ARCHITECTURE_COMPARISON.md](RAG_ARCHITECTURE_COMPARISON.md)).

Each script independently emits PNG, SVG, and PDF renditions per diagram.

**`docs/diagrams/` is *not* entirely generated, despite the name.** Five files there are hand-authored and no generator recreates them:

| File | Role |
| :--- | :--- |
| `architecture_diagrams.mmd` | **Input** consumed by `generate-architecture-from-mmd.ts` (sub-script 4) |
| `system_architecture.puml` | Hand-tuned PlantUML source |
| `system_architecture.drawio` | Hand-tuned draw.io source |
| `rag_data_flow.drawio` | Hand-tuned draw.io source |
| `MINDMAP.md` | Hand-authored narrative companion to the generated mindmap |

Note that *other* `.mmd`/`.puml` files in the same directory (`mindmap.mmd`, `entity_relationship_diagram.puml`, …) **are** generated, so extension alone cannot distinguish them. `rebuild.sh` therefore carries an explicit `PRESERVED_DIAGRAM_SOURCES` list and stashes those five around the directory delete. **Keep that list in sync** when adding a hand-authored file here — see §4.6.

Everything else under `docs/diagrams/` is reproducible and safe for `--deep`/`clean:generated-docs` to remove.

### 7.1 Orphaned / Manual-Only Scripts
Two TypeScript scripts exist under `scripts/` with **no corresponding `package.json` entry** — they must be invoked directly via `tsx`:
- `tsx scripts/audit-codebase.ts` — cross-checks i18n locale-key parity, dead-import detection, and other repo-wide consistency checks (used during this project's documentation-audit work, never wired to CI).
- `tsx scripts/export-zip.ts` — produces a distributable `.zip` snapshot of the repository, excluding build artifacts/`node_modules`/`.git`.

If you expect an `npm run audit` or `npm run export` task, it does not exist — these are deliberately manual/ad hoc tools, not part of the regular build pipeline.

`scripts/seed-initial-documents.sh` is also absent from `package.json`, but is **not** orphaned: it is the entrypoint of the `library-seeder` compose service (§4.3) and is bind-mounted into that container rather than executed on the host.

### 7.2 Configuration Scripts

| Script | npm task | Purpose |
| :--- | :--- | :--- |
| [`scripts/check-config.sh`](../scripts/check-config.sh) | `npm run config:check` | Verifies [`config/settings.env`](../config/settings.env) and the `${VAR:-default}` fallbacks in `docker-compose.yml` agree. Also run during `rebuild.sh` preflight, so drift fails a build rather than silently producing a stack that ignores the central file. |
| [`scripts/compose.sh`](../scripts/compose.sh) | `npm run compose -- <args>` | `docker compose` with the env-file chain wired up. Compose only auto-loads a root dotenv file, so without this wrapper edits to `config/settings.env` appear to do nothing. |
| [`scripts/lib/compose-env.sh`](../scripts/lib/compose-env.sh) | *(sourced)* | Builds that chain — committed defaults first, personal overrides last, since a later `--env-file` wins. Shared by `rebuild.sh` and `compose.sh` so every entrypoint resolves configuration identically. |

`rebuild.sh` routes **all** of its Compose calls through a `dc()` wrapper built on the same helper. It deliberately does *not* source the env files into its own environment: exported values would rank above the `--env-file` chain in Compose's precedence and silently defeat the personal overrides. Its `setting()` helper instead reads the chain in the same order Compose does, which is how the final summary reports the ports that were actually deployed.

---

## 8. Build Task Cross-Reference (All Three Toolchains)

| Toolchain | "Build for production" | "Run tests" | "Clean" | Full reference |
| :--- | :--- | :--- | :--- | :--- |
| npm/Vite (frontend) | `npm run build` | *(no frontend test suite exists)* | `npm run clean` | [FRONTEND_ARCHITECTURE.md §7](FRONTEND_ARCHITECTURE.md) |
| Maven (backend) | `mvn clean package -DskipTests` | `mvn test` | `mvn clean` | [BACKEND_ARCHITECTURE.md §9](BACKEND_ARCHITECTURE.md) |
| Docker/Compose (whole stack) | `docker compose build` (invokes both of the above inside the multi-stage `Dockerfile`) | integration-level only, via live `curl` against a running stack (no automated test harness) | `./scripts/rebuild.sh --clean-only` | This document, §2 and §6 |

---

## 9. Troubleshooting Quick Reference

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| `mvn clean`/`mvn compile` fails with `Operation not permitted` | `target/` is root-owned from a prior container build | See §6.1 / [BACKEND_ARCHITECTURE.md §9.2](BACKEND_ARCHITECTURE.md). `./scripts/rebuild.sh` handles this automatically. |
| `rebuild.sh` aborts at step 3 with `rm: cannot remove 'target/...': Permission denied` | Root-owned build output from a container build | Fixed — the script now retries the delete in a root container (§6.1). If you still see this, the container fallback itself failed; check `docker info`. |
| `docker compose up` stack never reports healthy | Ollama still pulling `OLLAMA_PRELOAD_MODELS` on first boot (~7 GB) | Wait — `start_period: 20s` plus `retries: 10` is generous but a cold pull on a slow link can still exceed it; check `docker compose logs ollama`. |
| `ollama list` is empty and logs show `lookup registry.ollama.ai on 127.0.0.11:53: server misbehaving` | Containers inherit the Docker daemon's resolver. If `/etc/docker/daemon.json` pins a public DNS server (e.g. `8.8.8.8`) your network degrades or blocks, model pulls fail even though the host resolves fine. Often intermittent, so a large pull dies partway. | `rebuild.sh` now detects and overrides this automatically. For plain `docker compose`, set `LIBRARY_DNS` to the host's resolver — see §4.4. |
| App exits at startup with `404 ... model "nomic-embed-text" not found` | `ollama` reported healthy before its models finished pulling, so the app started too early; `QdrantVectorStore.afterPropertiesSet()` probes the embedding model for its dimensions. | Fixed — the `ollama` health check now requires every `OLLAMA_PRELOAD_MODELS` entry to be present (§6.2). If it persists, the pull itself is failing: `docker compose logs ollama`. |
| Documents appear in the UI but chat/RAG returns nothing relevant | Ingestion ran before `nomic-embed-text` was available, so `VectorRagService` logged `Vector store indexing skipped or failed (fallback to in-memory)` and Qdrant holds **zero** vectors. Almost always a symptom of the DNS row above. | Fix DNS, confirm all three models with `docker exec personal-library-ollama ollama list`, then re-upload the affected documents (delete them first — the seeder skips names already present). |
| TLS/cert errors pulling npm/Maven/OS packages during `docker compose build` | `./certs/` is empty or certs aren't in `.crt`/`.pem` format | Drop the corporate root/intermediate CA bundle into `./certs/` — see §2 and [README.md](../README.md) enterprise certificate section. |
| Upload of a large PDF times out partway through summarization | Expected for very large documents — see the `nginx.conf` timeout rationale in §5 | Confirm `OLLAMA_LLAMA_MODEL`/`OLLAMA_MISTRAL_MODEL` are reachable and not themselves still loading; the 36-minute budget is generous but not unlimited. |
| Library is empty after `docker compose up --build` | Seeding is still running (it is synchronous and takes minutes per document — §4.3), or `library-seeder` skipped/failed, which is deliberately non-fatal. `npm run rebuild` waits and reports; plain `docker compose up` does not. | `docker compose logs library-seeder`. Common causes: `SEED_ENABLED=false`, no network for the CDN download, or a TLS error needing a cert in `./certs/` (§4.3). Re-run with `docker compose up library-seeder`. |
| `library-seeder` logs `WARN ... HTTP 500` on upload | The ingestion pipeline itself failed — usually Ollama models still loading | Wait for `docker exec -it personal-library-ollama ollama list` to show all three models, then `docker compose up library-seeder` again (already-ingested documents are skipped). |
| `rebuild.sh` reports `Deployment failed` but `docker compose ps` shows everything running | `docker compose up --wait` fails when any waited container **exits**, even successfully (exit `0`). A one-shot service was included in the waited set. | Add the service to `ONESHOT_SERVICES` in `rebuild.sh` — see §6.3. |
| `personal-library-mongodb is unhealthy` during `docker compose up --build`, then recovers | The `mongosh` probe is a full Node.js runtime and times out while the Maven/Vite builds saturate the CPU. Enough consecutive timeouts mark it unhealthy, and every `depends_on: service_healthy` consumer then aborts. | Fixed — `mongodb` and `mongo-express` now carry generous `start_period` values (failures inside `start_period` do not count toward `retries`). A genuinely dead service still fails. |
| Verification prints `Qdrant collection ... is missing` | `initialize-schema` is not `true`, so nothing ever creates the collection and every index call fails silently behind a `warn` | Ensure `initialize-schema: true` in **both** `application.yml` and `application-docker.yml` (§4.5), then restart the app. |

---

## 10. Related Documents

- [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) — the Vite/TypeScript client built in stage 1.
- [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) — the Spring Boot service built in stage 2, and its own Maven build-task reference (§9 there).
- [../openapi.yaml](../openapi.yaml) — served both directly by the Java backend's springdoc UI and by the `swagger-editor` service described in §4.
- [COMMUNICATION_ARCHITECTURE.md](COMMUNICATION_ARCHITECTURE.md) — the network/protocol view of how nginx, the two app runtimes, and the data services communicate.
