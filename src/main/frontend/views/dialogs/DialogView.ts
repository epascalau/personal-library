/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared base for every modal that used to be a hand-rolled
 * `fixed inset-0 z-50 … bg-black/40` overlay in the React implementation.
 *
 * `ui5-dialog` takes over the overlay, focus trap, `Escape` handling and
 * scroll locking, while the original Tailwind markup moves unchanged into the
 * `header`, default and `footer` slots. Shadow internals (`.ui5-popup-root`
 * and friends) are themed through `plib-dialog` in the global stylesheet.
 */

import { Component } from '../../core/component';
import { RawHtml } from '../../core/html';
import type Dialog from '@ui5/webcomponents/dist/Dialog.js';

export abstract class DialogView<P = void> extends Component<P> {
  constructor(props: P, className = 'plib-dialog') {
    super(props, 'ui5-dialog', className);
  }

  protected get dialog(): Dialog {
    return this.el as unknown as Dialog;
  }

  /** Drives the `open` property; the counterpart of the former `isOpen` prop. */
  protected abstract isOpen(): boolean;

  /** Invoked for `Escape`, the backdrop and any `data-action="close"` control. */
  protected abstract requestClose(): void;

  /**
   * Set to `false` while a request is in flight so the dialog cannot be
   * dismissed mid-operation, mirroring the `disabled={deleting}` props.
   */
  protected canClose(): boolean {
    return true;
  }

  protected abstract body(): RawHtml | string;

  protected template(): RawHtml | string {
    return this.isOpen() ? this.body() : '';
  }

  protected onMount(): void {
    // UI5 fires `close` for Escape and backdrop clicks; reopening immediately
    // would fight the animation, so a blocked close re-opens on the next frame.
    this.el.addEventListener('close', this.handleNativeClose);
    this.track(() => this.el.removeEventListener('close', this.handleNativeClose));
  }

  private readonly handleNativeClose = (): void => {
    if (!this.isOpen()) {
      return;
    }
    if (!this.canClose()) {
      requestAnimationFrame(() => {
        this.dialog.open = true;
      });
      return;
    }
    this.requestClose();
  };

  protected afterRender(): void {
    this.dialog.open = this.isOpen();
    this.onAll('[data-action="close"]', 'click', () => {
      if (this.canClose()) {
        this.requestClose();
      }
    });
    this.bind();
  }

  /** Dialog-specific event wiring; runs after every render. */
  protected bind(): void {
    // optional
  }
}
