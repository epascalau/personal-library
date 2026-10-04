/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Pierces the UI5 Web Components shadow DOM with a single shared stylesheet so
 * the application's enterprise theming (see public/styles.css) applies to the
 * internals of every UI5 element as well as to the light DOM.
 */

import UI5Element from '@ui5/webcomponents-base/dist/UI5Element.js';

type MutableState = Record<string, unknown>;

/** The one global stylesheet instance shared by the document and every shadow root. */
export const globalStylesheet = new CSSStyleSheet();

/**
 * A few components rebuild their shadow root content in ways that bypass
 * `adoptedStyleSheets`, so they still need the legacy `<style>` tag approach.
 */
const tagsRequiringStyleTagSet = new Set(['UI5-BUSY-INDICATOR', 'UI5-SLIDER']);

export const GLOBAL_STYLESHEET_URL = '/styles.css';

const importText = `@import url('${GLOBAL_STYLESHEET_URL}');`;

const STYLE_TAG_KEY = '__plibStyleTag';
const CALLBACK_KEY = '__plibAttachStyleCallback';

/**
 * Injects a fallback `<style>` tag into elements that bypass `adoptedStyleSheets`.
 *
 * WHAT: Creates a `<style>` element containing an `@import` rule and appends it to the component's shadow root.
 * WHY: Certain complex custom elements (like `ui5-busy-indicator` or `ui5-slider`) reset or isolate their inner shadow DOM
 * dynamically, requiring an inline style tag rather than purely relying on `adoptedStyleSheets`.
 */
const attachStylesTag = function (this: UI5Element) {
  const state = this._state as unknown as MutableState;
  if (this.shadowRoot && !state[STYLE_TAG_KEY]) {
    const style = document.createElement('style');
    style.textContent = importText;
    state[STYLE_TAG_KEY] = style;
    this.shadowRoot.appendChild(style);
  }
};

/**
 * Ensures the style tag injection callback is registered for elements in `tagsRequiringStyleTagSet`.
 *
 * WHAT: Attaches `attachStylesTag` to the component's state-finalized lifecycle hook if not already registered.
 * WHY: Registering in the finalized lifecycle stage guarantees that the shadow root DOM has been generated
 * before the `<style>` tag is inserted.
 */
const ensureStyleTagCallback = function (this: UI5Element) {
  const state = this._state as unknown as MutableState;
  if (tagsRequiringStyleTagSet.has(this.tagName) && !state[CALLBACK_KEY]) {
    const fn = attachStylesTag.bind(this);
    state[CALLBACK_KEY] = fn;
    this.attachComponentStateFinalized(fn);
  }
};

let patchApplied = false;

/**
 * Monkey-patches UI5Element prototype lifecycle hooks to pierce Web Component shadow DOM trees.
 *
 * WHAT:
 * 1. Adopts `globalStylesheet` into `document.adoptedStyleSheets`.
 * 2. Intercepts `onAfterRendering` to adopt `globalStylesheet` into each component's `shadowRoot.adoptedStyleSheets`.
 * 3. Patches `_initShadowRoot`, `onEnterDOM`, and `onExitDOM` to safely inject and clean up style tags for edge-case elements.
 *
 * WHY:
 * UI5 Web Components encapsulate their styles in Shadow Roots, which ignores document-level Tailwind CSS by default.
 * Monkey-patching the UI5Element base prototype applies enterprise theming uniformly across all custom element
 * shadow roots without modifying third-party vendor bundles, and detaching sheets on `onExitDOM` prevents memory leaks
 * from retaining detached DOM nodes in memory.
 */
export const applyGlobalStylesheetPatch = (): void => {
  if (patchApplied) {
    return;
  }
  patchApplied = true;

  // add it to global document
  if (document.adoptedStyleSheets && !document.adoptedStyleSheets.includes(globalStylesheet)) {
    document.adoptedStyleSheets.splice(0, 0, globalStylesheet);
  }

  // apply this onAfterRendering
  const origOnAfterRendering = UI5Element.prototype.onAfterRendering;
  UI5Element.prototype.onAfterRendering = function (...args) {
    origOnAfterRendering.apply(this, args);
    // a component can still render after it left the DOM, re-adopting the sheet there would undo
    // the cleanup in onExitDOM and let the global sheet pin the detached shadow root
    if (!this.isConnected) {
      return;
    }
    // append this instance to all adoptedStyleSheets if not already existing
    if (this.shadowRoot?.adoptedStyleSheets && !this.shadowRoot.adoptedStyleSheets.includes(globalStylesheet)) {
      this.shadowRoot.adoptedStyleSheets.splice(0, 0, globalStylesheet);
    }
  };

  // _initShadowRoot fires before UI5Element's first render, so the style must already be attached at that point
  const origInitShadowRoot = UI5Element.prototype._initShadowRoot;
  UI5Element.prototype._initShadowRoot = function (...args) {
    origInitShadowRoot.apply(this, args);
    // add this logic only to defined list of element tags
    ensureStyleTagCallback.call(this);
  };

  // onEnterDOM only re-attaches for repeated exit/enter cycles, since _initShadowRoot runs only once per instance
  const origOnEnterDOM = UI5Element.prototype.onEnterDOM;
  UI5Element.prototype.onEnterDOM = function (...args) {
    origOnEnterDOM.apply(this, args);
    ensureStyleTagCallback.call(this);
  };

  // also add the corresponding cleanup
  const origOnExitDOM = UI5Element.prototype.onExitDOM;
  UI5Element.prototype.onExitDOM = function (...args) {
    const state = this._state as unknown as MutableState;
    if (tagsRequiringStyleTagSet.has(this.tagName)) {
      const fn = state[CALLBACK_KEY];
      if (fn) {
        this.detachComponentStateFinalized(fn as () => void);
      }
      delete state[CALLBACK_KEY];

      // remove the manually created style tag itself, otherwise it leaks as a detached DOM node
      (state[STYLE_TAG_KEY] as HTMLStyleElement | undefined)?.remove();
      delete state[STYLE_TAG_KEY];
    }

    let index = 0;
    // remove global instance again to avoid global link of all shadow roots
    while (index !== -1) {
      index = this.shadowRoot?.adoptedStyleSheets?.findIndex((s) => s === globalStylesheet) ?? -1;
      if (index !== -1) {
        this.shadowRoot?.adoptedStyleSheets.splice(index, 1);
      }
    }

    origOnExitDOM.apply(this, args);
  };
};

/**
 * Asynchronously downloads the enterprise CSS stylesheet and populates `globalStylesheet`.
 *
 * WHAT: Fetches CSS text from `url` (defaults to `/styles.css`) and calls `globalStylesheet.replaceSync(css)`.
 * WHY: Using `replaceSync` on a constructed `CSSStyleSheet` instantly updates styles across the document
 * and all participating shadow roots simultaneously in a single atomic browser paint.
 *
 * @param url URL to fetch CSS rules from.
 * @returns Promise that resolves when the stylesheet has been updated.
 */
export const loadGlobalStylesheet = async (url = GLOBAL_STYLESHEET_URL): Promise<void> => {
  const css = await (await fetch(url)).text();
  globalStylesheet.replaceSync(css);
};
