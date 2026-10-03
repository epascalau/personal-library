import { Component } from '../core/component';
import { html, RawHtml } from '../core/html';
import { watch } from '../core/store';
import { backendStore } from '../stores/backendStore';
import { i18nStore } from '../stores/i18nStore';
import { themeStore } from '../stores/themeStore';

/**
 * SAP Fiori Horizon footer.
 *
 * Carries the theme-toggle shortcut, the active backend adapter name,
 * the architecture blurb and the legal trademark notice.
 */
export class FooterView extends Component {
  constructor() {
    super(
      undefined,
      'footer',
      'bg-white dark:bg-[#1c232b] border-t border-[#e2e8f0] dark:border-[#2e3b4a] ' +
        'py-4 sm:py-5 text-xs text-gray-500 dark:text-[#9cb0c5] transition-colors duration-200'
    );
  }

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

  protected template(): RawHtml {
    const t = i18nStore.state.t;
    const isDark = themeStore.state.isDark;
    const themeLabel = isDark
      ? `🌙 ${t.shellBar.horizonTheme} (${t.shellBar.themeEvening})`
      : `☀️ ${t.shellBar.horizonTheme} (${t.shellBar.themeMorning})`;

    return html`
      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2.5"
      >
        <div class="flex flex-wrap items-center gap-2">
          <span class="font-semibold text-gray-700 dark:text-gray-200">${t.footer.libraryTitle}</span>
          <span>•</span>
          <button
            type="button"
            data-action="toggle-theme"
            class="text-[#0070f2] dark:text-[#4796ff] hover:underline cursor-pointer flex items-center gap-1 font-medium"
            title="Click to toggle SAP Horizon light/dark theme"
          >
            <span>${themeLabel}</span>
          </button>
          <span>•</span>
          <span class="font-mono text-[11px]"
            >${t.footer.backendLabel}: ${backendStore.config.name}</span
          >
        </div>
        <div
          class="flex flex-wrap items-center gap-4 text-[11px] text-gray-400 dark:text-gray-500"
        >
          <span>${t.footer.architecture}</span>
          <span>${t.footer.springAi}</span>
          <span>${t.footer.qdrant}</span>
        </div>
      </div>

      <div
        class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-3.5 pt-3 border-t border-gray-200/80 dark:border-[#2b3746]"
      >
        <p
          class="text-[11px] leading-relaxed text-gray-400 dark:text-gray-400 text-center sm:text-left"
        >
          ${t.footer.trademarkDisclaimer}
        </p>
      </div>
    `;
  }

  protected afterRender(): void {
    this.on('[data-action="toggle-theme"]', 'click', () => themeStore.toggleTheme());
  }
}
