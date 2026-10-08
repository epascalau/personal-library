# Frontend Technical Documentation

This document is the authoritative technical reference for the **Personal Library** client application: a framework-free TypeScript Single Page Application (SPA) built on **SAP UI5 Web Components**, compiled by **Vite**. It covers source layout, runtime architecture, state management, the pluggable backend adapter pattern, internationalization, and every frontend-related build/tooling task.

> For a narrative introduction see [README.md § Frontend Architecture](../README.md#frontend-architecture-vanilla-typescript--sap-ui5-web-components). This document goes deeper into module responsibilities and the build pipeline.

---

## 1. Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| UI Component Library | `@ui5/webcomponents`, `-fiori`, `-icons`, `-base` v2.27 | Native `customElements` (Shadow DOM), zero framework runtime, SAP Fiori controls composed into application-owned List Report and Object Page floorplans. |
| Language | TypeScript 6.0 (strict, `isolatedModules`, `noEmit`) | Type-checked without a framework-specific compiler; `tsc --noEmit` is the lint gate (`npm run lint`). |
| Build Tool | Vite 8 | Native ESM dev server, Rolldown-based production bundling, first-class TypeScript support with zero config transforms. |
| CSS | Tailwind CSS 4 (`@tailwindcss/vite` plugin) | Utility-first styling layered on top of UI5's own component styling; JIT compiled directly inside Vite's pipeline — no separate PostCSS CLI step. |
| Rendering model | Hand-rolled `Component`/`Store`/`EventBus` primitives (`src/main/frontend/core/`) | A deliberate **non-framework** choice — see §3. No React/Vue/Angular runtime ships to the browser. |
| Dev server | `tsx server.ts` (Express, same server as production) | The exact same Express app that serves production also powers local dev — no separate webpack-dev-server/vite-middleware divergence to keep in sync. |
| Documentation | TypeDoc 0.28 | Generates `docs/typescript/` from annotated entry points (see §7). |

---

## 2. Source Directory Layout

```
src/main/frontend/
├── core/              # Framework-free rendering & state primitives (no UI5/business knowledge)
│   ├── component.ts    # Component base class: light-DOM host, string-template re-render, focus/scroll preservation
│   ├── store.ts        # Minimal observable Store<S> (replaces React Context + useState)
│   ├── eventBus.ts      # Typed pub/sub on a detached DOM Comment node (never mounted, never bubbles)
│   └── html.ts          # Tagged-template HTML builder (`html\`...\`` → RawHtml, XSS-safe interpolation)
│
├── stores/             # Application state (one Store<S> instance per concern)
│   ├── appStore.ts      # Navigation, document collection, filters, pagination, upload/rollback mutations, toasts
│   ├── backendStore.ts  # Active BackendAdapter + BackendConfig + health polling (see §5)
│   ├── i18nStore.ts     # Active locale + translation lookup
│   └── themeStore.ts    # Light/dark theme persisted to localStorage
│
├── services/backend/    # Pluggable backend adapter pattern (see §5)
│   ├── types.ts          # BackendAdapter interface, BackendConfig, DTOs shared by all adapters
│   ├── events.ts          # Typed request/success/failure event envelopes for the EventBus
│   ├── BackendGateway.ts  # Maps `backend:<op>:request` events onto the active adapter's method
│   ├── RestBackendAdapter.ts  # Real HTTP implementation (fetch, multipart, Bearer auth)
│   ├── MockBackendAdapter.ts  # Fully in-memory offline simulation (local:// scheme)
│   └── index.ts           # BACKEND_PRESETS, createBackendAdapter() factory, localStorage persistence
│
├── views/               # SAP UI5-backed Component subclasses (one per floorplan/fragment)
│   ├── AppView.ts          # Root shell: mounts ShellBar, routes between List Report / Object Page
│   ├── ShellBarView.ts     # Top app bar: branding, backend health pill, language/theme switches
│   ├── ListReportView.ts   # SAP Fiori List Report floorplan: filter bar, table, upload trigger
│   ├── ObjectPageView.ts   # SAP Fiori Object Page floorplan: document detail, summaries, RAG chat, version history
│   ├── FooterView.ts, ToastView.ts, LanguageSelectorView.ts
│   └── dialogs/             # Modal dialogs (UploadDialogView, VersionOverwriteDialogView, AuthModalView,
│                             #   BackendSettingsModalView, DeleteConfirmDialogView, OpenApiModalView, BpmnModalView)
│
├── ui5/                 # UI5 runtime bootstrap (NOT business logic)
│   ├── bootstrap.ts        # Side-effect imports registering the UI5 custom elements used by the app
│   ├── icons.ts            # Registers only the specific `@ui5/webcomponents-icons` glyphs actually used
│   ├── globalStylesheet.ts # Injects the compiled Tailwind stylesheet into UI5's Shadow DOM boundary
│   └── flags.ts            # Feature-flag constants
│
├── i18n/                # Internationalization
│   └── translations/     # en.ts, de.ts, fr.ts, es.ts, ro.ts — flat key→string record per locale
│
├── public/              # Static assets copied verbatim to dist/ (diagrams, speaker notes, explainer HTML portals)
├── types.ts             # Shared frontend-wide TypeScript types (DocumentRecord, FilterState, UserProfile, ...)
└── index.html           # Vite entry HTML (Vite root — see vite.config.ts)
```

---

## 3. Rendering Model: Why No Framework?

The app deliberately does **not** use React, Vue, or Angular. Three small primitives in `core/` reproduce just enough of a component model to build SAP Fiori floorplans on top of native UI5 Web Components:

1. **`Component` (`core/component.ts`)** — a base class each view extends. It owns one light-DOM host element, renders by producing an HTML string from current state, and **re-renders wholesale** on every state change (the same mental model as a React `render()`, minus the virtual DOM diffing — UI5's own Shadow DOM custom elements handle their own internal reactivity). Two details make this viable for a real app:
   - **`data-focus-key`**: UI5 input and textarea elements carrying this attribute keep keyboard focus and text-selection range across a re-render (critical for the live filter bar and RAG chat input, which re-render on every keystroke).
   - **`data-scroll-key`**: elements carrying this attribute keep their scroll offset across a re-render (the document table and chat transcript).
2. **`Store<S>` (`core/store.ts`)** — a minimal observable state container (`getState()`, `setState(partial)`, `subscribe(listener)`). It replaces what used to be React `Context` + `useState` pairs. Each of the four stores in `stores/` is a `Store<S>` subclass with typed state and imperative mutation methods (no reducers/actions boilerplate).
3. **`eventBus.ts`** — a typed pub/sub broker anchored to a **detached DOM `Comment` node** (`document.createComment('app-bus')`, never appended to `document.body`). This gives genuine `EventTarget` semantics (`dispatchEvent`/`addEventListener`) with zero risk of leaking events onto `window` or polluting the real DOM tree. See [docs/COMMUNICATION_ARCHITECTURE.md](COMMUNICATION_ARCHITECTURE.md) for the full ADR comparing this against WebSockets.

**Why this matters for the build**: because there is no framework runtime, `vite build` has nothing framework-specific to tree-shake around — the entire bundle is the app's own ~20 views/stores/services plus the UI5 Web Components packages, which is why the build output (§6) is dominated by UI5's own translation bundles rather than application code.

---

## 4. State Management

Four singleton `Store` instances, each imported wherever needed (no provider tree, no context nesting):

| Store | Owns | Key mutation methods |
| :--- | :--- | :--- |
| `appStore` | Current view (`list`/`object`), selected document GUID, document collection, `FilterState`, pagination, upload/summarize/rollback in-flight flags, toast queue | `selectDocument()`, `applyFilters()`, `uploadDocument()`, `triggerRollback()`, `pushToast()` |
| `backendStore` | Active `BackendAdapter` instance + `BackendConfig` (one of the 3 presets or a custom URL), last health-check result, polling timer | `switchPreset()`, `setCustomConfig()`, `testHealth()` |
| `i18nStore` | Active locale code, flattened translation table | `setLocale()`, `t(key)` |
| `themeStore` | `'light' \| 'dark'`, persisted to `localStorage` | `toggleTheme()` |

Views subscribe to exactly the store(s) they need in their constructor and unsubscribe in `unmount()` (tracked via the `track(unsub)` helper on `Component`), so there is no memory-leak risk from dangling subscriptions across view swaps.

---

## 5. Pluggable Backend Adapter Pattern

No view or store ever calls `fetch()` directly, and no view ever imports `RestBackendAdapter` or `MockBackendAdapter` by name. The indirection is fully event-driven:

```
[View / Store]
     │  requestBackend('uploadDocument', payload)
     ▼
