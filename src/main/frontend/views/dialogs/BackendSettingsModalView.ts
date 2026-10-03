/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
    badgeClass: 'bg-blue-100 text-[#0070f2]',
    description:
      'Connects to the embedded proxy/gateway forwarding to Spring AI, Qdrant, and Ollama.'
  },
  {
    preset: 'springBootDirect',
    id: 'springBootDirect',
    iconKey: 'Cpu',
    iconClass: 'w-5 h-5 text-indigo-600 mt-0.5 shrink-0',
    title: 'Direct Java Spring Boot Instance',
    badge: 'Port 8080',
    badgeClass: 'bg-indigo-50 text-indigo-700',
    description:
      'Direct connection to the standalone Spring Boot 3 Java server (`http://localhost:8080/api/v1`).'
  },
  {
    id: 'custom',
    iconKey: 'Globe',
    iconClass: 'w-5 h-5 text-emerald-600 mt-0.5 shrink-0',
    title: 'Custom Remote Backend / Microservice',
    badge: 'Custom URL',
    badgeClass: 'bg-emerald-50 text-emerald-700',
    description:
      'Connect to a custom remote API URL (e.g. cloud Kubernetes cluster or custom FastAPI backend).'
  },
  {
    preset: 'mock',
    id: 'mock',
    iconKey: 'HardDrive',
    iconClass: 'w-5 h-5 text-amber-600 mt-0.5 shrink-0',
    title: 'Local Standalone Engine (Offline / In-Memory)',
    badge: 'No Backend Required',
    badgeClass: 'bg-amber-50 text-amber-700',
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

  constructor() {
    super(undefined);
    this.resetDraft();
  }

  protected isOpen(): boolean {
    return appStore.state.backendSettingsOpen;
  }

  protected requestClose(): void {
    appStore.closeBackendSettings();
  }

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

  private resetDraft(): void {
    const config = backendStore.config;
    this.selectedType = config.type;
    this.customName = config.name;
    this.customUrl = config.baseUrl;
    this.customToken = config.authToken || '';
    this.customTimeout = config.timeoutMs || DEFAULT_TIMEOUT_MS;
  }

  /** Reproduces the per-option `selected` expressions from the React markup. */
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

  protected body(): RawHtml {
    const { healthStatus, isTestingHealth } = backendStore.state;

    return html`
      <div slot="header" class="w-full">
        <div
          class="px-6 py-4 border-b border-gray-200 bg-[#354a5f] text-white flex items-center justify-between"
        >
          <div class="flex items-center gap-2.5">
            <div
              class="w-8 h-8 rounded-lg bg-[#0070f2] flex items-center justify-center text-white shadow"
            >
              ${icon('Server', { className: 'w-4 h-4' })}
            </div>
            <div>
              <h3 class="text-sm font-bold">Backend Architecture &amp; Target Settings</h3>
              <p class="text-[11px] text-[#cfdbe8]">
                Decoupled API Client: Swap, configure, or mock backend engines effortlessly
              </p>
            </div>
          </div>

          <ui5-button
            class="plib-button plib-button--icon plib-button--on-dark"
            design="Transparent"
            icon="decline"
            data-action="close"
            accessible-name="Close"
          ></ui5-button>
        </div>
      </div>

      <div class="p-6 overflow-y-auto space-y-5 flex-1 text-xs" data-scroll-key="backend-settings">
        <div class="text-gray-600 leading-relaxed bg-[#f8fafc] p-3 rounded-lg border border-gray-200">
          The Personal Library frontend is built on a
          <strong>modular Backend Adapter pattern</strong>. You can switch between the integrated
          gateway, a dedicated Java Spring Boot cluster, a custom remote microservice, or a
          client-side offline mock engine without altering any UI components.
        </div>

        <div class="space-y-3">
          <label class="block font-semibold text-gray-800 text-xs">
            Select Target Backend Engine:
          </label>
          ${raw(ENGINE_OPTIONS.map((option) => this.engineOption(option)).join(''))}
        </div>

        <div class="space-y-3 pt-3 border-t border-gray-200">
          <h4 class="font-bold text-gray-800 text-xs">Adapter Connection Parameters:</h4>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="block text-gray-600 font-semibold mb-1">Backend Base URL</label>
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
              <label class="block text-gray-600 font-semibold mb-1">Display Label</label>
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
              <label class="block text-gray-600 font-semibold mb-1"
                >****** / API Key (Optional)</label
              >
              <div class="relative">
                <ui5-input
                  class="plib-input w-full font-mono text-xs"
                  data-field="customToken"
                  data-focus-key="backend-token"
                  type="Password"
                  value="${this.customToken}"
                  placeholder="******"
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
              <label class="block text-gray-600 font-semibold mb-1">Request Timeout (ms)</label>
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
          class="p-3.5 bg-gray-50 rounded-lg border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div class="flex items-center gap-2">
            ${icon('Activity', { className: 'w-4 h-4 text-[#0070f2]' })}
            <div>
              <span class="font-semibold text-gray-800">Connection Health &amp; Latency Probe</span>
              ${healthStatus
                ? html`<div
                    class="${cx(
                      'text-[11px] flex items-center gap-1.5 mt-0.5',
                      healthStatus.ok ? 'text-green-700' : 'text-red-700'
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

      <div slot="footer" class="w-full">
        <div
          class="px-6 py-3 border-t border-gray-200 bg-[#f8fafc] flex items-center justify-between text-xs"
        >
          <div class="text-[11px] text-gray-400 font-mono">Active: ${backendStore.config.name}</div>

          <div class="flex items-center gap-2">
            <ui5-button class="plib-button" data-action="close">Cancel</ui5-button>
            <ui5-button class="plib-button" design="Emphasized" data-action="apply-backend"
              >Apply &amp; Switch Backend</ui5-button
            >
          </div>
        </div>
      </div>
    `;
  }

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
            ? 'border-[#0070f2] bg-blue-50/60 ring-1 ring-[#0070f2]'
            : 'border-gray-200 hover:border-gray-300 bg-white'
        )}"
      >
        ${icon(option.iconKey, { className: option.iconClass })}
        <div class="flex-1">
          <div class="font-semibold text-gray-900 flex items-center justify-between">
            <span>${option.title}</span>
            <span class="${cx('text-[10px] font-mono px-1.5 py-0.5 rounded', option.badgeClass)}"
              >${option.badge}</span
            >
          </div>
          <p class="text-[11px] text-gray-500 mt-0.5">${option.description}</p>
        </div>
      </div>
    `.toString();
  }

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
