/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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

const start = async (): Promise<void> => {
  await bootstrapUi5();

  // Touch the stores so their constructors apply the persisted theme/language
  // to the document before anything is painted.
  void themeStore.state;
  void i18nStore.state;

  backendStore.start();
  appStore.start();

  const root = document.getElementById('root');
  if (!root) {
    throw new Error('Root container #root not found');
  }
  new AppView().mount(root);
};

void start();
