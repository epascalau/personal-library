/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Inline SVG flags for the language switcher.
 *
 * `LanguageInfo.flag` holds a regional-indicator emoji, which Windows browsers
 * render as bare letters ("US", "DE", …) because the platform ships no flag
 * emoji font. Drawing the flags as SVG guarantees an identical, crisp result
 * on every platform while keeping the emoji as the accessible label.
 */

import { html, RawHtml, raw } from '../core/html';
import type { SupportedLanguage } from '../i18n/types';

const VIEW_BOX = '0 0 24 16';

/** Horizontal tricolour, top to bottom. */
const horizontal = (top: string, middle: string, bottom: string): string => `
  <rect width="24" height="16" fill="${middle}" />
  <rect width="24" height="5.3333" y="0" fill="${top}" />
  <rect width="24" height="5.3333" y="10.6667" fill="${bottom}" />
`;

/** Vertical tricolour, left to right. */
const vertical = (left: string, middle: string, right: string): string => `
  <rect width="24" height="16" fill="${middle}" />
  <rect width="8" height="16" x="0" fill="${left}" />
  <rect width="8" height="16" x="16" fill="${right}" />
`;

/** Simplified Stars and Stripes: 13 stripes plus the union canton. */
const unitedStates = (): string => {
  const stripeHeight = 16 / 13;
  const stripes = Array.from({ length: 13 }, (_, index) =>
    index % 2 === 0
      ? `<rect width="24" height="${stripeHeight}" y="${index * stripeHeight}" fill="#b22234" />`
      : ''
  ).join('');

  const starRows = 4;
  const starColumns = 5;
  const stars = Array.from({ length: starRows }, (_, row) =>
    Array.from({ length: starColumns }, (_, column) => {
      const cx = 1.1 + column * 1.85;
      const cy = 1.2 + row * 1.95;
      return `<circle cx="${cx}" cy="${cy}" r="0.42" fill="#ffffff" />`;
    }).join('')
  ).join('');

  return `
    <rect width="24" height="16" fill="#ffffff" />
    ${stripes}
    <rect width="9.6" height="${stripeHeight * 7}" fill="#3c3b6e" />
    ${stars}
  `;
};

/** Spain: 1:2:1 horizontal bands with the gold band doubled in height. */
const spain = (): string => `
  <rect width="24" height="16" fill="#ffc400" />
  <rect width="24" height="4" y="0" fill="#aa151b" />
  <rect width="24" height="4" y="12" fill="#aa151b" />
`;

const FLAG_SHAPES: Record<SupportedLanguage, () => string> = {
  en: unitedStates,
  de: () => horizontal('#000000', '#dd0000', '#ffce00'),
  fr: () => vertical('#002395', '#ffffff', '#ed2939'),
  es: spain,
  ro: () => vertical('#002b7f', '#fcd116', '#ce1126')
};

export interface FlagOptions {
  /** Tailwind sizing/spacing classes for the rendered flag. */
  className?: string;
  /** Accessible label; omit for decorative use next to a visible language name. */
  label?: string;
}

/**
 * Renders the flag for a language as an inline SVG with a subtle border, so it
 * stays visible against both the light and the dark Horizon surfaces.
 */
export const flag = (code: SupportedLanguage, options: FlagOptions = {}): RawHtml => {
  const { className = 'w-4 h-3', label } = options;
  const shape = FLAG_SHAPES[code];
  if (!shape) {
    return html``;
  }

  return html`<svg
    viewBox="${VIEW_BOX}"
    class="${className} inline-block shrink-0 rounded-[2px] ring-1 ring-black/15 dark:ring-white/25"
    preserveAspectRatio="none"
    role="${label ? 'img' : 'presentation'}"
    ${label ? html`aria-label="${label}"` : raw('aria-hidden="true"')}
  >
    ${raw(shape())}
  </svg>`;
};
