/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Icon registry. The React implementation used `lucide-react`; each icon it
 * referenced is mapped here onto the closest SAP icon so the visual language
 * stays consistent with the rest of the Fiori shell.
 *
 * Only the icons actually used are imported, which keeps the bundle far
 * smaller than pulling in `AllIcons.js`.
 */

import '@ui5/webcomponents-icons/dist/accept.js';
import '@ui5/webcomponents-icons/dist/action.js';
import '@ui5/webcomponents-icons/dist/activity-2.js';
import '@ui5/webcomponents-icons/dist/activity-items.js';
import '@ui5/webcomponents-icons/dist/add.js';
import '@ui5/webcomponents-icons/dist/ai.js';
import '@ui5/webcomponents-icons/dist/alert.js';
import '@ui5/webcomponents-icons/dist/attachment.js';
import '@ui5/webcomponents-icons/dist/bar-chart.js';
import '@ui5/webcomponents-icons/dist/calendar.js';
import '@ui5/webcomponents-icons/dist/chain-link.js';
import '@ui5/webcomponents-icons/dist/clear-filter.js';
import '@ui5/webcomponents-icons/dist/comment.js';
import '@ui5/webcomponents-icons/dist/copy.js';
import '@ui5/webcomponents-icons/dist/course-book.js';
import '@ui5/webcomponents-icons/dist/dark-mode.js';
import '@ui5/webcomponents-icons/dist/database.js';
import '@ui5/webcomponents-icons/dist/decline.js';
import '@ui5/webcomponents-icons/dist/delete.js';
import '@ui5/webcomponents-icons/dist/discussion.js';
import '@ui5/webcomponents-icons/dist/document-text.js';
import '@ui5/webcomponents-icons/dist/download.js';
import '@ui5/webcomponents-icons/dist/energy-saving-lightbulb.js';
import '@ui5/webcomponents-icons/dist/excel-attachment.js';
import '@ui5/webcomponents-icons/dist/explorer.js';
import '@ui5/webcomponents-icons/dist/filter.js';
import '@ui5/webcomponents-icons/dist/globe.js';
import '@ui5/webcomponents-icons/dist/hint.js';
import '@ui5/webcomponents-icons/dist/history.js';
import '@ui5/webcomponents-icons/dist/home.js';
import '@ui5/webcomponents-icons/dist/information.js';
import '@ui5/webcomponents-icons/dist/inventory.js';
import '@ui5/webcomponents-icons/dist/it-host.js';
import '@ui5/webcomponents-icons/dist/it-system.js';
import '@ui5/webcomponents-icons/dist/key.js';
import '@ui5/webcomponents-icons/dist/less.js';
import '@ui5/webcomponents-icons/dist/light-mode.js';
import '@ui5/webcomponents-icons/dist/locked.js';
import '@ui5/webcomponents-icons/dist/log.js';
import '@ui5/webcomponents-icons/dist/media-forward.js';
import '@ui5/webcomponents-icons/dist/media-rewind.js';
import '@ui5/webcomponents-icons/dist/message-error.js';
import '@ui5/webcomponents-icons/dist/message-information.js';
import '@ui5/webcomponents-icons/dist/message-success.js';
import '@ui5/webcomponents-icons/dist/message-warning.js';
import '@ui5/webcomponents-icons/dist/nav-back.js';
import '@ui5/webcomponents-icons/dist/navigation-down-arrow.js';
import '@ui5/webcomponents-icons/dist/navigation-right-arrow.js';
import '@ui5/webcomponents-icons/dist/navigation-up-arrow.js';
import '@ui5/webcomponents-icons/dist/official-service.js';
import '@ui5/webcomponents-icons/dist/org-chart.js';
import '@ui5/webcomponents-icons/dist/overlay.js';
import '@ui5/webcomponents-icons/dist/paper-plane.js';
import '@ui5/webcomponents-icons/dist/pending.js';
import '@ui5/webcomponents-icons/dist/person-placeholder.js';
import '@ui5/webcomponents-icons/dist/ppt-attachment.js';
import '@ui5/webcomponents-icons/dist/refresh.js';
import '@ui5/webcomponents-icons/dist/search.js';
import '@ui5/webcomponents-icons/dist/settings.js';
import '@ui5/webcomponents-icons/dist/shield.js';
import '@ui5/webcomponents-icons/dist/slim-arrow-down.js';
import '@ui5/webcomponents-icons/dist/slim-arrow-left.js';
import '@ui5/webcomponents-icons/dist/slim-arrow-right.js';
import '@ui5/webcomponents-icons/dist/slim-arrow-up.js';
import '@ui5/webcomponents-icons/dist/sort-ascending.js';
import '@ui5/webcomponents-icons/dist/sort-descending.js';
import '@ui5/webcomponents-icons/dist/sort.js';
import '@ui5/webcomponents-icons/dist/source-code.js';
import '@ui5/webcomponents-icons/dist/synchronize.js';
import '@ui5/webcomponents-icons/dist/sys-enter-2.js';
import '@ui5/webcomponents-icons/dist/sys-help.js';
import '@ui5/webcomponents-icons/dist/syntax.js';
import '@ui5/webcomponents-icons/dist/tags.js';
import '@ui5/webcomponents-icons/dist/undo.js';
import '@ui5/webcomponents-icons/dist/upload.js';
import '@ui5/webcomponents-icons/dist/user-settings.js';

