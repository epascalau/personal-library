/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Minimal, dependency-free HTML templating with automatic escaping.
 *
 * `html` behaves like JSX did in the previous React implementation: every
 * interpolated value is HTML-escaped unless it is explicitly wrapped in `raw()`
 * or is itself the result of a nested `html` call. This keeps backend-supplied
 * content (document titles, authors, summaries, chat answers) safe to inject.
 */

const RAW = Symbol('plib.raw');

export interface RawHtml {
  readonly [RAW]: true;
  readonly value: string;
  /** Lets a nested template be flattened with `String(...)` / `Array.join('')`. */
  toString(): string;
}

const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

/** Escapes a value for safe interpolation into HTML text or an attribute. */
export const esc = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);

/** Marks a string as already-safe HTML so `html` will not escape it. */
export const raw = (value: string): RawHtml => ({
  [RAW]: true,
  value,
  toString: () => value
});

export const isRawHtml = (value: unknown): value is RawHtml =>
  typeof value === 'object' && value !== null && (value as RawHtml)[RAW] === true;

const stringify = (value: unknown): string => {
  if (value === null || value === undefined || value === false || value === true) {
    return '';
  }
  if (isRawHtml(value)) {
    return value.value;
  }
  if (Array.isArray(value)) {
    return value.map(stringify).join('');
  }
  return esc(value);
};

export const html = (strings: TemplateStringsArray, ...values: unknown[]): RawHtml => {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) {
    out += stringify(values[i]) + strings[i + 1];
  }
  return raw(out);
};

/** Resolves a `RawHtml` or plain string into a markup string. */
export const toMarkup = (value: RawHtml | string): string =>
  isRawHtml(value) ? value.value : value;

/** Joins conditional class names, mirroring the previous `clsx`-style usage. */
export const cx = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ');

/**
 * Emits an attribute only when the value is present, e.g.
 * `<ui5-input ${attr('value', doc.title)}>`.
 */
export const attr = (name: string, value: unknown): RawHtml => {
  if (value === null || value === undefined || value === false || value === '') {
    return raw('');
  }
  if (value === true) {
    return raw(name);
  }
  return raw(`${name}="${esc(value)}"`);
};
