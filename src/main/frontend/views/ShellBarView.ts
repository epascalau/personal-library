/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Vanilla + UI5 replacement for `components/ShellBar.tsx`.
 *
 * The bespoke Fiori shell markup and its Tailwind styling are preserved; the
 * interactive parts are now UI5 Web Components (`ui5-popover`, `ui5-avatar`,
 * `ui5-icon`), which removes the manual "click outside" listener entirely.
 */

import { Component } from '../core/component';
import { cx, html, RawHtml } from '../core/html';
import { backendStore } from '../stores/backendStore';
import { appStore } from '../stores/appStore';
import { i18nStore } from '../stores/i18nStore';
import { themeStore } from '../stores/themeStore';
import { shallowEqual, watch } from '../core/store';
import { icon, IconKey } from '../ui5/icons';
import { LanguageSelectorView } from './LanguageSelectorView';
import type Popover from '@ui5/webcomponents/dist/Popover.js';

interface ToolEntry {
  id: string;
  iconKey: IconKey;
  /** Tailwind classes for the rounded icon tile. */
  tile: string;
  title: string;
  /** Rendered in a muted span right after the title. */
  titleSuffix?: string;
  subtitle: string;
  /** Shows the small "opens in a new tab" glyph next to the title. */
  external?: boolean;
  href?: string;
  download?: string;
  action?: () => void;
}

const PROFILE_POPOVER_ID = 'plib-profile-popover';
const PROFILE_TRIGGER_ID = 'plib-profile-trigger';

export class ShellBarView extends Component<void> {
  private readonly languageSelector = this.own(new LanguageSelectorView({ variant: 'shellbar' }));

  /**
   * Constructs the SAP Fiori ShellBar header component.
   *
   * WHAT: Initializes the Component base with a `<header>` element and sticky SAP Fiori brand styling.
   * WHY: Pins the top navigation shell across all floorplans while keeping elevation and theme transitions consistent.
   */
  constructor() {
    super(undefined as void, 'header',
      'sticky top-0 z-40 bg-[#354a5f] dark:bg-[#161f28] text-white shadow-sm border-b border-[#283848] dark:border-[#24303f] transition-colors duration-200');
  }

  /**
   * Subscribes the ShellBar to user profile, catalog totals, backend configuration, and theme updates.
   *
   * WHAT: Watches `user`, `totalCount`, `config`, `theme`, and `i18nStore`.
   * WHY:
   * Crucial UX consideration: Notice that the 30-second background health poll (`backendStore.healthStatus`)
   * is deliberately omitted from the watched slices here. If the ShellBar re-rendered on every 30s health poll,
   * any open profile menu or popover would be abruptly closed while the user was interacting with it.
   */
  protected onMount(): void {
    // Only re-render for the slices actually shown, so the 30s health poll
    // never tears down an open profile popover.
    this.track(
      watch(
        appStore,
        (state) => ({ user: state.user, totalCount: state.totalCount }),
        () => this.requestRender(),
        shallowEqual
      )
    );
    this.track(watch(backendStore, (state) => state.config, () => this.requestRender()));
    this.track(watch(themeStore, (state) => state.theme, () => this.requestRender()));
    this.track(i18nStore.subscribe(() => this.requestRender()));
  }

