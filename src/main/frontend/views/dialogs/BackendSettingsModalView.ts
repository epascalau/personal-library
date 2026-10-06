/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Vanilla + UI5 replacement for `components/BackendSettingsModal.tsx`.
 *
 * The draft configuration lives in the view (as the five `useState` hooks did)
 * and is only committed to `backendStore` on "Apply & Switch Backend".
 *
 * ## What this dialog actually controls
 * The app talks to "a backend" through a single `BackendAdapter` interface
 * (`services/backend/types.ts`). This dialog lets the user pick *which concrete
 * implementation* backs that interface and *where* it lives, without any other
 * view (List Report, Object Page, upload wizard, etc.) needing to know or care:
 *
 * 1. **Integrated Gateway** and **Direct Java Spring Boot** and **Custom Remote
 *    Backend** all resolve to the exact same `RestBackendAdapter` class
 *    (`createBackendAdapter()` in `services/backend/index.ts`) — they only differ
 *    in `baseUrl`.
 *    - "Integrated" points at the relative path `/api/v1`, served by the Node.js
 *      Express server bundled in the same Docker container/port as the UI (see
 *      `src/main/server/server.ts`). That gateway is a **self-contained
 *      simulation**: documents/summaries/chunks live in a process-local, non-persistent
 *      in-memory array (reset on every restart) and "semantic search" is plain
 *      substring matching (explicitly labeled `// Simulation of Qdrant Vector
 *      Search` in the source) — it does **not** talk to the real MongoDB or
 *      Qdrant containers at all. The one genuine external integration is Ollama:
 *      summarization, BibTeX extraction, and RAG chat all call the local Ollama
 *      daemon's `/api/generate` REST endpoint directly via `ollamaGenerate()`.
 *    - "Direct Java Spring Boot" points at the standalone Java REST API on
 *      `http://localhost:8080/api/v1`, which genuinely persists to MongoDB,
 *      indexes/searches real vectors in Qdrant, and calls Ollama through Spring
 *      AI's `OllamaChatModel` beans (see `OllamaConfig.java`).
 *    - "Custom" is the same `RestBackendAdapter` pointed at any arbitrary URL you
 *      type in (a staging cluster, a teammate's machine, etc.) — whether that
 *      target is backed by real infrastructure depends entirely on what you
 *      point it at.
 * 2. **Local Standalone Engine** is a completely different adapter
 *    (`MockBackendAdapter`) that never makes a network call — it simulates the
 *    same interface entirely in browser `localStorage`, useful for offline UI
 *    development/demos with zero backend infrastructure running.
 *
 * ## "Integrated Gateway" vs. "Local Standalone Engine" — they sound similar, they are NOT
 * Both options happen to avoid MongoDB/Qdrant, which makes them easy to confuse. The actual
 * differences are night and day:
 *
 * | Aspect                      | 1. Integrated Gateway (`/api/v1`)                | 4. Local Standalone Engine (Mock)             |
 * |-----------------------------|---------------------------------------------------|-------------------------------------------------|
 * | Adapter class                | `RestBackendAdapter` (real HTTP `fetch` calls)     | `MockBackendAdapter` (zero network calls)        |
 * | Requires a server process?   | YES — the Node/Express server in `server.ts`       | NO — works with no backend/Docker running        |
 * |                               | must be running (started by `npm run dev` or       | at all; everything executes inside the           |
 * |                               | the Docker container).                             | browser tab itself.                              |
 * | Where data lives              | Server-side, in that Node process's memory         | Client-side, in *this browser's* `localStorage`  |
 * |                               | (`documentsDatabase` array in `server.ts`).        | (key `personal_library_mock_docs`).              |
 * | Survives a page reload?      | Yes (server process keeps running).                | Yes (localStorage persists across reloads).      |
 * | Survives a server restart/   | NO — in-memory array resets to the seed data.      | N/A — there is no server to restart; data only   |
 * | container rebuild?           |                                                     | disappears if the user clears browser storage.   |
 * | AI summarization              | **REAL** — makes an actual HTTP call to the        | **FAKE** — `regenerateSummary()` immediately     |
 * |                               | local Ollama daemon and waits for genuine          | throws an error telling the user to switch to a  |
 * |                               | model inference (can take minutes on CPU).         | live backend; only pre-seeded, hardcoded summary |
 * |                               |                                                     | text is ever shown.                              |
 * | RAG chat answers              | **REAL** — Ollama generates the answer from        | **FAKE** — `chatWithDocument()` matches question |
 * |                               | whatever the substring "search" found.             | keywords against a small hardcoded script (e.g.  |
 * |                               |                                                     | "Wizard of Oz" characters) and returns canned    |
 * |                               |                                                     | text — no model is invoked at all.               |
 * | Typical use                   | Everyday local development against a realistic    | Zero-infrastructure demos, offline UI/UX work, or |
 * |                               | REST contract without juggling MongoDB/Qdrant.     | when no Docker/Ollama is available at all.        |
 *
 * In short: Integrated Gateway means real network calls to a real (but simplified)
 * server that talks to a real Ollama daemon, while Local Standalone Engine means no
 * network calls whatsoever — entirely scripted/canned responses, running purely in
 * the browser tab.
 *
 * None of these options involve Google Gemini or any other cloud LLM API —
 * Gemini was removed entirely; every "live" option above ultimately calls a
 * locally running Ollama daemon, whether through the Node gateway or the Java
 * backend.
 */

import { cx, html, raw, RawHtml } from '../../core/html';
import { shallowEqual, watch } from '../../core/store';
import { BACKEND_PRESETS, LLM_TIMEOUT_MS } from '../../services/backend';
import type { BackendConfig } from '../../services/backend';
import { appStore } from '../../stores/appStore';
import { backendStore } from '../../stores/backendStore';
import { icon } from '../../ui5/icons';
import { DialogView } from './DialogView';
import type { IconKey } from '../../ui5/icons';
import type Input from '@ui5/webcomponents/dist/Input.js';

/** Key into `BACKEND_PRESETS` (`'integrated' | 'springBootDirect' | 'mock'`). */
type PresetKey = keyof typeof BACKEND_PRESETS;

/**
 * Describes one selectable card in the "Select Target Backend Engine" list.
 *
 * Each option is either:
 * - Backed by a named preset in `BACKEND_PRESETS` (`preset` is set) — clicking it
 *   snaps the draft `baseUrl`/`name`/`timeoutMs` to that preset's fixed values.
 * - The one freeform "Custom" option (`preset` is `undefined`) — clicking it just
 *   flips `selectedType` to `'custom'` and leaves whatever URL/name/timeout the
 *   user had typed untouched, so they can point at any arbitrary endpoint.
 */
interface EngineOption {
  /** Which `BACKEND_PRESETS` entry to copy into the draft, or `undefined` for "Custom". */
  preset?: PresetKey;
  /** Stable DOM id used for `data-engine="..."` click/keydown delegation and selection matching. */
  id: string;
  /** Lucide icon name rendered at the left of the card. */
  iconKey: IconKey;
  /** Tailwind classes coloring the icon (one accent color per engine, for quick visual scanning). */
  iconClass: string;
  /** Card headline, e.g. "Integrated Gateway (/api/v1)". */
  title: string;
  /** Short badge text summarizing the key fact about this option (default-ness, port, or requirement). */
  badge: string;
  /** Tailwind classes for the badge pill background/text/border, matched to `iconClass`'s accent color. */
  badgeClass: string;
  /** One-sentence explanation of what the option connects to and how it works, shown under the title. */
  description: string;
}

const ENGINE_OPTIONS: EngineOption[] = [
  {
    // The default, zero-configuration option. The Node.js Express server in
    // `src/main/server/server.ts` serves the compiled UI AND exposes `/api/v1`
    // REST routes from the *same* process/port — no CORS, no separate service
    // to start. IMPORTANT: this gateway is a self-contained simulation — it
    // stores documents/summaries in a non-persistent in-memory array (reset on
    // restart) and "semantic search" is plain substring matching, NOT a real
    // MongoDB/Qdrant integration. The one genuine network call it makes is to
    // the local Ollama daemon's `/api/generate` endpoint for summarization,
    // BibTeX extraction, and RAG chat.
    //
    // vs. "Local Standalone Engine" (#4, below): this option still makes REAL
    // HTTP requests over the network to a server process that must be running
    // (`npm run dev` / Docker container) and gets back REAL Ollama-generated
    // summaries/chat answers — only the document "database" and "search" are
    // simulated. #4 makes NO network requests at all and returns only
    // pre-scripted/canned text; it cannot generate new AI content.
    preset: 'integrated',
    id: 'integrated',
    iconKey: 'Zap',
    iconClass: 'w-5 h-5 text-[#0070f2] mt-0.5 shrink-0',
    title: 'Integrated Gateway (/api/v1)',
    badge: 'Default',
    badgeClass: 'bg-blue-100 dark:bg-blue-950/70 text-[#0070f2] dark:text-[#38bdf8] dark:border-blue-900/60',
    description:
      'Built-in Node.js gateway (same container/port as the UI). Requires the server process running; makes real network calls and calls local Ollama directly for genuine AI summaries/chat — only document storage and search are simulated in-memory.'
  },
  {
    // Bypasses the Node gateway entirely and talks straight to the standalone
    // Spring Boot 3 / Java REST API on port 8080. Useful when developing or
    // debugging the Java backend in isolation (e.g. via `mvn spring-boot:run`
    // or a separate container) without rebuilding the Node layer. This backend
    // uses Spring AI's `OllamaChatModel` beans (see `OllamaConfig.java`) to
    // reach the same local Ollama daemon, and exposes its own
    // `/api/v1/health` endpoint (see `HealthController.java`) so the
    // "Test Connection" probe below works identically to the Integrated option.
    preset: 'springBootDirect',
    id: 'springBootDirect',
    iconKey: 'Cpu',
    iconClass: 'w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0',
    title: 'Direct Java Spring Boot Instance',
    badge: 'Port 8080',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 dark:border-indigo-900/60',
    description:
      'Direct connection to the standalone Spring Boot 3 Java server (`http://localhost:8080/api/v1`).'
  },
  {
    // The only option with no `preset` key: selecting it does NOT auto-fill
    // `baseUrl`/`name`/`timeoutMs` — it just marks `selectedType = 'custom'` and
    // leaves the "Adapter Connection Parameters" fields exactly as the user
    // last edited them. Still uses the same `RestBackendAdapter` wire protocol
    // as the two options above; only the target host changes. Intended for
    // pointing the UI at a deployed cluster, teammate's machine, or any other
    // REST-compatible implementation of the same `/api/v1` contract.
    id: 'custom',
    iconKey: 'Globe',
    iconClass: 'w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0',
    title: 'Custom Remote Backend / Microservice',
    badge: 'Custom URL',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 dark:border-emerald-900/60',
    description:
      'Connect to a custom remote API URL (e.g. cloud Kubernetes cluster or custom FastAPI backend).'
  },
  {
    // The only option backed by a *different* adapter class (`MockBackendAdapter`
    // instead of `RestBackendAdapter`) — see `createBackendAdapter()` in
    // `services/backend/index.ts`. It makes zero network calls: documents,
    // BibTeX metadata, summaries, and RAG chat are all synthesized and persisted
    // in the browser's `localStorage`. No Docker stack, Ollama, MongoDB, or
    // Qdrant needs to be running at all. Ideal for offline UI/UX work or demos.
    //
    // vs. "Integrated Gateway" (#1, above): both options skip real MongoDB/Qdrant,
    // which is why they're easy to mix up — but #1 still requires a running
    // server process and makes real HTTP calls that hit a real Ollama daemon for
    // genuine AI text. This option (#4) runs entirely inside the browser tab with
    // NO server and NO network traffic whatsoever: `regenerateSummary()` always
    // throws (new AI summaries cannot be computed offline) and `chatWithDocument()`
    // only returns a handful of hardcoded, keyword-matched canned answers — no
    // model is ever invoked.
    preset: 'mock',
    id: 'mock',
    iconKey: 'HardDrive',
    iconClass: 'w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0',
    title: 'Local Standalone Engine (Offline / In-Memory)',
    badge: 'No Backend Required',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 dark:border-amber-900/60',
    description:
      'Zero-server mock engine: no network calls at all, no AI generation — documents/summaries/chat are pre-seeded or scripted and stored in browser localStorage only.'
  }
];

/**
 * Fallback request timeout (ms) used only when no preset or persisted config
 * supplies one (e.g. first time the "Custom" option is picked with a blank
 * draft). Deliberately reuses the same generous `LLM_TIMEOUT_MS` (10 minutes)
 * applied to the built-in presets in `services/backend/index.ts`, rather than a
 * shorter value, because every "live" backend option here ultimately waits on
 * CPU-bound local Ollama inference, which can legitimately take several minutes
 * per summarization/chat call (see README "Ollama LLM Container Inspection").
 */
const DEFAULT_TIMEOUT_MS = LLM_TIMEOUT_MS;

export class BackendSettingsModalView extends DialogView {
  /**
   * Draft `BackendConfig.type` (`'rest' | 'spring-boot' | 'custom' | 'mock'`).
   * Determines which adapter class `apply()` ultimately instantiates via
   * `createBackendAdapter()`. Kept separate from the preset `id` strings used
   * for card selection — see `isOptionSelected()` for how the two are mapped.
   */
  private selectedType = '';

  /** Draft display label shown in the ShellBar/footer ("Active: <name>") once applied. */
  private customName = '';

  /**
   * Draft `baseUrl` sent on every REST request. For the "Integrated" preset
   * this is the relative path `/api/v1` (same-origin); for "Direct Spring
   * Boot" and "Custom" it's a full `http(s)://host:port/api/v1` URL.
   */
  private customUrl = '';

  /** Draft bearer token/API key, sent as an `Authorization` header when non-empty; ignored by the mock engine. */
  private customToken = '';

  /**
   * Draft request timeout in milliseconds, passed through to `RestBackendAdapter`'s
   * `fetch` `AbortController`. Deliberately defaults to the same generous
   * `LLM_TIMEOUT_MS` (10 minutes) as the built-in presets, because local,
   * CPU-bound Ollama inference can take several minutes per summarization or
   * chat call — a short timeout here would abort a request that was still
   * genuinely in progress, not actually stuck.
   */
  private customTimeout = DEFAULT_TIMEOUT_MS;

  /**
   * Constructs the BackendSettingsModalView and initializes draft fields.
   *
   * WHAT: Invokes the base DialogView constructor with modal CSS class and populates local draft state.
   * WHY: Keeping draft fields in local component state prevents premature mutations to the global `backendStore`
   * until the user explicitly clicks "Apply & Switch Backend", matching standard transaction dialog semantics.
   */
  constructor() {
    super(undefined, 'plib-dialog plib-dialog--settings');
    this.resetDraft();
  }

  /**
   * Checks whether the backend settings modal should be displayed.
   *
   * WHAT: Queries `appStore.state.backendSettingsOpen`.
   * WHY: Driving modal visibility from the central application store allows any component
   * (ShellBar menu, connection error banner, footer link) to trigger configuration.
   *
   * @returns `true` if visible, `false` otherwise.
   */
  protected isOpen(): boolean {
    return appStore.state.backendSettingsOpen;
  }

  /**
   * Dismisses the backend settings modal.
   *
   * WHAT: Calls `appStore.closeBackendSettings()`.
   * WHY: Centralizing modal closure in the store coordinates overlay removal and cleans up backdrop state.
   */
  protected requestClose(): void {
    appStore.closeBackendSettings();
  }

  /**
   * Registers store watchers for open/close state and backend health probing.
   *
   * WHAT: Subscribes to `backendSettingsOpen` (re-syncing draft state on open) and `backendStore` health probe status.
   * WHY: Re-syncing draft state whenever opened guarantees that if external logic changed the backend in the meantime,
   * the dialog displays fresh settings rather than stale edits.
   */
  protected onMount(): void {
    super.onMount();
    this.track(
      watch(
        appStore,
        (state) => state.backendSettingsOpen,
        (open) => {
          // Reopening always starts from the live configuration, the way a
          // freshly mounted React component re-seeded its `useState` defaults.
          if (open) {
            this.resetDraft();
          }
          this.requestRender();
        }
      )
    );
    this.track(
      watch(
        backendStore,
        (state) => [state.healthStatus, state.isTestingHealth, state.config.name],
        () => this.requestRender(),
        shallowEqual
      )
    );
  }

  /**
   * Reinitializes local draft state from the active `backendStore` configuration.
   *
   * WHAT: Copies active adapter type, display name, base URL, auth token, and timeout into local properties.
   * WHY: Isolating edits in draft properties enables cancelation without dirtying the active application adapter.
   */
  private resetDraft(): void {
    const config = backendStore.config;
    this.selectedType = config.type;
    this.customName = config.name;
    this.customUrl = config.baseUrl;
    this.customToken = config.authToken || '';
    this.customTimeout = config.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  /**
   * Checks whether a specific backend engine option is currently selected in the draft.
   *
   * WHAT: Evaluates engine ID against `this.selectedType` and `this.customUrl`.
   * WHY: Accurately distinguishing between presets (such as Integrated Gateway vs Direct Spring Boot at port 8080)
   * provides clear visual radio-style feedback in the UI.
   *
   * NOTE ON THE HEURISTICS BELOW: `selectedType` alone is not always enough to tell
   * "Integrated" and "Direct Spring Boot" apart, because both map to the same
   * underlying `'rest'` adapter type (see the file-level doc comment). So this
   * also inspects `customUrl`:
   * - "Integrated" is only highlighted when the URL is the *exact* relative path
   *   `/api/v1` (same-origin, no host) — the one unambiguous signature of that preset.
   * - "Direct Spring Boot" is highlighted either when `selectedType === 'spring-boot'`
   *   (a value this dialog itself never sets, but which a persisted/legacy config
   *   could carry), OR when it's `'rest'` with a URL containing `:8080` — i.e. the
   *   user manually typed/edited a URL that still points at the well-known Spring
   *   Boot port, even though they arrived there via "Custom".
   * - "Custom" matches any other `'rest'` URL that isn't one of the two cases above.
   * - "Local Standalone Engine" is the simple default case: `selectedType === 'mock'`.
   *
   * @param option Engine option descriptor.
   * @returns `true` if selected, `false` otherwise.
   */
  private isOptionSelected(option: EngineOption): boolean {
    switch (option.id) {
      case 'integrated':
        return this.selectedType === 'rest' && this.customUrl === '/api/v1';
      case 'springBootDirect':
        return (
          this.selectedType === 'spring-boot' ||
          (this.selectedType === 'rest' && this.customUrl.includes(':8080'))
        );
      case 'custom':
        return this.selectedType === 'custom';
      default:
        return this.selectedType === 'mock';
    }
  }

  /**
   * Generates the modal markup for engine presets, URL parameters, ping probe, and actions.
   *
   * WHAT: Emits the dialog header, informational overview banner, target engine cards, parameter inputs,
   * live connection health probe button, and cancel/apply controls.
   * WHY: Rendering interactive configuration within a structured dialog allows rapid switching between
   * real and mock architectures during development and testing without modifying source code.
   *
   * @returns RawHtml modal content.
   */
  protected body(): RawHtml {
    const { healthStatus, isTestingHealth } = backendStore.state;

    return html`
      <div class="w-full flex flex-col overflow-hidden bg-white dark:bg-[#1c232b]">
        <!-- Header -->
        <div
          class="px-6 py-4 border-b border-gray-100 dark:border-[#2e3b4a] bg-white dark:bg-[#1c232b] flex items-center justify-between"
        >
          <div class="flex items-center gap-2.5">
            <div
              class="w-8 h-8 rounded-full bg-[#0070f2]/10 dark:bg-[#0070f2]/20 flex items-center justify-center text-[#0070f2] dark:text-[#4796ff] shrink-0"
            >
              ${icon('Server', { className: 'w-4 h-4' })}
            </div>
            <div>
              <h3 class="text-sm font-bold text-gray-900 dark:text-white leading-tight">Backend Target Settings</h3>
              <p class="text-[11px] text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                Decoupled API Client: Swap, configure, or mock backend engines effortlessly
              </p>
            </div>
          </div>

          <ui5-button
            class="plib-button plib-button--icon"
            design="Transparent"
            icon="decline"
            data-action="close"
            accessible-name="Close"
          ></ui5-button>
        </div>

        <!-- Body -->
        <div class="p-6 overflow-y-auto max-h-[70vh] space-y-5 text-xs text-gray-700 dark:text-gray-300" data-scroll-key="backend-settings">
          <div class="text-gray-600 dark:text-gray-300 leading-relaxed bg-[#f8fafc] dark:bg-[#232c37] p-3.5 rounded-lg border border-gray-200 dark:border-[#2e3b4a]">
            The Personal Library frontend is built on a
            <strong class="text-gray-900 dark:text-white">modular Backend Adapter pattern</strong>. You can switch between the integrated
            gateway, a dedicated Java Spring Boot cluster, a custom remote microservice, or a
            client-side offline mock engine without altering any UI components.
          </div>

          <div class="space-y-3">
            <label class="block font-semibold text-gray-800 dark:text-gray-200 text-xs">
              Select Target Backend Engine:
            </label>
            <!--
              Each card below is one ENGINE_OPTIONS entry. Clicking a card with a
              preset snaps all four draft fields (URL/name/token/timeout) to
              that preset's fixed values via selectEngine(); the one "Custom"
              card (no preset) just flips selectedType and leaves the fields
              below untouched so the user can type their own target.
            -->
            ${raw(ENGINE_OPTIONS.map((option) => this.engineOption(option)).join(''))}
          </div>

          <div class="space-y-3 pt-3 border-t border-gray-100 dark:border-[#2e3b4a]">
            <h4 class="font-bold text-gray-800 dark:text-gray-200 text-xs">Adapter Connection Parameters:</h4>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <!--
                  Backend Base URL: every REST call (RestBackendAdapter) is built as
                  baseUrl + path. Use a relative path (/api/v1) for same-origin
                  deployments (the "Integrated" preset), or a full http(s)://host:port/api/v1
                  URL to reach a different host (Spring Boot direct, a remote cluster, etc.).
                  Disabled for the Mock engine since it never issues a network request.
                -->
                <label class="block text-gray-600 dark:text-gray-300 font-semibold mb-1">Backend Base URL</label>
                <ui5-input
                  class="plib-input w-full font-mono text-xs"
                  data-field="customUrl"
                  data-focus-key="backend-url"
                  value="${this.customUrl}"
                  placeholder="e.g. /api/v1 or http://localhost:8080/api/v1"
                  accessible-name="Backend Base URL"
                  ${this.selectedType === 'mock' ? raw('disabled') : ''}
                ></ui5-input>
              </div>

              <div>
                <!--
                  Display Label: purely cosmetic — shown as "Active: <name>" in this
                  dialog's footer and in the ShellBar once applied. Does not affect
                  routing or authentication in any way.
                -->
                <label class="block text-gray-600 dark:text-gray-300 font-semibold mb-1">Display Label</label>
                <ui5-input
                  class="plib-input w-full text-xs"
                  data-field="customName"
                  data-focus-key="backend-name"
                  value="${this.customName}"
                  placeholder="e.g. Production Cluster"
                  accessible-name="Display Label"
                ></ui5-input>
              </div>

              <div>
                <!--
                  API Key / Token: optional bearer credential forwarded as an
                  Authorization: Bearer <token> header on every request (see
                  RestBackendAdapter.getHeaders()). Only meaningful for secured
                  deployments (e.g. a Custom remote backend behind an API gateway);
                  the bundled Integrated/Spring Boot presets authenticate via
                  Keycloak OIDC instead, so this is typically left blank for them.
                  Disabled for the Mock engine (no network calls to authenticate).
                -->
                <label class="block text-gray-600 dark:text-gray-300 font-semibold mb-1"
                  >API Key / Token (Optional)</label
                >
                <div class="relative">
                  <ui5-input
                    class="plib-input w-full font-mono text-xs"
                    data-field="customToken"
                    data-focus-key="backend-token"
                    type="Password"
                    value="${this.customToken}"
                    placeholder="API token or bearer secret"
                    accessible-name="API Key"
                    ${this.selectedType === 'mock' ? raw('disabled') : ''}
                  >
                    <div slot="icon" class="flex items-center">
                      ${icon('Key', { className: 'w-3.5 h-3.5 text-gray-400' })}
                    </div>
                  </ui5-input>
                </div>
              </div>

              <div>
                <!--
                  Request Timeout: milliseconds before the browser aborts an
                  in-flight REST call (AbortController, see RestBackendAdapter.request()).
                  Defaults to a generous 10 minutes (LLM_TIMEOUT_MS) because local,
                  CPU-bound Ollama inference can legitimately take several minutes per
                  summarization/chat call — raising this further is the correct fix if
                  you see client-side timeout errors on a slower machine or larger
                  documents; lowering it risks aborting a request that was still working.
                -->
                <label class="block text-gray-600 dark:text-gray-300 font-semibold mb-1">Request Timeout (ms)</label>
                <ui5-input
                  class="plib-input w-full text-xs"
                  data-field="customTimeout"
                  data-focus-key="backend-timeout"
                  type="Number"
                  value="${String(this.customTimeout)}"
                  accessible-name="Request Timeout in milliseconds"
                ></ui5-input>
              </div>
            </div>
          </div>

          <div
            class="p-3.5 bg-gray-50 dark:bg-[#232c37] rounded-lg border border-gray-200 dark:border-[#2e3b4a] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div class="flex items-center gap-2">
              ${icon('Activity', { className: 'w-4 h-4 text-[#0070f2] dark:text-[#4796ff]' })}
              <div>
                <span class="font-semibold text-gray-800 dark:text-gray-200">Connection Health &amp; Latency Probe</span>
                ${healthStatus
                  ? html`<div
                      class="${cx(
                        'text-[11px] flex items-center gap-1.5 mt-0.5',
                        healthStatus.ok ? 'text-green-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                      )}"
                    >
                      ${icon(healthStatus.ok ? 'CheckCircle2' : 'AlertCircle', {
                        className: 'w-3.5 h-3.5'
                      })}
                      <span>${healthStatus.message}</span>
                    </div>`
                  : ''}
              </div>
            </div>

            <ui5-button
              class="plib-button"
              data-action="test-connection"
              ${isTestingHealth ? raw('disabled') : ''}
            >
              ${icon('Activity', {
                className: cx('w-3.5 h-3.5 mr-1.5', isTestingHealth && 'animate-spin')
              })}
              ${isTestingHealth ? 'Pinging...' : 'Test Connection'}
            </ui5-button>
          </div>
        </div>

        <!-- Footer -->
        <div
          class="px-6 py-3.5 border-t border-gray-100 dark:border-[#2e3b4a] bg-white dark:bg-[#1c232b] flex items-center justify-between text-xs"
        >
          <div class="text-[11px] text-gray-500 dark:text-gray-400 font-mono">Active: ${backendStore.config.name}</div>

          <div class="flex items-center gap-2.5">
            <ui5-button class="plib-button" data-action="close">Cancel</ui5-button>
            <ui5-button class="plib-button plib-button--accent" design="Emphasized" data-action="apply-backend"
              >Apply &amp; Switch Backend</ui5-button
            >
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generates markup for an individual selectable engine card.
   *
   * WHAT: Formats the option card with icon, title, badge, description, and selection highlights.
   * WHY: Visual badges and descriptive blurbs explain the trade-offs of each engine (e.g. offline mock vs real Spring Boot).
   *
   * @param option Engine option metadata.
   * @returns HTML string.
   */
  private engineOption(option: EngineOption): string {
    const selected = this.isOptionSelected(option);
    return html`
      <div
        role="button"
        tabindex="0"
        data-engine="${option.id}"
        class="${cx(
          'p-3.5 rounded-lg border cursor-pointer transition-all flex items-start gap-3',
          selected
            ? 'border-[#0070f2] dark:border-[#4796ff] bg-blue-50/70 dark:bg-blue-950/40 ring-1 ring-[#0070f2] dark:ring-[#4796ff]'
            : 'border-gray-200 dark:border-[#2e3b4a] hover:border-gray-300 dark:hover:border-[#3d4d60] bg-white dark:bg-[#232c37] hover:bg-gray-50/60 dark:hover:bg-[#283340]'
        )}"
      >
        ${icon(option.iconKey, { className: option.iconClass })}
        <div class="flex-1">
          <div class="font-semibold text-gray-900 dark:text-white flex items-center justify-between">
            <span>${option.title}</span>
            <span class="${cx('text-[10px] font-mono px-1.5 py-0.5 rounded border border-transparent', option.badgeClass)}"
              >${option.badge}</span
            >
          </div>
          <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">${option.description}</p>
        </div>
      </div>
    `.toString();
  }

  /**
   * Wires user interaction handlers to option cards, input fields, test probe, and apply button.
   *
   * WHAT: Sets up click and keydown listeners for engine selection, input event synchronization, and button actions.
   * WHY: Delegating listeners through component helpers (`this.onAll`, `this.on`) keeps event lifecycle
   * tightly bound to the component, preventing memory leaks on dialog disposal.
   */
  protected bind(): void {
    this.onAll('[data-engine]', 'click', (event) => {
      this.selectEngine((event.currentTarget as HTMLElement).dataset.engine as string);
    });
    this.onAll('[data-engine]', 'keydown', (event) => {
      const key = (event as KeyboardEvent).key;
      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        this.selectEngine((event.currentTarget as HTMLElement).dataset.engine as string);
      }
    });

    this.onAll('ui5-input[data-field]', 'input', (event) => {
      const input = event.currentTarget as Input;
      const field = input.dataset.field as
        | 'customUrl'
        | 'customName'
        | 'customToken'
        | 'customTimeout';
      if (field === 'customTimeout') {
        this.customTimeout = Number(input.value);
        return;
      }
      this[field] = input.value;
    });

    this.on('[data-action="test-connection"]', 'click', () => void backendStore.testConnection());
    this.on('[data-action="apply-backend"]', 'click', () => this.apply());
  }

  /**
   * Updates local draft properties according to the selected engine preset.
   *
   * WHAT: Maps the preset ID to configuration defaults (URL, name, timeout) and triggers re-render.
   * WHY: Pre-filling sensible defaults for well-known targets (e.g. `:8080` for Spring Boot, `/api/v1` for Integrated)
   * streamlines the developer workflow without requiring manual URL construction.
   *
   * Only the "Custom" option (no `preset`) is handled differently: it intentionally
   * leaves `customUrl`/`customName`/`customToken`/`customTimeout` as-is, so a user who
   * started from a preset and tweaked the URL doesn't lose their edits by clicking
   * "Custom" to make the dialog reflect that they're no longer on a known preset.
   *
   * @param id Identifier of chosen engine option.
   */
  private selectEngine(id: string): void {
    const option = ENGINE_OPTIONS.find((candidate) => candidate.id === id);
    if (!option) {
      return;
    }
    if (!option.preset) {
      this.selectedType = 'custom';
      this.render();
      return;
    }
    const preset = BACKEND_PRESETS[option.preset];
    this.selectedType = preset.type;
    this.customName = preset.name;
    this.customUrl = preset.baseUrl;
    this.customTimeout = preset.timeoutMs || DEFAULT_TIMEOUT_MS;
    this.render();
  }

  /**
   * Commits draft configuration to `backendStore` and resets application pagination.
   *
   * WHAT: Constructs a `BackendConfig` object, updates `backendStore`, resets table page to 1,
   * announces toast feedback, and closes the modal.
   * WHY: Resetting the active document page to 1 prevents out-of-range pagination states when switching
   * to a backend with a different document count.
   *
   * Field-by-field behavior:
   * - `name`: falls back to a friendly "Offline Local Engine" label for Mock, or the
   *   raw URL for any other engine left unnamed.
   * - `baseUrl`/`authToken`: trimmed of incidental whitespace before being persisted
   *   and sent on every subsequent request.
   * - `timeoutMs`: falls back to the same generous `LLM_TIMEOUT_MS` used by the built-in
   *   presets (not a short value) if the user somehow clears/corrupts the timeout input,
   *   since every "live" engine here ultimately waits on potentially slow local Ollama
   *   inference — a short fallback would silently reintroduce the timeout problem this
   *   dialog's defaults were raised to avoid.
   */
  private apply(): void {
    const newConfig: BackendConfig = {
      type: this.selectedType as BackendConfig['type'],
      name:
        this.customName ||
        (this.selectedType === 'mock' ? 'Offline Local Engine' : this.customUrl),
      baseUrl: this.customUrl.trim(),
      authToken: this.customToken.trim() || undefined,
      timeoutMs: Number(this.customTimeout) || LLM_TIMEOUT_MS
    };

    backendStore.updateConfig(newConfig);
    appStore.setPage(1);
    appStore.showToast(`Switched backend adapter to: ${newConfig.name}`);
    appStore.closeBackendSettings();
  }
}