[backendBus]  (typed EventBus, see core/eventBus.ts)
     │  publishes 'backend:uploadDocument:request'
     ▼
[BackendGateway]  (services/backend/BackendGateway.ts)
     │  looks up the current adapter via a LAZY getter: () => backendStore.state.adapter
     │  invokes adapter.uploadDocument(payload)
     ▼
[BackendAdapter]  (interface, services/backend/types.ts)
     ├── RestBackendAdapter   — real HTTP: fetch(), multipart FormData, Bearer auth, timeout budget
     └── MockBackendAdapter   — fully in-memory, simulated latency, no network
     │
     ▼  resolves/rejects
[BackendGateway] publishes 'backend:uploadDocument:success' or '...:failure'
     ▼
[View / Store] resolves its awaited requestBackend() promise
```

**Why this indirection exists**: switching the active backend (see `BackendSettingsModalView`) only ever swaps which object `backendStore.state.adapter` points to. Because `BackendGateway` resolves the adapter **lazily** (`() => this.state.adapter`, not a captured reference), the very next request after a switch is already routed correctly — no event listeners need to be torn down and re-wired.

### 5.1 The three `BACKEND_PRESETS` (`services/backend/index.ts`)

| Preset key | `name` | `baseUrl` | Real or simulated? |
| :--- | :--- | :--- | :--- |
| `springBootDirect` | Direct Java Spring Boot | `http://localhost:18080/api/v1` | **Real** — genuine MongoDB, Qdrant, Ollama. **Default.** |
| `integrated` | Integrated Gateway | `/api/v1` | Real when reached through nginx (routes to Java); **simulated** in-memory when the Node gateway answers directly (dev/offline). |
| `mock` | Local Standalone Engine | `local://offline` | Always simulated — no network calls at all, used for fully offline demos. |