  /**
   * Generates the developer and enterprise tools menu specification.
   *
   * WHAT: Assembles tool definitions for Backend Settings, OpenAPI 3.0, Code Docs (Javadoc/TypeDoc),
   * AGPLv3 License, and full repository ZIP export.
   * WHY: Provides researchers and engineers with direct, single-click access to system internals,
   * specifications, and documentation directly from the user profile popover.
   */
  private get tools(): ToolEntry[] {
    const t = i18nStore.state.t;
    const config = backendStore.state.config;

    return [
      {
        id: 'backend-settings',
        iconKey: 'Server',
        tile: 'bg-blue-50 dark:bg-blue-950/50 text-[#0070f2] border-blue-100 dark:border-blue-900/50',
        title: `${t.shellBar.backend} Settings`,
        titleSuffix: `(${config.type})`,
        subtitle: 'Switch to Spring Boot, Gateway, or Offline',
        action: () => appStore.openBackendSettings()
      },
      {
        id: 'openapi',
        iconKey: 'FileCode2',
        tile: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 border-purple-100 dark:border-purple-900/50',
        title: `${t.shellBar.openapi} Specification (v3.0.3)`,
        subtitle: 'Interactive REST endpoints and schemas',
        action: () => appStore.openOpenApi()
      },
      {
        id: 'mindmap',
        iconKey: 'Layers',
        tile: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 border-blue-100 dark:border-blue-900/50',
        title: 'Full Capability Mindmap',
        subtitle: '8 Pillars: Ingestion, BibTeX, Dual AI, Qdrant RAG, UI5, Security',
        action: () => appStore.openBpmnModal()
      },
      {
        id: 'camunda-bpmn',
        iconKey: 'GitBranch',
        tile: 'bg-teal-50 dark:bg-teal-950/50 text-teal-600 border-teal-100 dark:border-teal-900/50',
        title: 'Camunda BPMN 2.0 Workflow',
        subtitle: 'Document Ingestion, Dual AI & Qdrant RAG Process',
        action: () => appStore.openBpmnModal()
      },
      {
        id: 'code-docs',
        iconKey: 'BookOpen',
        tile: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 border-indigo-100 dark:border-indigo-900/50',
        title: 'API & Code Docs (Javadoc & TypeDoc)',
        subtitle: 'Interactive TypeScript & Java Spring Boot documentation',
        external: true,
        href: '/docs/'
      },
      {
        id: 'license',
        iconKey: 'Scale',
        tile: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border-emerald-100 dark:border-emerald-900/50',
        title: 'GNU AGPLv3 License',
        subtitle: 'Strongest network copyleft (OSI approved)',
        external: true,
        href: '/LICENSE'
      },
      {
        id: 'export-zip',
        iconKey: 'Archive',
        tile: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 border-amber-100 dark:border-amber-900/50',
        title: 'Export Project (.ZIP)',
        subtitle: 'Full repo: Java, TypeScript, and diagrams',
        href: '/export.zip',
        download: 'personal-library-enterprise.zip'
      }
    ];
  }

  /**
   * Renders an individual tool item row inside the profile popover.
   *
   * WHAT: Generates an anchor tag (for external links/downloads) or a clickable button (for in-app modals).
   * WHY: Differentiates navigation targets while maintaining consistent SAP Fiori hover styles.
   *
   * @param entry Tool definition item.
   * @returns RawHtml markup for the row.
   */
  private renderTool(entry: ToolEntry): RawHtml {
    const rowClasses =
      'w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#253240] transition-colors border border-transparent hover:border-gray-200 dark:hover:border-[#2e3b4a] text-left cursor-pointer group';

    const body = html`
      <div class="flex items-center gap-2.5 min-w-0 flex-1">
        <div
          class="${cx(
            'w-7 h-7 rounded-lg flex items-center justify-center border group-hover:scale-105 transition-transform shrink-0',
            entry.tile
          )}"
        >
          ${icon(entry.iconKey, { className: 'w-3.5 h-3.5' })}
        </div>
        <div class="min-w-0 flex-1">
          <div
            class="text-xs font-semibold text-gray-900 dark:text-white flex items-center gap-1.5 truncate"
          >
            ${entry.title}
            ${entry.titleSuffix
              ? html`<span class="text-[9px] font-normal text-gray-400 capitalize"
                  >${entry.titleSuffix}</span
                >`
              : ''}
            ${entry.external
              ? icon('ExternalLink', { className: 'w-2.5 h-2.5 text-gray-400 shrink-0' })
              : ''}
          </div>
          <div class="text-[10px] text-gray-500 dark:text-gray-400 truncate">${entry.subtitle}</div>
        </div>
      </div>
      ${icon('ChevronRight', {
        className:
          'w-3.5 h-3.5 text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors shrink-0 ml-1.5'
      })}
    `;

    if (entry.href) {
      return html`<a
        href="${entry.href}"
        data-tool="${entry.id}"
        ${entry.download ? html`download="${entry.download}"` : html`target="_blank" rel="noopener noreferrer"`}
        class="${rowClasses}"
        >${body}</a
      >`;
    }

    return html`<button type="button" data-tool="${entry.id}" class="${rowClasses}">${body}</button>`;
  }

