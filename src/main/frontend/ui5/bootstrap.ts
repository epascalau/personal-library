/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Registers the UI5 Web Components used by the application and prepares the
 * runtime (theme assets + the global stylesheet patch) before the first view
 * is rendered.
 */

// Opt out of UI5's built-in font loading. By default UI5 injects a <style>
// block whose @font-face rules fetch the SAP "72" font from
// cdn.jsdelivr.net at runtime. We keep everything first-party, so the CDN
// fetch is disabled here and the same font is self-hosted from the locally
// installed @sap-theming/theming-base-content package (see sapFonts.css).
// This must run before any component renders, hence the import order.
import { setDefaultFontLoading } from '@ui5/webcomponents-base/dist/config/Fonts.js';

setDefaultFontLoading(false);

import './sapFonts.css';

// Theme parameters for sap_horizon AND sap_horizon_dark. Without this only the
// default theme is registered and `setTheme('sap_horizon_dark')` is a no-op.
import '@ui5/webcomponents/dist/Assets.js';
import '@ui5/webcomponents-fiori/dist/Assets.js';

// Base components
import '@ui5/webcomponents/dist/Avatar.js';
import '@ui5/webcomponents/dist/Button.js';
import '@ui5/webcomponents/dist/Dialog.js';
import '@ui5/webcomponents/dist/FileUploader.js';
import '@ui5/webcomponents/dist/Icon.js';
import '@ui5/webcomponents/dist/Input.js';
import '@ui5/webcomponents/dist/Label.js';
import '@ui5/webcomponents/dist/Option.js';
import '@ui5/webcomponents/dist/Popover.js';
import '@ui5/webcomponents/dist/ProgressIndicator.js';
import '@ui5/webcomponents/dist/Select.js';
import '@ui5/webcomponents/dist/Table.js';
import '@ui5/webcomponents/dist/TableCell.js';
import '@ui5/webcomponents/dist/TableHeaderCell.js';
import '@ui5/webcomponents/dist/TableHeaderRow.js';
import '@ui5/webcomponents/dist/TableRow.js';
import '@ui5/webcomponents/dist/TableRowAction.js';
import '@ui5/webcomponents/dist/Text.js';
import '@ui5/webcomponents/dist/TextArea.js';
import '@ui5/webcomponents/dist/Title.js';

// Fiori components
import '@ui5/webcomponents-fiori/dist/IllustratedMessage.js';
import '@ui5/webcomponents-fiori/dist/ShellBar.js';
import '@ui5/webcomponents-fiori/dist/ShellBarBranding.js';
import '@ui5/webcomponents-fiori/dist/ShellBarSpacer.js';
import '@ui5/webcomponents-fiori/dist/illustrations/NoEntries.js';
import '@ui5/webcomponents-fiori/dist/illustrations/NoFilterResults.js';
import '@ui5/webcomponents-fiori/dist/illustrations/UnableToLoad.js';

// Icon registry (side-effect imports + the `icon()` helper)
import './icons';

import { applyGlobalStylesheetPatch, loadGlobalStylesheet } from './globalStylesheet';

let bootstrapped: Promise<void> | null = null;

/**
 * Bootstraps the SAP UI5 Web Components runtime and attaches global style patches.
 *
 * WHAT:
 * 1. Invokes `applyGlobalStylesheetPatch()` to intercept UI5's internal `_initShadowRoot` prototype.
 * 2. Asynchronously fetches and compiles the enterprise theme stylesheet via `loadGlobalStylesheet()`.
 * 3. Caches the resulting initialization Promise so redundant invocations return the same singleton.
 *
 * WHY:
 * UI5 Web Components isolate their DOM inside Shadow Roots. Applying the shadow root patch before
 * any UI5 custom elements are parsed or created ensures that enterprise styling (e.g. typography,
 * dark theme overrides, custom focus outlines) is injected into every shadow root from the very
 * first element without style flash (FOUC). Wrapping in a singleton Promise prevents duplicate
 * network fetches when called from both `main.ts` and test harnesses.
 *
 * @returns Promise that resolves when UI5 styling is ready.
 */
export const bootstrapUi5 = (): Promise<void> => {
  if (!bootstrapped) {
    applyGlobalStylesheetPatch();
    bootstrapped = loadGlobalStylesheet().catch((err) => {
      // A missing global stylesheet must not take the whole application down;
      // UI5 falls back to its default styling.
      console.error('[personal-library] Failed to load the global stylesheet', err);
    });
  }
  return bootstrapped;
};
