/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Vanilla replacement for `i18n/I18nContext.tsx`. Same storage key, same
 * browser-locale fallback and the same five dictionaries.
 */

import { Store } from '../core/store';
import { SupportedLanguage, LanguageInfo, SUPPORTED_LANGUAGES, TranslationDictionary } from '../i18n/types';
import { en } from '../i18n/translations/en';
import { de } from '../i18n/translations/de';
import { fr } from '../i18n/translations/fr';
import { es } from '../i18n/translations/es';
import { ro } from '../i18n/translations/ro';

const TRANSLATIONS: Record<SupportedLanguage, TranslationDictionary> = {
  en,
  de,
  fr,
  es,
  ro
};

const I18N_STORAGE_KEY = 'personal_library_lang';

export interface I18nState {
  language: SupportedLanguage;
  currentLanguage: LanguageInfo;
  languages: LanguageInfo[];
  t: TranslationDictionary;
}

const readInitialLanguage = (): SupportedLanguage => {
  // 1. Check localStorage
  const saved = localStorage.getItem(I18N_STORAGE_KEY) as SupportedLanguage | null;
  if (saved && TRANSLATIONS[saved]) {
    return saved;
  }
  // 2. Check browser locale
  if (typeof navigator !== 'undefined' && navigator.language) {
    const code = navigator.language.split('-')[0].toLowerCase() as SupportedLanguage;
    if (TRANSLATIONS[code]) {
      return code;
    }
  }
  return 'en';
};

const describe = (language: SupportedLanguage): I18nState => ({
  language,
  currentLanguage: SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0],
  languages: SUPPORTED_LANGUAGES,
  t: TRANSLATIONS[language] || en
});

class I18nStore extends Store<I18nState> {
  /**
   * Initializes the internationalization store with persisted, browser, or default locale.
   *
   * WHAT: Evaluates `localStorage` then `navigator.language` against supported dictionaries (en, de, fr, es, ro),
   * sets the initial state, synchronizes `document.documentElement.lang`, and subscribes to self.
   * WHY: Immediate synchronous initialization ensures that initial template renders never flash
   * raw untranslated translation keys or wrong language strings.
   */
  constructor() {
    super(describe(readInitialLanguage()));
    this.applyToDocument();
    this.subscribe(() => this.applyToDocument());
  }

  /**
   * Switches the active language across the entire application.
   *
   * WHAT: Validates the language code against available translation dictionaries, updates state,
   * and notifies all subscribers.
   * WHY: Triggers wholesale re-renders of active views with the new translation dictionary,
   * updating labels, placeholders, dialog buttons, and notifications instantly without a page reload.
   *
   * @param language Target locale code ('en', 'de', 'fr', 'es', or 'ro').
   */
  setLanguage(language: SupportedLanguage): void {
    if (TRANSLATIONS[language]) {
      this.setState(describe(language));
    }
  }

  /**
   * Accessor returning the current translation dictionary.
   *
   * WHAT: Returns `this.state.t`.
   * WHY: Enables compact syntax in view template methods (e.g. `t().listReport.title`).
   */
  get t(): TranslationDictionary {
    return this.state.t;
  }

  /**
   * Synchronizes active locale attributes to the browser DOM and local persistence.
   *
   * WHAT: Sets `document.documentElement.lang = language` and writes to `localStorage`.
   * WHY: Setting the HTML `lang` attribute is essential for WCAG accessibility compliance
   * (ensuring assistive screen readers pronounce text with proper language inflection)
   * and preserves user language preference across browser visits.
   */
  private applyToDocument(): void {
    const { language } = this.state;
    localStorage.setItem(I18N_STORAGE_KEY, language);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = language;
    }
  }
}

export const i18nStore = new I18nStore();

/** Shorthand used throughout the views: `t().listReport.title`. */
export const t = (): TranslationDictionary => i18nStore.state.t;
