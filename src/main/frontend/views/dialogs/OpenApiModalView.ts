/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Vanilla + UI5 replacement for `components/OpenApiModal.tsx`.
 *
 * The spec is fetched whenever the dialog opens — the counterpart of the
 * `useEffect([isOpen, adapter])` in the React component — and the copy/download
 * toolbar actions keep their original behaviour, including the 2s "Copied"
 * confirmation.
 */

import { html, RawHtml } from '../../core/html';
import { watch } from '../../core/store';
import { requestBackend } from '../../services/backend';
import { appStore } from '../../stores/appStore';
import { backendStore } from '../../stores/backendStore';
import { icon } from '../../ui5/icons';
import { DialogView } from './DialogView';

const COPIED_RESET_MS = 2000;

export class OpenApiModalView extends DialogView {
  private yamlContent = '';

  private loading = true;

  private copied = false;

  private copiedTimer: ReturnType<typeof setTimeout> | null = null;

  /** Guards against a slow response from a previous open overwriting a newer one. */
  private loadToken = 0;

  /**
   * Initializes OpenApiModalView with OpenAPI dialog styling.
   *
   * WHAT: Invokes base DialogView constructor with `plib-dialog--openapi` custom class.
   * WHY: Scopes dialog sizing and ensures high-contrast code viewer themes display cleanly.
   */
  constructor() {
    super(undefined, 'plib-dialog plib-dialog--openapi');
  }

  /**
   * Determines whether the OpenAPI modal is open.
   *
   * WHAT: Returns `appStore.state.openApiModalOpen`.
   * WHY: Synchronizes modal presentation with application store state triggered from the ShellBar or footer.
   *
   * @returns `true` if open, `false` otherwise.
   */
  protected isOpen(): boolean {
    return appStore.state.openApiModalOpen;
  }

  /**
   * Handles user requests to close the OpenAPI modal.
   *
   * WHAT: Invokes `appStore.closeOpenApi()`.
   * WHY: Centralized store mutation ensures consistent cleanup and focus restoration.
   */
  protected requestClose(): void {
    appStore.closeOpenApi();
  }

  /**
   * Subscribes to modal visibility, backend adapter swaps, and teardown of transient timers.
   *
   * WHAT: Sets up reactive watchers on `openApiModalOpen` and `backendStore.config.name`,
   * automatically refetching the specification whenever the dialog opens or backend changes.
   * WHY: Different backends (e.g. Integrated Gateway vs Spring Boot) may serve distinct schema revisions,
   * so re-fetching on adapter change keeps the viewer strictly accurate.
   */
  protected onMount(): void {
    super.onMount();
    this.track(
      watch(
        appStore,
        (state) => state.openApiModalOpen,
        (open) => {
          this.requestRender();
          if (open) {
            void this.loadSpec();
          }
        }
      )
    );
    // Switching the adapter while the dialog is open refetches, as before.
    this.track(
      watch(
        backendStore,
        (state) => state.config.name,
        () => {
          if (this.isOpen()) {
            void this.loadSpec();
          }
        }
      )
    );
    this.track(() => {
      if (this.copiedTimer !== null) {
        clearTimeout(this.copiedTimer);
      }
    });
  }

  /**
   * Asynchronously fetches the OpenAPI 3.0.3 specification from the active backend.
   *
   * WHAT: Increments `loadToken`, enters loading state, requests `getOpenApiSpec` from `requestBackend`,
   * and saves the YAML string.
   * WHY: Tracking `loadToken` prevents race conditions where an outdated, slow response from an earlier
   * backend adapter overwrites the result of a more recent request.
   */
  private async loadSpec(): Promise<void> {
    const token = (this.loadToken += 1);
    this.loading = true;
    this.render();

    try {
      const text = await requestBackend('getOpenApiSpec', {});
      if (token !== this.loadToken) {
        return;
      }
      this.yamlContent = text;
    } catch (err: any) {
      if (token !== this.loadToken) {
        return;
      }
      this.yamlContent = `# Error loading openapi.yaml: ${err?.message}`;
    } finally {
      if (token === this.loadToken) {
        this.loading = false;
        this.render();
      }
    }
  }