`loadSavedBackendConfig()` persists the user's choice to `localStorage` and enforces a minimum timeout (`LLM_TIMEOUT_MS`, 10 minutes) regardless of what was saved, so a stale short timeout can never silently break long-running Ollama calls after an app update.

### 5.2 `RestBackendAdapter.ts` — real HTTP specifics

- Upload (`POST /documents`) and overwrite (`PUT /documents/{guid}`) are sent as **`multipart/form-data`** via the browser's native `FormData`, **never** as JSON — this exactly matches the real Java controllers' `@RequestParam MultipartFile` signatures (see [BACKEND_ARCHITECTURE.md §4](BACKEND_ARCHITECTURE.md)). Setting a `Content-Type` header explicitly on a `FormData` body would strip the required multipart `boundary` parameter, so it is deliberately left for the browser to set.
- Long-running calls (upload, overwrite, summarize, chat) use a generous shared `LLM_TIMEOUT_MS` budget sized to absorb Ollama's worst case — see [README.md § Timeout Configuration](../README.md) for the full end-to-end timeout chain.
- `getDownloadUrl()`/`getHistoricalDownloadUrl()` just construct plain URLs (`/documents/{guid}/download`, `/documents/{guid}/versions/{v}/download}`) for native `<a>` download — no fetch/blob handling needed client-side.

---

## 6. Internationalization (i18n)