  /**
   * Renders the SAP Fiori ShellBar template markup.
   *
   * WHAT: Generates brand logo, application title, language selector slot, profile popover trigger,
   * and popover body containing active user details, dual AI model telemetry, and enterprise developer tools.
   * WHY: Centralizes top-level navigation, system health telemetry, and profile utilities into a cohesive,
   * accessible header following SAP Fiori design guidelines.
   *
   * @returns RawHtml markup representing the complete ShellBar.
   */
  protected template(): RawHtml {
    const { user, totalCount } = appStore.state;
    const { config } = backendStore.state;
    const { theme, isDark } = themeStore.state;
    const t = i18nStore.state.t;

    return html`
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
        <!-- Left: Vectorial Logo & Title -->
        <div
          class="flex items-center gap-3 cursor-pointer group select-none"
          data-action="home"
          role="button"
          tabindex="0"
        >
          <div
            class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0070f2] to-[#00b4d8] p-1 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-150"
          >
            <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6">
              <path
                d="M4 23C8 21 13 21 16 24C19 21 24 21 28 23V8C24 6 19 6 16 9C13 6 8 6 4 8V23Z"
                fill="white"
                fill-opacity="0.9"
              />
              <path d="M16 9V24" stroke="#0070f2" stroke-width="1.5" stroke-linecap="round" />
              <circle cx="16" cy="14" r="2.2" fill="#0070f2" />
              <path
                d="M11 12L14 13.5M21 12L18 13.5M16 11V7"
                stroke="#0070f2"
                stroke-width="1.2"
                stroke-linecap="round"
              />
              <circle cx="11" cy="12" r="1" fill="#0070f2" />
              <circle cx="21" cy="12" r="1" fill="#0070f2" />
            </svg>
          </div>

          <div class="flex items-center gap-2.5">
            <span
              class="font-semibold text-lg tracking-tight text-white flex items-center gap-1.5"
            >
              Personal Library
            </span>
            <span
              class="hidden lg:inline-flex items-center text-[11px] text-[#b0c4de] dark:text-[#8ba2be] font-normal border-l border-white/20 pl-2.5 leading-tight tracking-normal"
            >
              Educational Sandbox for Enterprise Document Management & RAG
            </span>
          </div>
        </div>

        <!-- Center: Spacer -->
        <div class="flex-1"></div>

        <!-- Right: Language Selector & User Profile Popover -->
        <div class="flex items-center gap-2 sm:gap-2.5">
          <div data-slot="language-selector"></div>

          <div class="relative">
            <button
              id="${PROFILE_TRIGGER_ID}"
              type="button"
              class="flex items-center gap-2 px-2.5 py-1 rounded transition-colors text-xs text-white border cursor-pointer bg-transparent hover:bg-[#465c73] border-transparent hover:border-[#5a728a] aria-expanded:bg-[#465c73] aria-expanded:border-[#5a728a]"
              title="Open User Profile & Enterprise Tools"
              aria-expanded="false"
              aria-haspopup="dialog"
            >
              <ui5-avatar
                size="XS"
                initials="${user.name.charAt(0)}"
                class="w-7 h-7 rounded-full bg-[#0070f2] text-white border border-white/40 shadow-xs"
              ></ui5-avatar>
              <span class="hidden md:inline font-medium max-w-[130px] truncate">${user.name}</span>
              ${icon('ChevronDown', {
                className: 'w-3.5 h-3.5 text-[#9ab3cc] transition-transform duration-150'
              })}
            </button>
          </div>
        </div>
      </div>

      <ui5-popover
        id="${PROFILE_POPOVER_ID}"
        class="plib-popover"
        placement="Bottom"
        horizontal-align="End"
        hide-arrow
        accessible-name="User Profile and Enterprise Tools"
      >
        <div
          data-scroll-key="profile-popover"
          class="w-80 sm:w-88 max-h-[85vh] overflow-y-auto overflow-x-hidden bg-white dark:bg-[#1c232b] rounded-xl border border-gray-200 dark:border-[#2e3b4a] text-gray-800 dark:text-gray-100 py-2 divide-y divide-gray-100 dark:divide-[#26313d] box-border"
        >
          <!-- 1. User Identity Header -->
          <div
            class="p-3.5 bg-gradient-to-b from-gray-50/70 to-white dark:from-[#232c37] dark:to-[#1c232b]"
          >
            <div class="flex items-center gap-2.5 min-w-0">
              <ui5-avatar
                size="S"
                initials="${user.name.charAt(0)}"
                class="w-9 h-9 rounded-full bg-[#0070f2] text-white shadow-sm ring-2 ring-blue-100 dark:ring-blue-900/40 shrink-0"
              ></ui5-avatar>
              <div class="min-w-0 flex-1">
                <div
                  class="font-semibold text-xs text-gray-900 dark:text-white leading-tight truncate"
                >
                  ${user.name}
                </div>
                <div
                  class="text-[11px] text-gray-500 dark:text-gray-400 font-mono mt-0.5 truncate"
                >
                  ${user.email}
                </div>
              </div>
              <div class="flex flex-col items-end gap-1 shrink-0">
                <span
                  class="px-1.5 py-0.5 text-[9px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#0070f2] dark:text-[#38bdf8] rounded-full border border-blue-200 dark:border-blue-800/60"
                >
                  ${user.realm}
                </span>
                <span
                  class="px-1.5 py-0.5 text-[9px] font-medium bg-slate-100 dark:bg-[#253240] text-slate-600 dark:text-slate-300 rounded border border-slate-200 dark:border-[#354556]"
                >
                  SAP Fiori
                </span>
              </div>
            </div>

            <div class="mt-2.5 flex flex-wrap gap-1">
              ${user.roles.map(
                (role) => html`
                  <span
                    class="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-medium bg-slate-100 dark:bg-[#253240] text-slate-700 dark:text-slate-300 rounded border border-slate-200 dark:border-[#354556]"
                  >
                    ${icon('ShieldCheck', { className: 'w-2.5 h-2.5 text-[#0070f2] shrink-0' })}
                    ${role}
                  </span>
                `
              )}
            </div>
          </div>

          <!-- 2. System & Runtime Stats Section -->
          <div class="p-3 space-y-2.5">
            <div class="flex items-center justify-between">
              <div
                class="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                ${icon('Activity', { className: 'w-3.5 h-3.5 text-emerald-500 shrink-0' })}
                <span>${t.shellBar.systemStatus}</span>
              </div>
              <span
                class="flex items-center gap-1 text-[9px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60 shrink-0"
              >
                ${icon('CheckCircle2', { className: 'w-2.5 h-2.5 text-emerald-500' })}
                ${t.shellBar.backendOnline}
              </span>
            </div>

            <!-- AI Dual Models Status -->
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div
                class="bg-slate-50 dark:bg-[#222c37] border border-slate-200 dark:border-[#2e3b4a] rounded-lg p-2 min-w-0"
              >
                <div class="flex items-center justify-between mb-0.5">
                  <span
                    class="font-semibold text-gray-800 dark:text-gray-200 text-[11px] truncate"
                    >Llama 3.3 (70B Instruct)</span
                  >
                  <span class="relative flex h-2 w-2 shrink-0 ml-1">
                    <span
                      class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"
                    ></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <span class="text-[10px] text-gray-500 dark:text-gray-400 block truncate"
                  >Analytical & RAG</span
                >
              </div>

              <div
                class="bg-slate-50 dark:bg-[#222c37] border border-slate-200 dark:border-[#2e3b4a] rounded-lg p-2 min-w-0"
              >
                <div class="flex items-center justify-between mb-0.5">
                  <span
                    class="font-semibold text-gray-800 dark:text-gray-200 text-[11px] truncate"
                    >Mistral Large</span
                  >
                  <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-1"></span>
                </div>
                <span class="text-[10px] text-gray-500 dark:text-gray-400 block truncate"
                  >Executive Summary</span
                >
              </div>
            </div>

            <!-- Vector DB & Driver telemetry row -->
            <div
              class="bg-gray-50 dark:bg-[#222c37] rounded-lg p-2 border border-gray-200 dark:border-[#2e3b4a] text-xs space-y-1"
            >
              <div class="flex items-center justify-between text-[11px]">
                <span class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 shrink-0">
                  ${icon('Database', { className: 'w-3 h-3 text-[#0070f2]' })}
                  ${t.shellBar.vectorStoreDocs}:
                </span>
                <span
                  class="font-semibold text-gray-900 dark:text-white bg-white dark:bg-[#1c232b] px-1.5 py-0.5 rounded border border-gray-200 dark:border-[#354556] font-mono text-[10px] shrink-0"
                >
                  ${totalCount} indexed
                </span>
              </div>
              <div class="flex items-center justify-between text-[11px] min-w-0 gap-2">
                <span class="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 shrink-0">
                  ${icon('Server', { className: 'w-3 h-3 text-slate-500' })}
                  Backend:
                </span>
                <span
                  class="font-mono text-[10px] text-gray-800 dark:text-gray-200 truncate text-right"
                >
                  ${config.name}
                </span>
              </div>
            </div>
          </div>

          <!-- 3. Developer & Enterprise Tools (Backend, Docs, OpenAPI) -->
          <div class="p-3 space-y-1.5">
            <div
              class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1"
            >
              Enterprise Tools & APIs
            </div>
            ${this.tools.map((entry) => this.renderTool(entry))}
          </div>

          <!-- 4. Visual Theme Switcher -->
          <div class="p-3 space-y-1.5">
            <div
              class="flex items-center justify-between text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
            >
              <span>${t.shellBar.visualTheme}</span>
              <span class="text-[10px] font-normal text-gray-400 capitalize">
                ${isDark ? t.shellBar.themeEvening : t.shellBar.themeMorning}
              </span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                data-theme-option="light"
                class="${cx(
                  'flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer',
                  theme === 'light'
                    ? 'bg-[#ebf8ff] dark:bg-[#1a365d] text-[#0070f2] dark:text-[#38bdf8] border-[#0070f2] shadow-xs'
                    : 'bg-gray-50 dark:bg-[#253240] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#354556] hover:bg-gray-100 dark:hover:bg-[#2c3b4b]'
                )}"
              >
                ${icon('Sun', { className: 'w-3.5 h-3.5 text-[#f59e0b] shrink-0' })}
                <span class="truncate">${t.shellBar.themeMorning}</span>
              </button>
              <button
                type="button"
                data-theme-option="dark"
                class="${cx(
                  'flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border cursor-pointer',
                  theme === 'dark'
                    ? 'bg-[#1e293b] text-[#38bdf8] border-[#38bdf8] shadow-xs'
                    : 'bg-gray-50 dark:bg-[#253240] text-gray-700 dark:text-gray-300 border-gray-200 dark:border-[#354556] hover:bg-gray-100 dark:hover:bg-[#2c3b4b]'
                )}"
              >
                ${icon('Moon', { className: 'w-3.5 h-3.5 text-[#38bdf8] shrink-0' })}
                <span class="truncate">${t.shellBar.themeEvening}</span>
              </button>
            </div>
          </div>

          <!-- 5. Keycloak Session Info & Sign Out Button -->
          <div class="p-3 bg-gray-50/60 dark:bg-[#171e26] space-y-2">
            <div class="text-[10px] text-gray-400 dark:text-gray-500 flex justify-between px-1">
              <span>${t.shellBar.authMethod}:</span>
              <span class="font-mono text-gray-600 dark:text-gray-300">Keycloak OIDC (JWT)</span>
            </div>

            <button
              type="button"
              data-action="logout"
              class="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-900/50 transition-colors cursor-pointer"
            >
              ${icon('LogOut', { className: 'w-3.5 h-3.5' })}
              <span>${t.shellBar.signOut}</span>
            </button>
          </div>
        </div>
      </ui5-popover>
    `;
  }