  /**
   * Generates the modal markup including code editor viewport and export actions.
   *
   * WHAT: Emits modal header with copy/download controls, dark syntax container (`#1e293b`),
   * and route footer.
   * WHY: Displaying raw YAML in a monospaced code viewer allows developers to inspect schemas directly
   * within the app without needing external API tooling.
   *
   * @returns RawHtml modal markup.
   */
  protected body(): RawHtml {
    return html`
      <div class="w-full flex flex-col overflow-hidden bg-white dark:bg-[#1c232b]">
        <!-- Header -->
        <div
          class="px-6 py-4 border-b border-gray-100 dark:border-[#2e3b4a] bg-white dark:bg-[#1c232b] flex items-center justify-between"
        >
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-full bg-[#0070f2]/10 dark:bg-[#0070f2]/20 flex items-center justify-center text-[#0070f2] dark:text-[#4796ff] shrink-0">
              ${icon('FileCode2', { className: 'w-4 h-4' })}
            </div>
            <div>
              <h3 class="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                Personal Library OpenAPI 3.0.3 Specification
              </h3>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <ui5-button
              class="plib-button"
              design="Transparent"
              data-action="copy-spec"
              icon="${this.copied ? 'accept' : 'copy'}"
              >${this.copied ? 'Copied' : 'Copy'}</ui5-button
            >
            <ui5-button
              class="plib-button plib-button--accent"
              design="Emphasized"
              data-action="download-spec"
              icon="download"
              >Download .yaml</ui5-button
            >
            <ui5-button
              class="plib-button plib-button--icon ml-1"
              design="Transparent"
              data-action="close"
              icon="decline"
              accessible-name="Close"
            ></ui5-button>
          </div>
        </div>

        <!-- Body -->
        <div class="p-4 overflow-y-auto max-h-[70vh] flex-1 bg-[#1e293b]" data-scroll-key="openapi-spec">
          ${this.loading
            ? html`<div class="py-12 text-center text-gray-400">Loading OpenAPI schema...</div>`
            : html`<pre
                class="font-mono text-xs text-[#e2e8f0] leading-relaxed select-all"
              ><code>${this.yamlContent}</code></pre>`}
        </div>

        <!-- Footer -->
        <div
          class="px-6 py-2.5 bg-white dark:bg-[#1c232b] border-t border-gray-100 dark:border-[#2e3b4a] text-gray-500 dark:text-gray-400 flex justify-between items-center text-[11px]"
        >
          <span>Format: OpenAPI 3.0.3 Specification</span>
          <span class="font-mono">Route: /api/v1/openapi.yaml</span>
        </div>
      </div>
    `;
  }

  /**
   * Binds clipboard copy and file download actions to toolbar buttons.
   *
   * WHAT: Attaches click handlers for copying the YAML string to clipboard (with temporary 2s checkmark feedback)
   * and generating a client-side Blob download URL for `openapi.yaml`.
   * WHY: In-browser Blob generation enables instant offline file download without requiring a round-trip
   * to a file-serving backend endpoint.
   */
  protected bind(): void {
    this.on('[data-action="copy-spec"]', 'click', () => {
      void navigator.clipboard.writeText(this.yamlContent);
      this.copied = true;
      this.render();
      if (this.copiedTimer !== null) {
        clearTimeout(this.copiedTimer);
      }
      this.copiedTimer = setTimeout(() => {
        this.copiedTimer = null;
        this.copied = false;
        this.render();
      }, COPIED_RESET_MS);
    });

    this.on('[data-action="download-spec"]', 'click', () => {
      const blob = new Blob([this.yamlContent], { type: 'text/yaml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'openapi.yaml';
      anchor.click();
      URL.revokeObjectURL(url);
    });
  }
}