- `i18n/translations/{en,de,fr,es,ro}.ts` each export a flat `Record<string, string>` of translation keys.
- `i18nStore.t(key)` looks up the active locale's table, falling back to `en` for missing keys.
- `scripts/audit-codebase.ts` (run manually, not wired to an npm script — see [DEVOPS_GUIDE.md §6](DEVOPS_GUIDE.md)) checks **key parity** across all five locale files and fails loudly if any locale is missing a key another one defines, preventing silent blank-string UI regressions in non-English locales.

---

## 7. Build & Tooling Tasks (from `package.json`)

All commands below run from the repository root with `npm run <script>`.

| Script | Command | What it does | When to use |
| :--- | :--- | :--- | :--- |
| `dev` | `tsx server.ts` | Boots the **same Express server used in production** (`src/main/server/server.ts`) directly from TypeScript via `tsx`, with Vite wired in **middleware mode** for instant HMR. This is the primary local development loop. | Day-to-day frontend development. |
| `build` | `vite build` | Production bundle: TypeScript → ESM, Tailwind JIT compile, UI5 Web Components tree-shaken to only the elements actually imported, output to `./dist` (`vite.config.ts` sets `root: src/main/frontend`, `outDir: ./dist` at the repo root so Express/Dockerfile paths never change). | Before any deployment; also runs automatically inside the Docker image build (Dockerfile stage 1). |
| `start` | `node server.ts` | Runs the **compiled/production** server against the already-built `./dist` — this is what `docker-entrypoint.sh` effectively runs inside the container (via `tsx`, since the container ships TypeScript sources directly rather than a separate `tsc` compile step for the Node side). | Production / container runtime; manual smoke-testing of a build without Docker. |
| `preview` | `vite preview` | Serves the already-built `./dist` directory standalone via Vite's own static preview server (bypasses the Express gateway entirely — no `/api/v1` routes are available in this mode). | Quick visual check of a production bundle's static assets only. |
| `clean` | `rm -rf dist server.js` | Removes only the frontend build output and the (legacy/unused) compiled `server.js`, leaving `node_modules`, docs, and data untouched. | Forcing a clean `vite build` without a full `rebuild.sh` cycle. |
| `lint` | `tsc --noEmit` | Type-checks the entire TypeScript project (frontend **and** the Node gateway under `src/main/server/`) with zero emitted output — this is the project's only "lint" gate; there is no ESLint/Prettier configured. | Before every commit; wired as the fast pre-flight check in CI-style workflows. |
| `docs:ts` | `typedoc` | Generates `docs/typescript/` HTML API reference from the entry points listed in `typedoc.json` (core primitives, all 4 stores, the full `services/backend/` adapter layer, and the 3 most complex views/dialogs). | After any public API change to a documented entry point. |
| `docs:java` | `tsx scripts/generate-javadoc.ts` | Custom hand-written Javadoc-style HTML generator (not the real `javadoc` tool — no JDK dependency needed) that parses every `.java` file under `src/main/java/com/personallibrary/` and emits linked HTML into `docs/javadoc/`. | After any Java class/method signature change. |
| `docs` | `typedoc && tsx scripts/generate-javadoc.ts` | Runs both of the above in sequence. | Regenerating the full `docs/` API reference portal in one step. |
| `diagrams` | chained `tsx scripts/generate-*.ts` (6 scripts) | Regenerates **every** architecture/UML/ontology/RAG diagram (`.mmd`→`.svg`/`.png`/`.pdf`) under `docs/diagrams/` and `src/main/frontend/public/diagrams/` from their Mermaid/PlantUML source definitions. | After any architectural change that should be reflected visually; see [DEVOPS_GUIDE.md §6](DEVOPS_GUIDE.md) for the full per-script breakdown. |
| `rebuild` / `rebuild:deep` / `clean:generated-docs` / `ops:factory-reset` | `./scripts/rebuild.sh [flags]` | Full Docker Compose clean-rebuild-redeploy orchestration — **not** a frontend-only task. Fully documented in [DEVOPS_GUIDE.md §5](DEVOPS_GUIDE.md). | Full-stack redeploy after pulling changes; CI-style fresh builds. |

