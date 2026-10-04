/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * SAP Fiori Horizon footer view.
 * Provides copyright, open-source AGPL-3.0 licensing notices, architecture metadata,
 * active backend status indicator, and quick-toggle controls for theme switching.
 */

import { Component } from '../core/component';
import { html, RawHtml } from '../core/html';
import { watch } from '../core/store';
import { backendStore } from '../stores/backendStore';
import { i18nStore } from '../stores/i18nStore';
import { themeStore } from '../stores/themeStore';

/**
 * SAP Fiori Horizon footer component.
 *
 * Carries the theme-toggle shortcut, the active backend adapter name,
 * the architecture blurb and the legal trademark notice.
 */
export class FooterView extends Component {
  /**
   * Constructs the FooterView with semantic `footer` tag and Fiori Horizon responsive styling.
   *
   * WHAT: Initializes the base Component with a native `<footer>` element, applying border and background styling.
   * WHY: Using the semantic `<footer>` HTML tag ensures landmark navigation compliance for screen readers (WCAG 2.1 AA),
   * while pre-configuring dark-mode transitions prevents jarring layout flashes during theme toggling.
   */
  constructor() {
    super(
      undefined,
      'footer',
      'bg-white dark:bg-[#1c232b] border-t border-[#e2e8f0] dark:border-[#2e3b4a] ' +
        'py-4 sm:py-5 text-xs text-gray-500 dark:text-[#9cb0c5] transition-colors duration-200'
    );
  }

  /**
   * Registers reactive subscriptions to theme, internationalization, and backend configuration changes.
   *
   * WHAT: Binds watchers on `themeStore`, `i18nStore`, and `backendStore` and registers their unsubscribers via `this.track`.
   * WHY: Fine-grained tracking ensures that whenever the language changes, the theme flips, or the user switches
   * from Integrated Gateway to Spring Boot or Mock mode, the footer text and status pill update instantly without
   * triggering unnecessary top-level application re-renders.
   */
  protected onMount(): void {
    this.track(
      watch(
        themeStore,
        (state) => state.isDark,
        () => this.requestRender()
      )
    );
    this.track(i18nStore.subscribe(() => this.requestRender()));
    this.track(
      watch(
        backendStore,
        (state) => state.config.name,
        () => this.requestRender()
      )
    );
  }

  /**
   * Generates the semantic HTML markup for the application footer.
   *
   * WHAT: Produces the layout containing the SAP Horizon theme toggle button, backend adapter indicator,
   * technology stack highlights (Spring AI, Qdrant), GNU AGPLv3 license link, and SAP trademark disclaimer.
   * WHY: Declaring this as pure `RawHtml` template with localized string interpolation guarantees XSS safety
   * while keeping the rendered DOM fully synchronized with the user's active locale and selected dark/light mode.
   *
   * @returns RawHtml markup representing the application footer.
   */
  protected template(): RawHtml {
    const t = i18nStore.state.t;
    const isDark = themeStore.state.isDark;
    const themeLabel = isDark
      ? `🌙 ${t.shellBar.horizonTheme} (${t.shellBar.themeEvening})`
      : `☀️ ${t.shellBar.horizonTheme} (${t.shellBar.themeMorning})`;

    return html`
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-xs"
      >
        <span class="font-semibold text-gray-700 dark:text-gray-200">${t.footer.libraryTitle}</span>
        <span class="text-gray-400 dark:text-gray-500">• Educational Sandbox</span>
        <span class="text-gray-300 dark:text-gray-600">•</span>
        <button
          type="button"
          data-action="toggle-theme"
          class="text-[#0070f2] dark:text-[#4796ff] hover:underline cursor-pointer flex items-center gap-1 font-medium"
          title="Click to toggle SAP Horizon light/dark theme"
        >
          <span>${themeLabel}</span>
        </button>
        <span class="text-gray-300 dark:text-gray-600">•</span>
        <span class="font-mono text-[11px]"
          >${t.footer.backendLabel}: ${backendStore.config.name}</span
        >
        <span class="text-gray-300 dark:text-gray-600">•</span>
        <span class="text-[11px] text-gray-400 dark:text-gray-500">${t.footer.architecture}</span>
        <span class="text-gray-300 dark:text-gray-600">•</span>
        <span class="text-[11px] text-gray-400 dark:text-gray-500">${t.footer.springAi}</span>
        <span class="text-gray-300 dark:text-gray-600">•</span>
        <span class="text-[11px] text-gray-400 dark:text-gray-500">${t.footer.qdrant}</span>
      </div>

      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3 pt-2.5 border-t border-gray-200/60 dark:border-[#2b3746]/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]"
      >
        <div class="flex flex-wrap items-center gap-1.5 text-gray-600 dark:text-gray-300">
          <span class="font-semibold text-gray-700 dark:text-gray-200">${t.footer.license}:</span>
          <span>${t.footer.licenseInfo}</span>
        </div>
        <a
          href="/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
          class="text-[#0070f2] dark:text-[#4796ff] hover:underline flex items-center gap-1 font-medium cursor-pointer shrink-0"
          title="GNU AGPLv3 License"
        >
          <span>${t.footer.viewLicense}</span>
          <span aria-hidden="true">&rarr;</span>
        </a>
      </div>

      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-2.5 pt-2 border-t border-gray-200/80 dark:border-[#2b3746]"
      >
        <p
          class="text-[11px] leading-relaxed text-gray-400 dark:text-gray-400 text-center sm:text-left"
        >
          ${t.footer.trademarkDisclaimer}
        </p>
      </div>
    `;
  }

  /**
   * Binds user interaction handlers after template rendering completes.
   *
   * WHAT: Attaches a click event listener to the theme toggle button element (`[data-action="toggle-theme"]`).
   * WHY: Using delegated component event binding (`this.on`) ensures clean attachment that survives template re-renders
   * while cleanly isolating UI event dispatching from template string construction.
   */
  protected afterRender(): void {
    this.on('[data-action="toggle-theme"]', 'click', () => themeStore.toggleTheme());
  }
}