  /**
   * Binds UI5 popover events, language selector child adoption, navigation handlers, and theme switches.
   *
   * WHAT: Adopts LanguageSelectorView into designated slot, links the profile avatar trigger to `ui5-popover`,
   * syncs ARIA expanded states and chevron rotation, and binds click handlers for home navigation, tool modals,
   * theme toggles, and logout actions.
   * WHY: Encapsulates interactive DOM behavior and event delegations safely after the shadow root and DOM tree
   * are rendered, avoiding premature element access errors while managing UI state transitions.
   */
  protected afterRender(): void {
    this.adopt('[data-slot="language-selector"]', this.languageSelector);

    const popover = this.$<Popover>(`#${PROFILE_POPOVER_ID}`);
    const trigger = this.$(`#${PROFILE_TRIGGER_ID}`);
    const chevron = trigger?.querySelector('ui5-icon');

    if (popover && trigger) {
      popover.opener = trigger;

      trigger.addEventListener('click', () => {
        popover.open = !popover.open;
      });

      const syncTriggerState = (): void => {
        trigger.setAttribute('aria-expanded', String(popover.open));
        chevron?.classList.toggle('rotate-180', popover.open);
      };
      popover.addEventListener('open', syncTriggerState);
      popover.addEventListener('close', syncTriggerState);
    }

    const closePopover = (): void => {
      if (popover) {
        popover.open = false;
      }
    };

    this.on('[data-action="home"]', 'click', () => appStore.goHome());
    this.on('[data-action="home"]', 'keydown', (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        appStore.goHome();
      }
    });

    const toolsById = new Map(this.tools.map((entry) => [entry.id, entry]));
    this.onAll('[data-tool]', 'click', (_event, element) => {
      const entry = toolsById.get(element.dataset.tool as string);
      closePopover();
      entry?.action?.();
    });

    this.onAll('[data-theme-option]', 'click', (_event, element) => {
      themeStore.setTheme(element.dataset.themeOption as 'light' | 'dark');
    });

    this.on('[data-action="logout"]', 'click', () => {
      closePopover();
      void appStore.logout();
    });
  }
}
