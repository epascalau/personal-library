/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Vanilla replacement for `context/ThemeContext.tsx`. Keeps the exact same
 * localStorage key, the same `<html>` attributes/classes and the same body
 * background classes, and additionally drives the UI5 Web Components theme.
 */

import { setTheme as setUi5Theme } from '@ui5/webcomponents-base/dist/config/Theme.js';
import { Store } from '../core/store';

export type SapTheme = 'light' | 'dark';
export type AppTheme = SapTheme;
export type SapHorizonTheme = SapTheme;

export interface ThemeState {
  theme: SapTheme;
  isDark: boolean;
  themeName: string;
}

const THEME_STORAGE_KEY = 'personal_library_sap_theme';

const LIGHT_BODY_CLASSES = ['bg-[#f5f6f8]', 'text-[#1d2d3e]'];
const DARK_BODY_CLASSES = ['bg-[#12171c]', 'text-[#f0f4f8]'];

const readInitialTheme = (): SapTheme => {
  // 1. Check saved localStorage
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  if (saved === 'dark' || saved === 'evening-horizon') {
    return 'dark';
  }
  if (saved === 'light' || saved === 'morning-horizon') {
    return 'light';
  }
  // 2. Check system dark mode preference
  if (
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }
  return 'light';
};

const describe = (theme: SapTheme): ThemeState => ({
  theme,
  isDark: theme === 'dark',
  themeName: theme === 'dark' ? 'Dark Theme' : 'Light Theme'
});

class ThemeStore extends Store<ThemeState> {
  /**
   * Initializes the theme store with persisted or system preferences and synchronizes the DOM.
   *
   * WHAT: Resolves initial theme from `localStorage` or `prefers-color-scheme`, applies CSS classes
   * and attributes to document elements, and subscribes to self to keep the DOM in sync on every change.
   * WHY: Immediate synchronous DOM application prevents "flash of unstyled content" (FOUC)
   * on initial application load.
   */
  constructor() {
    super(describe(readInitialTheme()));
    this.applyToDocument();
    this.subscribe(() => this.applyToDocument());
  }

  /**
   * Sets the active UI theme.
   *
   * WHAT: Updates state with the new theme and derived `isDark` boolean.
   * WHY: Triggers subscriber notifications and downstream `applyToDocument()` updates.
   *
   * @param theme 'light' or 'dark'.
   */
  setTheme(theme: SapTheme): void {
    this.setState(describe(theme));
  }

  /**
   * Toggles between Light and Dark theme.
   *
   * WHAT: Flips current theme state to the alternate mode.
   * WHY: Provides a seamless single-click theme switcher in the ShellBar.
   */
  toggleTheme(): void {
    this.setTheme(this.state.theme === 'light' ? 'dark' : 'light');
  }

  /**
   * Synchronizes active theme styling across the DOM, Tailwind CSS, and UI5 Web Components runtime.
   *
   * WHAT:
   * 1. Updates HTML root class (`dark` for Tailwind dark mode styling).
   * 2. Sets `data-sap-theme` and `data-theme` attributes on `<html>`.
   * 3. Sets CSS `color-scheme` property for native browser widgets (scrollbars, form inputs).
   * 4. Updates document body background classes.
   * 5. Calls UI5 Web Components `setTheme('sap_horizon' | 'sap_horizon_dark')`.
   * 6. Persists choice to `localStorage`.
   *
   * WHY: The application combines Tailwind CSS utility classes with official SAP UI5 Web Components.
   * A single unified method guarantees that both UI styling engines and native browser controls
   * switch color palettes simultaneously with zero visual dissonance.
   */
  private applyToDocument(): void {
    const { theme, isDark } = this.state;
    const root = document.documentElement;

    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-sap-theme', 'sap_horizon_dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
      document.body.classList.remove(...LIGHT_BODY_CLASSES);
      document.body.classList.add(...DARK_BODY_CLASSES);
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-sap-theme', 'sap_horizon');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
      document.body.classList.remove(...DARK_BODY_CLASSES);
      document.body.classList.add(...LIGHT_BODY_CLASSES);
    }

    // Keep the UI5 Web Components runtime theme in sync with the app theme.
    void setUi5Theme(isDark ? 'sap_horizon_dark' : 'sap_horizon');

    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }
}

export const themeStore = new ThemeStore();
