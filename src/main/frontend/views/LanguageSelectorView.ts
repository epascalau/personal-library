/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vanilla + UI5 replacement for `components/LanguageSelector.tsx`.
 *
 * The hand-rolled dropdown and its document-level "click outside" listener are
 * replaced by a `ui5-popover`, which handles dismissal, focus trapping and
 * keyboard navigation natively. The visual styling is unchanged.
 */

import { Component } from '../core/component';
import { cx, html, RawHtml } from '../core/html';
import { i18nStore } from '../stores/i18nStore';
import { flag } from '../ui5/flags';
import { icon } from '../ui5/icons';
import type { SupportedLanguage } from '../i18n/types';
import type Popover from '@ui5/webcomponents/dist/Popover.js';

export type LanguageSelectorVariant = 'shellbar' | 'compact' | 'footer';

export interface LanguageSelectorProps {
  variant?: LanguageSelectorVariant;
}

let instanceSeq = 0;

export class LanguageSelectorView extends Component<LanguageSelectorProps> {
  private readonly uid = `plib-lang-${(instanceSeq += 1)}`;

  constructor(props: LanguageSelectorProps = {}) {
    super(props, 'div', 'relative inline-block');
  }

  protected onMount(): void {
    this.track(i18nStore.subscribe(() => this.requestRender()));
  }

  protected template(): RawHtml {
    const { variant = 'shellbar' } = this.props;
    const { language, currentLanguage, languages } = i18nStore.state;

    const triggerClasses = cx(
      'flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded transition-colors border cursor-pointer',
      variant === 'shellbar'
        ? 'text-[#d3e2f2] hover:text-white bg-transparent hover:bg-[#465c73] dark:hover:bg-[#253547] border-transparent hover:border-[#5a728a]'
        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-white dark:bg-[#1c232b] border-gray-200 dark:border-[#2e3b4a] shadow-xs'
    );

    return html`
      <button
        id="${this.uid}-trigger"
        type="button"
        class="${triggerClasses}"
        title="Change Language (Current: ${currentLanguage.name})"
        aria-label="Change Language"
        aria-haspopup="menu"
      >
        ${icon('Globe', { className: 'w-3.5 h-3.5 text-[#38bdf8]' })}
        ${flag(currentLanguage.code, { className: 'w-4 h-3', label: currentLanguage.name })}
        <span class="hidden md:inline text-xs font-semibold">${currentLanguage.code.toUpperCase()}</span>
        ${icon('ChevronDown', { className: 'w-3 h-3 opacity-70' })}
      </button>

      <ui5-popover
        id="${this.uid}-popover"
        class="plib-popover"
        placement="Bottom"
        horizontal-align="End"
        hide-arrow
        accessible-name="Select Language"
      >
        <div
          class="w-48 bg-white dark:bg-[#1c232b] rounded-lg border border-gray-200 dark:border-[#2e3b4a] py-1.5"
        >
          <div
            class="px-3 py-1.5 border-b border-gray-100 dark:border-[#26313d] text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
          >
            Select Language
          </div>
          ${languages.map((lang) => {
            const isSelected = lang.code === language;
            return html`
              <button
                type="button"
                data-lang="${lang.code}"
                class="${cx(
                  'w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-left cursor-pointer',
                  isSelected
                    ? 'bg-[#ebf8ff] dark:bg-[#223347] text-[#0070f2] dark:text-[#4796ff] font-semibold'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#253240]'
                )}"
              >
                <div class="flex items-center gap-2">
                  ${flag(lang.code, { className: 'w-5 h-3.5' })}
                  <div>
                    <div class="leading-tight">${lang.nativeName}</div>
                    <div class="text-[10px] text-gray-400 dark:text-gray-500 leading-none">
                      ${lang.name}
                    </div>
                  </div>
                </div>
                ${isSelected
                  ? icon('Check', { className: 'w-4 h-4 text-[#0070f2] dark:text-[#4796ff]' })
                  : ''}
              </button>
            `;
          })}
        </div>
      </ui5-popover>
    `;
  }

  protected afterRender(): void {
    const popover = this.$<Popover>(`#${this.uid}-popover`);
    const trigger = this.$(`#${this.uid}-trigger`);
    if (!popover || !trigger) {
      return;
    }
    popover.opener = trigger;

    trigger.addEventListener('click', () => {
      popover.open = !popover.open;
    });

    this.onAll('button[data-lang]', 'click', (_event, element) => {
      i18nStore.setLanguage(element.dataset.lang as SupportedLanguage);
      popover.open = false;
    });
  }
}
