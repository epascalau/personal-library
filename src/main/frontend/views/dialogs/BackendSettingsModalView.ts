/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Vanilla + UI5 replacement for `components/BackendSettingsModal.tsx`.
 *
 * The draft configuration lives in the view (as the five `useState` hooks did)
 * and is only committed to `backendStore` on "Apply & Switch Backend".
 */

import { cx, html, raw, RawHtml } from '../../core/html';
import { shallowEqual, watch } from '../../core/store';
import { BACKEND_PRESETS } from '../../services/backend';
import type { BackendConfig } from '../../services/backend';
import { appStore } from '../../stores/appStore';
import { backendStore } from '../../stores/backendStore';
import { icon } from '../../ui5/icons';
import { DialogView } from './DialogView';
import type { IconKey } from '../../ui5/icons';
import type Input from '@ui5/webcomponents/dist/Input.js';

type PresetKey = keyof typeof BACKEND_PRESETS;

interface EngineOption {
  /** `undefined` for the custom option, which only flips `selectedType`. */
  preset?: PresetKey;
  id: string;
  iconKey: IconKey;
  iconClass: string;
  title: string;
  badge: string;
  badgeClass: string;
  description: string;
}

const ENGINE_OPTIONS: EngineOption[] = [
  {
    preset: 'integrated',
    id: 'integrated',
    iconKey: 'Zap',
    iconClass: 'w-5 h-5 text-[#0070f2] mt-0.5 shrink-0',
    title: 'Integrated Gateway (/api/v1)',
    badge: 'Default',
    badgeClass: 'bg-blue-100 dark:bg-blue-950/70 text-[#0070f2] dark:text-[#38bdf8] dark:border-blue-900/60',
    description:
      'Connects to the embedded proxy/gateway forwarding to Spring AI, Qdrant, and Ollama.'
  },
  {
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
    preset: 'mock',
    id: 'mock',
    iconKey: 'HardDrive',
    iconClass: 'w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0',
    title: 'Local Standalone Engine (Offline / In-Memory)',
    badge: 'No Backend Required',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 dark:border-amber-900/60',
    description:
      'Zero-server mock engine storing all documents, summaries, and vector chat in browser localStorage.'
  }
];

const DEFAULT_TIMEOUT_MS = 180000;

export class BackendSettingsModalView extends DialogView {
  private selectedType = '';

  private customName = '';

  private customUrl = '';

  private customToken = '';

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
            ${raw(ENGINE_OPTIONS.map((option) => this.engineOption(option)).join(''))}
          </div>

          <div class="space-y-3 pt-3 border-t border-gray-100 dark:border-[#2e3b4a]">
            <h4 class="font-bold text-gray-800 dark:text-gray-200 text-xs">Adapter Connection Parameters:</h4>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
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
   */
  private apply(): void {
    const newConfig: BackendConfig = {
      type: this.selectedType as BackendConfig['type'],
      name:
        this.customName ||
        (this.selectedType === 'mock' ? 'Offline Local Engine' : this.customUrl),
      baseUrl: this.customUrl.trim(),
      authToken: this.customToken.trim() || undefined,
      timeoutMs: Number(this.customTimeout) || 30000
    };

    backendStore.updateConfig(newConfig);
    appStore.setPage(1);
    appStore.showToast(`Switched backend adapter to: ${newConfig.name}`);
    appStore.closeBackendSettings();
  }
}
