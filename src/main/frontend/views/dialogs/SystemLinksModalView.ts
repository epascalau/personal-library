/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * "System Services & Admin Consoles" quick-links modal.
 *
 * WHAT: A single, discoverable overlay listing every infrastructure service running
 * behind the application — Swagger Editor, the Java backend's own springdoc Swagger UI,
 * Spring Boot Actuator health, the Keycloak admin console, the Qdrant vector DB dashboard,
 * Mongo Express (MongoDB web viewer), the read-only document storage browser, the Ollama
 * inference API, and the nginx single ingress — each as a one-click external link with
 * credentials/usage hints.
 *
 * WHY: Today these services are only documented in README.md ("Docker Inspection") and
 * scattered docker-compose.yml comments; a developer or operator has to already know every
 * published port to reach them. Surfacing them directly from the user profile popover turns
 * tribal knowledge into a one-click, self-documenting index — consistent with how OpenAPI,
 * the Mindmap, and BPMN are already exposed as modals from the same menu (see ShellBarView).
 *
 * All URLs are built from `window.location.hostname` (not a hardcoded "localhost") so the
 * dialog still resolves correctly when the app is accessed from a non-local host (e.g. a
 * teammate's machine on the LAN or a remote dev box), matching the same host-relative
 * approach already used by the "Direct Java Spring Boot" backend preset.
 */

import { html, RawHtml } from '../../core/html';
import { watch } from '../../core/store';
import { icon, IconKey } from '../../ui5/icons';
import { appStore } from '../../stores/appStore';
import { DialogView } from './DialogView';

interface SystemLinkEntry {
  id: string;
  iconKey: IconKey;
  tile: string;
  title: string;
  subtitle: string;
  /** e.g. "root / librarypass" or "admin / admin" — rendered as a small credentials chip. */
  credentials?: string;
  /** Builds the absolute URL from the current page's hostname. */
  url: (host: string) => string;
}

const LINKS: SystemLinkEntry[] = [
  {
    id: 'swagger-editor',
    iconKey: 'FileCode2',
    tile: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 border-purple-100 dark:border-purple-900/50',
    title: 'Swagger Editor',
    subtitle: 'Interactive openapi.yaml viewer/editor (also at nginx /swagger/)',
    url: (host) => `http://${host}:8090/`
  },
  {
    id: 'springdoc-swagger-ui',
    iconKey: 'FileCode2',
    tile: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 border-indigo-100 dark:border-indigo-900/50',
    title: 'Spring Boot Swagger UI',
    subtitle: 'Live, controller-generated REST docs (springdoc-openapi)',
    url: (host) => `http://${host}:18080/swagger-ui.html`
  },
  {
    id: 'actuator-health',
    iconKey: 'Activity',
    tile: 'bg-sky-50 dark:bg-sky-950/50 text-sky-600 border-sky-100 dark:border-sky-900/50',
    title: 'Spring Boot Actuator Health',
    subtitle: 'Aggregated readiness: Ollama, Qdrant, MongoDB connectivity',
    url: (host) => `http://${host}:18080/actuator/health`
  },
  {
    id: 'keycloak-admin',
    iconKey: 'Key',
    tile: 'bg-red-50 dark:bg-red-950/50 text-red-600 border-red-100 dark:border-red-900/50',
    title: 'Keycloak Admin Console',
    subtitle: 'Realm, client, and user/role management (OIDC identity provider)',
    credentials: 'admin / admin',
    url: (host) => `http://${host}:8180/admin/`
  },
  {
    id: 'qdrant-dashboard',
    iconKey: 'Layers',
    tile: 'bg-violet-50 dark:bg-violet-950/50 text-violet-600 border-violet-100 dark:border-violet-900/50',
    title: 'Qdrant Dashboard',
    subtitle: 'Browse the personal_library_embeddings collection, points, and HNSW index stats',
    url: (host) => `http://${host}:16333/dashboard`
  },
  {
    id: 'mongo-express',
    iconKey: 'Database',
    tile: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border-emerald-100 dark:border-emerald-900/50',
    title: 'Mongo Express',
    subtitle: 'Web viewer/editor for the personal_library MongoDB database',
    credentials: 'root / librarypass',
    url: (host) => `http://${host}:8091/`
  },
  {
    id: 'storage-browser',
    iconKey: 'HardDrive',
    tile: 'bg-teal-50 dark:bg-teal-950/50 text-teal-600 border-teal-100 dark:border-teal-900/50',
    title: 'Document Storage Browser',
    subtitle: 'Read-only listing of the uploaded files on disk ({guid}/v{version}/{fileName})',
    url: (host) => `http://${host}:8092/`
  },
  {
    id: 'ollama-api',
    iconKey: 'Bot',
    tile: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 border-amber-100 dark:border-amber-900/50',
    title: 'Ollama API (model tags)',
    subtitle: 'Raw JSON list of locally pulled models (no web UI — API only)',
    url: (host) => `http://${host}:21434/api/tags`
  },
  {
    id: 'nginx-ingress',
    iconKey: 'Network',
    tile: 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    title: 'nginx Single Ingress',
    subtitle: 'Unified entry point (port 8088) routing to the Java API & frontend',
    url: (host) => `http://${host}:8088/`
  }
];

export class SystemLinksModalView extends DialogView {
  /**
   * Initializes SystemLinksModalView with its scoped dialog CSS class.
   *
   * WHAT: Invokes the base DialogView constructor with `plib-dialog--system-links`.
   * WHY: Keeps modal sizing/theme rules scoped and consistent with the other ShellBar dialogs.
   */
  constructor() {
    super(undefined, 'plib-dialog plib-dialog--system-links');
  }

  /**
   * Registers the reactive store listener that drives dialog visibility.
   *
   * WHAT: Subscribes to `systemLinksModalOpen` and re-renders whenever it flips.
   * WHY: `DialogView.afterRender()` is what pushes `isOpen()` onto the `ui5-dialog` host, and
   * `template()` only emits the body while open — so without this subscription the store change
   * made by the ShellBar entry never reaches the DOM and the modal silently never appears.
   */
  protected onMount(): void {
    super.onMount();
    this.track(
      watch(
        appStore,
        (state) => state.systemLinksModalOpen,
        () => this.requestRender()
      )
    );
  }

  /**
   * Determines whether the System Services modal is open.
   *
   * WHAT: Returns `appStore.state.systemLinksModalOpen`.
   * WHY: Synchronizes modal visibility with the application store, driven from the ShellBar's
   * profile popover tool list.
   */
  protected isOpen(): boolean {
    return appStore.state.systemLinksModalOpen;
  }

  /**
   * Handles user requests to close the System Services modal.
   *
   * WHAT: Invokes `appStore.closeSystemLinksModal()`.
   * WHY: Centralizes store mutation so Escape, backdrop click, and the close button all behave identically.
   */
  protected requestClose(): void {
    appStore.closeSystemLinksModal();
  }

  /**
   * Renders a single infrastructure service row as an external link card.
   *
   * WHAT: Builds an absolute URL against `window.location.hostname`, an icon tile, title,
   * subtitle, and an optional credentials chip.
   * WHY: Mirrors the ShellBar's own tool-row visual language so this dialog feels like a native
   * continuation of the profile popover rather than a bolted-on screen.
   *
   * @param entry Service link definition.
   * @returns RawHtml markup for the anchor row.
   */
  private renderLink(entry: SystemLinkEntry): RawHtml {
    const host = window.location.hostname || 'localhost';
    const href = entry.url(host);

    return html`
      <a
        href="${href}"
        target="_blank"
        rel="noopener noreferrer"
        data-link="${entry.id}"
        class="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-[#2e3b4a] hover:border-gray-300 dark:hover:border-[#3d4d5e] hover:bg-gray-50 dark:hover:bg-[#253240] transition-colors group"
      >
        <div
          class="${`w-9 h-9 rounded-lg flex items-center justify-center border shrink-0 group-hover:scale-105 transition-transform ${entry.tile}`}"
        >
          ${icon(entry.iconKey, { className: 'w-4 h-4' })}
        </div>
        <div class="min-w-0 flex-1">
          <div class="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 truncate">
            ${entry.title}
            ${icon('ExternalLink', { className: 'w-3 h-3 text-gray-400 shrink-0' })}
          </div>
          <div class="text-[11px] text-gray-500 dark:text-gray-400 truncate">${entry.subtitle}</div>
        </div>
        ${entry.credentials
          ? html`<span
              class="text-[10px] font-mono px-2 py-1 rounded-full bg-gray-100 dark:bg-[#1c232b] text-gray-500 dark:text-gray-400 shrink-0"
              >${entry.credentials}</span
            >`
          : ''}
        <span class="font-mono text-[10px] text-gray-400 dark:text-gray-500 shrink-0 hidden sm:inline"
          >${href}</span
        >
      </a>
    `;
  }

  /**
   * Generates the modal markup listing every infrastructure service behind the application.
   *
   * WHAT: Emits a header, a scrollable list of service link cards, and a footer disclaimer
   * about dev-time direct port access.
   * WHY: Gives a single authoritative, in-app index of every running system — consistent with
   * the architectural rationale already documented in DEVOPS_GUIDE.md §4.
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
            <div
              class="w-8 h-8 rounded-full bg-[#0070f2]/10 dark:bg-[#0070f2]/20 flex items-center justify-center text-[#0070f2] dark:text-[#4796ff] shrink-0"
            >
              ${icon('Network', { className: 'w-4 h-4' })}
            </div>
            <div>
              <h3 class="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                System Services &amp; Admin Consoles
              </h3>
              <p class="text-[11px] text-gray-500 dark:text-gray-400">
                Every infrastructure service running behind this application
              </p>
            </div>
          </div>
          <ui5-button
            class="plib-button plib-button--icon"
            design="Transparent"
            data-action="close"
            icon="decline"
            accessible-name="Close"
          ></ui5-button>
        </div>

        <!-- Body -->
        <div
          class="p-4 overflow-y-auto max-h-[70vh] flex-1 flex flex-col gap-2"
          data-scroll-key="system-links"
        >
          ${LINKS.map((entry) => this.renderLink(entry))}
        </div>

        <!-- Footer -->
        <div
          class="px-6 py-2.5 bg-white dark:bg-[#1c232b] border-t border-gray-100 dark:border-[#2e3b4a] text-gray-500 dark:text-gray-400 text-[11px]"
        >
          Links target each service's directly published port for local/dev-time access. In a
          production deployment behind the nginx single ingress, lock these down or restrict
          them to an internal network — see
          <span class="font-mono">docs/DEVOPS_GUIDE.md §4</span>.
        </div>
      </div>
    `;
  }
}