import { html, RawHtml } from '../core/html';

/**
 * Maps the former `lucide-react` icon names onto SAP icon names so the call
 * sites migrated from JSX stay readable and reviewable side by side.
 */
export const Icons = {
  Activity: 'activity-2',
  AlertCircle: 'message-error',
  AlertTriangle: 'alert',
  Archive: 'inventory',
  ArrowDown: 'navigation-down-arrow',
  ArrowRight: 'navigation-right-arrow',
  ArrowUp: 'navigation-up-arrow',
  ArrowUpDown: 'sort',
  BarChart3: 'bar-chart',
  BookOpen: 'course-book',
  Bot: 'ai',
  Calendar: 'calendar',
  Check: 'accept',
  CheckCircle: 'sys-enter-2',
  CheckCircle2: 'sys-enter-2',
  ChevronDown: 'slim-arrow-down',
  ChevronLeft: 'slim-arrow-left',
  ChevronRight: 'slim-arrow-right',
  ChevronUp: 'slim-arrow-up',
  ChevronsLeft: 'media-rewind',
  ChevronsRight: 'media-forward',
  ClipboardList: 'activity-items',
  Clock: 'pending',
  Compass: 'explorer',
  Copy: 'copy',
  Cpu: 'it-system',
  Database: 'database',
  Download: 'download',
  ExternalLink: 'action',
  FileCheck: 'document-text',
  FileCode: 'syntax',
  FileCode2: 'source-code',
  FileSpreadsheet: 'excel-attachment',
  FileText: 'document-text',
  Filter: 'filter',
  FilterClear: 'clear-filter',
  GitBranch: 'org-chart',
  Globe: 'globe',
  HardDrive: 'database',
  Help: 'sys-help',
  History: 'history',
  Home: 'home',
  Info: 'information',
  Key: 'key',
  Layers: 'overlay',
  Loader2: 'synchronize',
  Lock: 'locked',
  Log: 'log',
  LogOut: 'log',
  Minus: 'less',
  Moon: 'dark-mode',
  NavBack: 'nav-back',
  Network: 'chain-link',
  Paperclip: 'attachment',
  Plus: 'add',
  Presentation: 'ppt-attachment',
  Quote: 'comment',
  Radio: 'discussion',
  RefreshCw: 'refresh',
  RotateCw: 'synchronize',
  Scale: 'official-service',
  Search: 'search',
  Send: 'paper-plane',
  Server: 'it-host',
  Settings: 'settings',
  ShieldCheck: 'shield',
  Sparkles: 'ai',
  Sun: 'light-mode',
  Tag: 'tags',
  Trash2: 'delete',
  Upload: 'upload',
  User: 'person-placeholder',
  UserSettings: 'user-settings',
  X: 'decline',
  Zap: 'energy-saving-lightbulb'
} as const;

export type IconKey = keyof typeof Icons;

export interface IconOptions {
  /** Tailwind classes, mirroring the former `className="w-4 h-4 ..."` usage. */
  className?: string;
  /** Rendered as `accessible-name`; omit for purely decorative icons. */
  label?: string;
  /**
   * Target slot on the hosting UI5 component, e.g. `icon` on `ui5-input`.
   * Without it the icon lands in the host's default slot, which for
   * `ui5-input` is `suggestionItems` rather than the decorative icon area.
   */
  slot?: string;
}

/**
 * Renders an accessible SAP UI5 icon mapped from familiar Lucide icon aliases.
 *
 * WHAT:
 * Emits a `<ui5-icon>` custom element referencing the mapped SAP icon name, applying specified CSS classes
 * and assigning either `accessible-name` for screen-reader announced icons or `aria-hidden="true"` for decorative icons.
 *
 * WHY:
 * 1. Tree-shaking: Importing individual icons rather than `AllIcons.js` saves several hundred kilobytes in bundle size.
 * 2. Visual consistency: Maps familiar Lucide naming onto the enterprise SAP Fiori icon set, matching enterprise aesthetics.
 * 3. Accessibility: Automatic `aria-hidden="true"` prevents screen readers from redundantly announcing decorative icons.
 *
 * @param key Semantic icon key defined in `Icons` map.
 * @param options Styling and accessibility parameters.
 * @returns RawHtml markup representing the UI5 icon.
 */
export const icon = (key: IconKey, options: IconOptions = {}): RawHtml => {
  const { className = 'w-4 h-4', label, slot } = options;
  return html`<ui5-icon
    name="${Icons[key]}"
    class="${className}"
    ${slot ? html`slot="${slot}"` : ''}
    ${label ? html`accessible-name="${label}"` : html`aria-hidden="true"`}
  ></ui5-icon>`;
};
