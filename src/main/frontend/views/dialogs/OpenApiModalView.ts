/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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

  constructor() {
    super(undefined);
  }

  protected isOpen(): boolean {
    return appStore.state.openApiModalOpen;
  }

  protected requestClose(): void {
    appStore.closeOpenApi();
  }

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

  protected body(): RawHtml {
    return html`
      <div slot="header" class="w-full">
        <div
          class="px-6 py-3.5 border-b border-gray-200 bg-[#f8fafc] flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            ${icon('FileCode2', { className: 'w-5 h-5 text-[#0070f2]' })}
            <div>
              <h3 class="text-base font-bold text-gray-900">
                Personal Library OpenAPI 3.0.3 Specification
              </h3>
              <p class="text-xs text-gray-500 font-mono">
                Endpoints for Documents, BibTeX, Dual Summaries (Llama &amp; Mistral), and Qdrant
                RAG
              </p>
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
              class="plib-button"
              design="Emphasized"
              data-action="download-spec"
              icon="download"
              >Download .yaml</ui5-button
            >
            <ui5-button
              class="plib-button plib-button--icon ml-2"
              design="Transparent"
              data-action="close"
              icon="decline"
              accessible-name="Close"
            ></ui5-button>
          </div>
        </div>
      </div>

      <div class="p-4 overflow-y-auto flex-1 bg-[#1e293b]" data-scroll-key="openapi-spec">
        ${this.loading
          ? html`<div class="py-12 text-center text-gray-400">Loading OpenAPI schema...</div>`
          : html`<pre
              class="font-mono text-xs text-[#e2e8f0] leading-relaxed select-all"
            ><code>${this.yamlContent}</code></pre>`}
      </div>

      <div slot="footer" class="w-full">
        <div
          class="px-6 py-2.5 bg-[#f8fafc] border-t border-gray-200 text-gray-500 flex justify-between items-center text-[11px]"
        >
          <span>Format: OpenAPI 3.0.3 Specification</span>
          <span class="font-mono">Route: /api/v1/openapi.yaml</span>
        </div>
      </div>
    `;
  }

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
