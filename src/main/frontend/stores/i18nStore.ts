/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
  constructor() {
    super(describe(readInitialLanguage()));
    this.applyToDocument();
    this.subscribe(() => this.applyToDocument());
  }

  setLanguage(language: SupportedLanguage): void {
    if (TRANSLATIONS[language]) {
      this.setState(describe(language));
    }
  }

  /** Convenience accessor so views can write `t().shellBar.title`. */
  get t(): TranslationDictionary {
    return this.state.t;
  }

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
