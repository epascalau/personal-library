/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vanilla replacement for `App.tsx`. All orchestration state now lives in
 * `appStore`; this view only owns the shell layout and decides which floorplan
 * (List Report or Object Page) occupies the main region.
 *
 * The shell markup is rendered exactly once. Children own their host elements
 * and are re-attached through `adopt()`, so a navigation never tears down the
 * ShellBar, the dialogs, the toast or the footer.
 */

import { Component } from '../core/component';
import { html, RawHtml } from '../core/html';
import { watch } from '../core/store';
import { appStore, type AppView as AppViewName } from '../stores/appStore';
import { FooterView } from './FooterView';
import { ListReportView } from './ListReportView';
import { ObjectPageView } from './ObjectPageView';
import { ShellBarView } from './ShellBarView';
import { ToastView } from './ToastView';
import { AuthModalView } from './dialogs/AuthModalView';
import { BackendSettingsModalView } from './dialogs/BackendSettingsModalView';
import { DeleteConfirmDialogView } from './dialogs/DeleteConfirmDialogView';
import { OpenApiModalView } from './dialogs/OpenApiModalView';
import { UploadDialogView } from './dialogs/UploadDialogView';
import { VersionOverwriteDialogView } from './dialogs/VersionOverwriteDialogView';

export class AppView extends Component {
  private readonly shellBar = this.own(new ShellBarView());

  private readonly toast = this.own(new ToastView());

  private readonly footer = this.own(new FooterView());

  private readonly dialogs = [
    this.own(new UploadDialogView()),
    this.own(new VersionOverwriteDialogView()),
    this.own(new DeleteConfirmDialogView()),
    this.own(new AuthModalView()),
    this.own(new OpenApiModalView()),
    this.own(new BackendSettingsModalView())
  ];

  /**
   * The floorplan currently mounted into `<main>`. React unmounted the
   * opposite floorplan on navigation, so it is created and destroyed here too.
   */
  private floorplan: ListReportView | ObjectPageView | null = null;

  private floorplanKind: AppViewName | null = null;

  constructor() {
    super(
      undefined,
      'div',
      'min-h-screen flex flex-col bg-[#f5f6f8] dark:bg-[#12171c] text-[#1d2d3e] dark:text-[#f0f4f8] transition-colors duration-200'
    );
  }

  protected onMount(): void {
    this.track(
      watch(
        appStore,
        (state) => state.currentView,
        () => this.syncFloorplan()
      )
    );
  }

  protected template(): RawHtml | string {
    return html`
      <div data-slot="shellbar"></div>
      <main class="flex-1 pb-12" data-slot="main"></main>
      <div data-slot="dialogs"></div>
      <div data-slot="toast"></div>
      <div data-slot="footer"></div>
    `;
  }

  protected afterRender(): void {
    this.adopt('[data-slot="shellbar"]', this.shellBar);
    this.dialogs.forEach((dialog) => this.adopt('[data-slot="dialogs"]', dialog));
    this.adopt('[data-slot="toast"]', this.toast);
    this.adopt('[data-slot="footer"]', this.footer);
    this.syncFloorplan();
  }

  /** Mounts (or swaps in) the floorplan matching the current navigation state. */
  private syncFloorplan(): void {
    const kind = appStore.state.currentView;
    const main = this.$('[data-slot="main"]');
    if (!main) {
      return;
    }

    if (this.floorplan && this.floorplanKind === kind) {
      if (this.floorplan.el.parentNode !== main) {
        main.appendChild(this.floorplan.el);
      }
      return;
    }

    this.floorplan?.destroy();
    this.floorplanKind = kind;
    this.floorplan = kind === 'list' ? new ListReportView() : new ObjectPageView();
    this.floorplan.mount(main);
  }

  protected onDestroy(): void {
    this.floorplan?.destroy();
    this.floorplan = null;
  }
}