### 7.1 Vite configuration specifics (`vite.config.ts`)

- `root: src/main/frontend` — the whole UI (including `index.html`) lives nested under the frontend source tree, mirroring the Java backend's `src/main/java` convention, rather than Vite's default repo-root `index.html`.
- `publicDir: src/main/frontend/public` — diagrams, the Wizard-of-Oz and RAG HTML explainer portals, and speaker notes are copied verbatim into `dist/` so they remain reachable as static assets in production without going through the bundler.
- `build.outDir: <repo-root>/dist` with `emptyOutDir: true` — resolved as an **absolute path outside** the Vite root, specifically so the output always lands at the conventional `./dist` the Express server and Dockerfile already expect, regardless of where the Vite root itself is nested.
- `plugins: [tailwindcss()]` — Tailwind v4's own first-party Vite plugin; there is no separate `tailwind.config.js`/PostCSS pipeline to maintain.
- `server.hmr` / `server.watch` are both gated behind a `DISABLE_HMR` environment variable, specifically to prevent file-watcher-triggered flicker while an AI coding agent is actively editing files in this workspace — **do not remove this gate**.

### 7.2 TypeScript configuration specifics (`tsconfig.json`)

- `moduleResolution: "bundler"` + `allowImportingTsExtensions: true` — source files import each other with explicit `.ts` extensions (matching how `tsx`/Vite resolve them at dev-time), which only "bundler" resolution permits without erroring.
- `noEmit: true` — TypeScript is **never** used to actually transpile; Vite (esbuild/Rolldown under the hood) does all transpilation. `tsc`'s only job in this project is type-checking (`npm run lint`).
- `experimentalDecorators: true` — required for some older `@ui5/webcomponents-base` decorator-based metadata, even though application code itself does not use decorators.

---

## 8. Dialogs Reference

| Dialog | Trigger | Purpose |
| :--- | :--- | :--- |
| `UploadDialogView` | List Report "Upload" button | Multipart file picker + inline BibTeX metadata editor with AI auto-extraction preview. |
| `VersionOverwriteDialogView` | Object Page "Upload New Version" | Replace the active file and/or metadata; explains the non-destructive version-archiving behavior before confirming. |
| `AuthModalView` | ShellBar login | Username/password → Keycloak token exchange (or mock token in offline mode). |
| `BackendSettingsModalView` | ShellBar settings gear | Switch between the 3 `BACKEND_PRESETS` or enter a custom base URL; shows live health-check status. |
| `DeleteConfirmDialogView` | Object Page "Delete" | Destructive-action confirmation (purges MongoDB + Qdrant + physical file). |
| `OpenApiModalView` | Footer "API Spec" link | Fetches and renders `openapi.yaml` inline for quick contract inspection without leaving the app. |
| `BpmnModalView` | Footer "Workflow" link | Renders the BPMN 2.0 ingestion model (`src/main/resources/bpmn/document_ingestion_rag.bpmn`) as visual process documentation. The file carries `camunda:` modeling attributes for Camunda Modeler compatibility, but no engine executes it. |

---

## 9. Related Documents

- [BACKEND_ARCHITECTURE.md](BACKEND_ARCHITECTURE.md) — Spring Boot backend this frontend talks to.
- [DEVOPS_GUIDE.md](DEVOPS_GUIDE.md) — Docker/Compose/nginx build & deployment pipeline for the whole stack.
- [COMMUNICATION_ARCHITECTURE.md](COMMUNICATION_ARCHITECTURE.md) — ADR-004: why stateless REST + in-memory EventBus over WebSockets.
- [../openapi.yaml](../openapi.yaml) — REST contract consumed by `RestBackendAdapter.ts`.
- [LEARNING_TOPICS.md](LEARNING_TOPICS.md) — conceptual deep-dives referenced throughout this document.
