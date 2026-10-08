/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Application entry point. The UI5 runtime (theme assets + the global
 * stylesheet patch) must be ready before the first view renders, otherwise
 * custom elements would upgrade without the adopted stylesheet.
 */

import './index.css';
import { bootstrapUi5 } from './ui5/bootstrap';
import { appStore } from './stores/appStore';
import { backendStore } from './stores/backendStore';
import { themeStore } from './stores/themeStore';
import { i18nStore } from './stores/i18nStore';
import { AppView } from './views/AppView';

/**
 * Main application bootstrap coordinator.
 *
 * WHAT:
 * 1. Awaits `bootstrapUi5()` to register web components and shadow root style patches.
 * 2. Eagerly touches `themeStore` and `i18nStore` to apply persisted dark mode and language classes to `<html>`.
 * 3. Initializes `backendStore` and `appStore` listeners and initial document fetching.
 * 4. Mounts the root `AppView` floorplan into `#root`.
 *
 * WHY:
 * Awaiting UI5 runtime and evaluating persisted theme/locale stores before mounting any DOM elements
 * prevents flashes of unstyled content (FOUC), incorrect language labels, or mismatched dark mode transitions
 * during initial page load.
 */
const start = async (): Promise<void> => {
  await bootstrapUi5();

  // Touch the stores so their constructors apply the persisted theme/language
  // to the document before anything is painted.
  void themeStore.state;
  void i18nStore.state;

  backendStore.start();
  appStore.start();
  // Resume renewing the stored access token before it expires, so a reload does not abandon the
  // schedule and leave the session to lapse silently at the next expiry.
  appStore.initSession();

  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root container #root not found');
  }
  new AppView().mount(root);
};

void start();
