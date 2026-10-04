/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
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

/**
 * Escapes special HTML characters in a string or primitive value.
 *
 * WHAT: Replaces `&`, `<`, `>`, `"`, and `'` with their corresponding HTML entity equivalents.
 * WHY: Protects against cross-site scripting (XSS) when untrusted or backend-provided data
 * (such as document titles, user prompts, and summaries) is interpolated into HTML strings or attributes.
 *
 * @param value Raw value to sanitize.
 * @returns Sanitized string safe for HTML interpolation.
 */
export const esc = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]);

/**
 * Marks a string as trusted HTML that must bypass automatic escaping.
 *
 * WHAT: Wraps the string in an object marked with the unforgeable `RAW` Symbol.
 * WHY:
 * 1. Safe composition: Allows trusted template fragments (like SVG icons or nested `html` templates)
 *    to be composed together without double-escaping entity characters.
 * 2. Unforgeable branding: Using a private `Symbol('plib.raw')` ensures that malicious external JSON
 *    or input payloads cannot forge the brand.
 *
 * @param value Trusted HTML markup.
 * @returns RawHtml wrapper object.
 */
export const raw = (value: string): RawHtml => ({
  [RAW]: true,
  value,
  toString: () => value
});

/**
 * Type guard verifying whether an unknown value is a trusted `RawHtml` instance.
 *
 * WHAT: Checks that the input is a non-null object bearing the internal `RAW` Symbol brand.
 * WHY: Used by template compilers to differentiate between safe markup and unescaped user strings.
 *
 * @param value Value to check.
 * @returns True if value is an authentic RawHtml instance.
 */
export const isRawHtml = (value: unknown): value is RawHtml =>
  typeof value === 'object' && value !== null && (value as RawHtml)[RAW] === true;

/**
 * Normalizes and converts an interpolated template value to safe HTML markup.
 *
 * WHAT:
 * - Drops null, undefined, and booleans.
 * - Leaves `RawHtml` unescaped.
 * - Recursively flattens arrays (e.g. lists of rendered rows or badges).
 * - Automatically escapes everything else via `esc()`.
 * WHY: Mirrors React JSX interpolation semantics, allowing arrays and conditional expressions
 * (`condition && html\`...\``) to behave identically to declarative UI paradigms.
 *
 * @param value Value to stringify and sanitize.
 * @returns Sanitized HTML string.
 */
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

/**
 * Tagged template literal for generating sanitized HTML markup.
 *
 * WHAT: Assembles template strings and interpolated values into a trusted `RawHtml` token,
 * automatically sanitizing all interpolated values unless explicitly marked with `raw()`.
 * WHY: Eliminates virtual-DOM overhead and external framework dependencies while providing
 * first-class compile-time XSS protection and concise JSX-like templating syntax.
 *
 * @param strings Static template string chunks.
 * @param values Interpolated expressions.
 * @returns RawHtml token containing the assembled safe markup.
 */
export const html = (strings: TemplateStringsArray, ...values: unknown[]): RawHtml => {
  let out = strings[0];
  for (let i = 0; i < values.length; i += 1) {
    out += stringify(values[i]) + strings[i + 1];
  }
  return raw(out);
};

/**
 * Unwraps a `RawHtml` object or plain string into a final HTML string ready for `innerHTML`.
 *
 * WHAT: Extracts `.value` if input is `RawHtml`, otherwise returns the string directly.
 * WHY: Standardizes the boundary between template evaluation and DOM property assignment.
 *
 * @param value RawHtml token or plain string.
 * @returns Plain string suitable for innerHTML assignment.
 */
export const toMarkup = (value: RawHtml | string): string =>
  isRawHtml(value) ? value.value : value;

/**
 * Combines conditional CSS class names into a single normalized class string.
 *
 * WHAT: Accepts a list of class strings or falsy values, filters out falsy entries, and joins with spaces.
 * WHY: Simplifies dynamic Tailwind CSS styling by allowing concise conditional expressions
 * (e.g. `cx('btn', isActive && 'btn-active')`) without manual string concatenation.
 *
 * @param parts List of candidate class names or falsy conditional guards.
 * @returns Normalized space-delimited class string.
 */
export const cx = (...parts: Array<string | false | null | undefined>): string =>
  parts.filter(Boolean).join(' ');

/**
 * Conditionally generates a sanitized HTML attribute.
 *
 * WHAT:
 * - If value is null, undefined, false, or empty string: emits nothing.
 * - If value is true: emits the bare attribute name (e.g. `disabled`).
 * - Otherwise: emits `name="escapedValue"`.
 * WHY: Adheres strictly to the HTML5 boolean attribute specification (where presence implies true)
 * while ensuring dynamic attribute values are escaped to prevent attribute breakout vulnerabilities.
 *
 * @param name HTML attribute name.
 * @param value Attribute value or boolean flag.
 * @returns RawHtml attribute string or empty raw HTML.
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
