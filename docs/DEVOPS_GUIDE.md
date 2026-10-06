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

                      swagger-editor :8090 ── (also reachable via nginx /swagger/)
                      mongo-express  :8091 ── (MongoDB web viewer)
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
| `qdrant` | `qdrant/qdrant:v1.11.0` | `16333→6333` (REST), `16334→6334` (gRPC) | — | Vector search; Spring AI connects over gRPC (6334, internal) for binary embedding transfer; TLS disabled since traffic never leaves the internal `library-net` bridge network (edge TLS belongs at nginx). Host-published on `16333`/`16334`, not Qdrant's own `6333`/`6334` defaults, to avoid colliding with a Qdrant instance already running locally. |
| `ollama` | `ollama/ollama:latest` | `21434→11434` | — | Local LLM + embedding inference. Custom `entrypoint: ollama-entrypoint.sh` (not the stock image entrypoint) trusts `./certs` **before** `ollama serve` starts, so the very first model pull can succeed through a corporate TLS-intercepting proxy. `OLLAMA_PRELOAD_MODELS` controls which models are pulled on first boot (default `nomic-embed-text llama3.2 mistral`). Host-published on `21434`, not Ollama's own `11434` default, to avoid colliding with an Ollama daemon already running locally; internal service-to-service traffic still uses the real `11434`. |
| `keycloak` | `quay.io/keycloak/keycloak:24.0.5` | `8180→8080` | — | OIDC identity provider; `start-dev --import-realm` auto-imports `./config/keycloak-realm.json` on first boot. |

### 4.1 Persistent Volumes
`mongodb_data`, `qdrant_data`, `ollama_models` (~7 GB), `library_storage` (uploaded physical files) — all **named, external-lifetime** volumes that survive `docker compose down` and ordinary rebuilds. Only `scripts/rebuild.sh --purge-data`/`--purge-models` removes them (§6).

### 4.2 Why `qdrant: condition: service_started` (not `service_healthy`)
Unlike every other dependency, `qdrant` has no `healthcheck:` block in Compose — `personal-library-app` only waits for the container process to **start**, not for a verified-healthy response. The Spring AI Qdrant client itself handles retry/backoff on first connection, and `VectorRagService`'s RAG chat path gracefully degrades to the document's plain-text excerpt if a Qdrant query fails (see [BACKEND_ARCHITECTURE.md §5.2](BACKEND_ARCHITECTURE.md)) — so the extra startup-ordering guarantee was judged unnecessary for this one dependency.

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
| `--deep` | Additionally removes `node_modules/` **and generated documentation** (`docs/typescript`, `docs/javadoc`, `docs/diagrams` — all reproducible via `npm run docs` / `npm run diagrams`, see §7), forcing a full dependency reinstall and doc regeneration. **Never** touches hand-authored docs (architecture specs, presentations, `openapi.yaml`, the BPMN file, etc.) — there is no npm task that can recreate those if deleted. |
| `--purge-data` | Removes the MongoDB, Qdrant, and uploaded-file **volumes**. Destroys all stored documents and vectors. Ollama models are explicitly kept (re-pulling ~7 GB through a corporate TLS proxy is slow and failure-prone). |
| `--purge-models` | Additionally removes the Ollama model cache volume (forces a fresh ~7 GB pull on next start). |
| `--purge-all` | Shorthand for `--deep --purge-data --purge-models` — a genuine **factory reset**: all stored documents, vectors, and models destroyed. Use deliberately, never by habit. |
| `--force` | Required, in addition to any purge flag, when running **non-interactively** (no TTY on stdin — CI or a scripted/agent invocation). There is no silent auto-skip of the confirmation prompt: without `--force`, a non-interactive purge **aborts** rather than proceeding unattended. |
| `--no-cache` | Builds the Docker image without the layer cache (fully reproducible build). |
| `--pull` | Refreshes third-party base/service images (`mongo`, `mongo-express`, `qdrant`, `ollama`, `keycloak`, `nginx`, `swagger-editor`) before building. |
| `--clean-only` | Stops after the cleaning phase — no build, no deploy. This is exactly what `npm run clean:generated-docs` invokes (`./scripts/rebuild.sh --deep --clean-only`), reusing the same safe generated-vs-hand-authored doc distinction instead of a separate ad hoc `rm`. |
| `--skip-verify` | Skips the post-deploy verification phase (checks `http://localhost:13000/`, `http://localhost:18080/api/v1/documents`, `http://localhost:18080/actuator/health`). |

