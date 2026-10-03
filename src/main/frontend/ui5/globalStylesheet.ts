/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pierces the UI5 Web Components shadow DOM with a single shared stylesheet so
 * the application's SAP Horizon theming (see public/styles.css) applies to the
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

const attachStylesTag = function (this: UI5Element) {
  const state = this._state as unknown as MutableState;
  if (this.shadowRoot && !state[STYLE_TAG_KEY]) {
    const style = document.createElement('style');
    style.textContent = importText;
    state[STYLE_TAG_KEY] = style;
    this.shadowRoot.appendChild(style);
  }
};

const ensureStyleTagCallback = function (this: UI5Element) {
  const state = this._state as unknown as MutableState;
  if (tagsRequiringStyleTagSet.has(this.tagName) && !state[CALLBACK_KEY]) {
    const fn = attachStylesTag.bind(this);
    state[CALLBACK_KEY] = fn;
    this.attachComponentStateFinalized(fn);
  }
};

let patchApplied = false;

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
 * async retrieval of styles and update of the global stylesheet instance
 */
export const loadGlobalStylesheet = async (url = GLOBAL_STYLESHEET_URL): Promise<void> => {
  const css = await (await fetch(url)).text();
  globalStylesheet.replaceSync(css);
};
