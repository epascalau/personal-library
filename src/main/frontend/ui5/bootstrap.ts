/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Registers every UI5 Web Component used by the application and prepares the
 * runtime (theme assets + the global stylesheet patch) before the first view
 * is rendered.
 */

// Theme parameters for sap_horizon AND sap_horizon_dark. Without this only the
// default theme is registered and `setTheme('sap_horizon_dark')` is a no-op.
import '@ui5/webcomponents/dist/Assets.js';
import '@ui5/webcomponents-fiori/dist/Assets.js';

// Base components
import '@ui5/webcomponents/dist/Avatar.js';
import '@ui5/webcomponents/dist/BusyIndicator.js';
import '@ui5/webcomponents/dist/Button.js';
import '@ui5/webcomponents/dist/Card.js';
import '@ui5/webcomponents/dist/CardHeader.js';
import '@ui5/webcomponents/dist/CheckBox.js';
import '@ui5/webcomponents/dist/Dialog.js';
import '@ui5/webcomponents/dist/FileUploader.js';
import '@ui5/webcomponents/dist/Icon.js';
import '@ui5/webcomponents/dist/Input.js';
import '@ui5/webcomponents/dist/Label.js';
import '@ui5/webcomponents/dist/Link.js';
import '@ui5/webcomponents/dist/List.js';
import '@ui5/webcomponents/dist/ListItemStandard.js';
import '@ui5/webcomponents/dist/MessageStrip.js';
import '@ui5/webcomponents/dist/Option.js';
import '@ui5/webcomponents/dist/Panel.js';
import '@ui5/webcomponents/dist/Popover.js';
import '@ui5/webcomponents/dist/ProgressIndicator.js';
import '@ui5/webcomponents/dist/RadioButton.js';
import '@ui5/webcomponents/dist/SegmentedButton.js';
import '@ui5/webcomponents/dist/SegmentedButtonItem.js';
import '@ui5/webcomponents/dist/Select.js';
import '@ui5/webcomponents/dist/Switch.js';
import '@ui5/webcomponents/dist/Tab.js';
import '@ui5/webcomponents/dist/TabContainer.js';
import '@ui5/webcomponents/dist/Table.js';
import '@ui5/webcomponents/dist/TableCell.js';
import '@ui5/webcomponents/dist/TableHeaderCell.js';
import '@ui5/webcomponents/dist/TableHeaderRow.js';
import '@ui5/webcomponents/dist/TableRow.js';
import '@ui5/webcomponents/dist/Tag.js';
import '@ui5/webcomponents/dist/Text.js';
import '@ui5/webcomponents/dist/TextArea.js';
import '@ui5/webcomponents/dist/Title.js';
import '@ui5/webcomponents/dist/Toolbar.js';
import '@ui5/webcomponents/dist/ToolbarButton.js';

// Fiori components
import '@ui5/webcomponents-fiori/dist/IllustratedMessage.js';
import '@ui5/webcomponents-fiori/dist/ShellBar.js';
import '@ui5/webcomponents-fiori/dist/ShellBarItem.js';
import '@ui5/webcomponents-fiori/dist/ShellBarSpacer.js';
import '@ui5/webcomponents-fiori/dist/illustrations/NoData.js';
import '@ui5/webcomponents-fiori/dist/illustrations/NoEntries.js';
import '@ui5/webcomponents-fiori/dist/illustrations/UnableToLoad.js';

// Icon registry (side-effect imports + the `icon()` helper)
import './icons';

import { applyGlobalStylesheetPatch, loadGlobalStylesheet } from './globalStylesheet';

let bootstrapped: Promise<void> | null = null;

/**
 * Must run before any UI5 element is created so that `_initShadowRoot` is
 * already patched for the very first component instance.
 */
export const bootstrapUi5 = (): Promise<void> => {
  if (!bootstrapped) {
    applyGlobalStylesheetPatch();
    bootstrapped = loadGlobalStylesheet().catch((err) => {
      // A missing global stylesheet must not take the whole application down;
      // UI5 falls back to its stock Horizon styling.
      console.error('[personal-library] Failed to load the global stylesheet', err);
    });
  }
  return bootstrapped;
};