**Always removed** regardless of flags: `dist/`, `target/`, `server.js`, and the project's own containers/image. **Always kept** unless explicitly purged: MongoDB data, Qdrant vectors, uploaded files, Ollama models. **Never removed**: hand-authored `docs/` content.

### 6.1 Resolving a root-owned `target/` (local Maven builds)
Because `docker compose build` runs Maven **inside the container as root** while `target/` is not bind-mounted back to the host in the default Compose setup, a subsequent host-side `mvn clean`/`mvn compile` can fail with `Operation not permitted` if a local `target/` directory was ever created by a root process on this host. See [BACKEND_ARCHITECTURE.md §9.2](BACKEND_ARCHITECTURE.md) for the verified `javac`-based workaround used during backend development to sidestep this without requiring `sudo chown`.

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

Each script independently emits PNG, SVG, and PDF renditions per diagram (confirmed during the diagram-audit segment of this project's history) — so `docs/diagrams/` is **entirely generated/reproducible** and is exactly what `--deep`/`clean:generated-docs` is safe to delete.

### 7.1 Orphaned / Manual-Only Scripts
Two scripts exist under `scripts/` with **no corresponding `package.json` entry** — they must be invoked directly via `tsx`:
- `tsx scripts/audit-codebase.ts` — cross-checks i18n locale-key parity, dead-import detection, and other repo-wide consistency checks (used during this project's documentation-audit work, never wired to CI).
- `tsx scripts/export-zip.ts` — produces a distributable `.zip` snapshot of the repository, excluding build artifacts/`node_modules`/`.git`.

If you expect an `npm run audit` or `npm run export` task, it does not exist — these are deliberately manual/ad hoc tools, not part of the regular build pipeline.

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
| `mvn clean`/`mvn compile` fails with `Operation not permitted` | `target/` is root-owned from a prior container build | See §6.1 / [BACKEND_ARCHITECTURE.md §9.2](BACKEND_ARCHITECTURE.md) |
| `docker compose up` stack never reports healthy | Ollama still pulling `OLLAMA_PRELOAD_MODELS` on first boot (~7 GB) | Wait — `start_period: 20s` plus `retries: 10` is generous but a cold pull on a slow link can still exceed it; check `docker compose logs ollama`. |
| TLS/cert errors pulling npm/Maven/OS packages during `docker compose build` | `./certs/` is empty or certs aren't in `.crt`/`.pem` format | Drop the corporate root/intermediate CA bundle into `./certs/` — see §2 and [README.md](../README.md) enterprise certificate section. |
| Upload of a large PDF times out partway through summarization | Expected for very large documents — see the `nginx.conf` timeout rationale in §5 | Confirm `OLLAMA_LLAMA_MODEL`/`OLLAMA_MISTRAL_MODEL` are reachable and not themselves still loading; the 36-minute budget is generous but not unlimited. |

---

## 10. Related Documents

- [FRONTEND_ARCHITECTURE.md](FRONTEND_ARCHITECTURE.md) — the Vite/TypeScript client built in stage 1.
- [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) — the Spring Boot service built in stage 2, and its own Maven build-task reference (§9 there).
- [../openapi.yaml](../openapi.yaml) — served both directly by the Java backend's springdoc UI and by the `swagger-editor` service described in §4.
- [COMMUNICATION_ARCHITECTURE.md](COMMUNICATION_ARCHITECTURE.md) — the network/protocol view of how nginx, the two app runtimes, and the data services communicate.
