/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vanilla replacement for `context/ThemeContext.tsx`. Keeps the exact same
 * localStorage key, the same `<html>` attributes/classes and the same body
 * background classes, and additionally drives the UI5 Web Components theme.
 */

import { setTheme as setUi5Theme } from '@ui5/webcomponents-base/dist/config/Theme.js';
import { Store } from '../core/store';

export type SapHorizonTheme = 'morning-horizon' | 'evening-horizon';

export interface ThemeState {
  theme: SapHorizonTheme;
  isDark: boolean;
  themeName: string;
}

const THEME_STORAGE_KEY = 'personal_library_sap_theme';

const LIGHT_BODY_CLASSES = ['bg-[#f5f6f8]', 'text-[#1d2d3e]'];
const DARK_BODY_CLASSES = ['bg-[#12171c]', 'text-[#f0f4f8]'];

const readInitialTheme = (): SapHorizonTheme => {
  // 1. Check saved localStorage
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'evening-horizon' || saved === 'morning-horizon') {
    return saved;
  }
  // 2. Check system dark mode preference
  if (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'evening-horizon';
  }
  return 'morning-horizon';
};

const describe = (theme: SapHorizonTheme): ThemeState => ({
  theme,
  isDark: theme === 'evening-horizon',
  themeName:
    theme === 'evening-horizon' ? 'SAP Evening Horizon (Dark)' : 'SAP Morning Horizon (Light)'
});

class ThemeStore extends Store<ThemeState> {
  constructor() {
    super(describe(readInitialTheme()));
    this.applyToDocument();
    this.subscribe(() => this.applyToDocument());
  }

  setTheme(theme: SapHorizonTheme): void {
    this.setState(describe(theme));
  }

  toggleTheme(): void {
    this.setTheme(this.state.theme === 'morning-horizon' ? 'evening-horizon' : 'morning-horizon');
  }

  private applyToDocument(): void {
    const { theme, isDark } = this.state;
    const root = document.documentElement;

    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-sap-theme', 'sap_horizon_dark');
      root.setAttribute('data-theme', 'evening-horizon');
      document.body.classList.remove(...LIGHT_BODY_CLASSES);
      document.body.classList.add(...DARK_BODY_CLASSES);
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-sap-theme', 'sap_horizon');
      root.setAttribute('data-theme', 'morning-horizon');
      document.body.classList.remove(...DARK_BODY_CLASSES);
      document.body.classList.add(...LIGHT_BODY_CLASSES);
    }

    // Keep the UI5 Web Components runtime theme in sync with the app theme.
    void setUi5Theme(isDark ? 'sap_horizon_dark' : 'sap_horizon');

    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
}

export const themeStore = new ThemeStore();
