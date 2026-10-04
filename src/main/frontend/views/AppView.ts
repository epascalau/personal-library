/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
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
import { BpmnModalView } from './dialogs/BpmnModalView';
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
    this.own(new BpmnModalView()),
    this.own(new BackendSettingsModalView())
  ];

  /**
   * The floorplan currently mounted into `<main>`. React unmounted the
   * opposite floorplan on navigation, so it is created and destroyed here too.
   */
  private floorplan: ListReportView | ObjectPageView | null = null;

  private floorplanKind: AppViewName | null = null;

  /**
   * Initializes the root application view with full-height flex column layout.
   *
   * WHAT: Sets up host element styling with min-height and theme transitions.
   * WHY: Provides the full-viewport scaffold for SAP Fiori applications.
   */
  constructor() {
    super(
      undefined,
      'div',
      'min-h-screen flex flex-col bg-[#f5f6f8] dark:bg-[#12171c] text-[#1d2d3e] dark:text-[#f0f4f8] transition-colors duration-200'
    );
  }

  /**
   * Subscribes the root view to navigation transitions.
   *
   * WHAT: Watches `appStore.currentView` and triggers `syncFloorplan()`.
   * WHY: Enables immediate switching between the List Report and Object Page floorplans
   * when users click a document row or click "Back to Library".
   */
  protected onMount(): void {
    this.track(
      watch(
        appStore,
        (state) => state.currentView,
        () => this.syncFloorplan()
      )
    );
  }

  /**
   * Produces the structural shell template with placeholders for persistent and dynamic regions.
   *
   * WHAT: Emits slots for ShellBar, main floorplan, dialogs, toast notifications, and footer.
   * WHY: The root layout shell is static; child components are adopted into these slots so they
   * never lose their event listeners or state during view transitions.
   */
  protected template(): RawHtml | string {
    return html`
      <div data-slot="shellbar"></div>
      <main class="flex-1 pb-12" data-slot="main"></main>
      <div data-slot="dialogs"></div>
      <div data-slot="toast"></div>
      <div data-slot="footer"></div>
    `;
  }

  /**
   * Post-render lifecycle callback that adopts persistent views and synchronizes the active floorplan.
   *
   * WHAT: Moves shellBar, dialogs, toast, and footer into their respective slots, and calls `syncFloorplan()`.
   * WHY: Using `adopt()` preserves all long-lived DOM nodes and internal component state
   * (e.g. active inputs inside dialogs, ongoing toast timers, and shell bar profile open states).
   */
  protected afterRender(): void {
    this.adopt('[data-slot="shellbar"]', this.shellBar);
    this.dialogs.forEach((dialog) => this.adopt('[data-slot="dialogs"]', dialog));
    this.adopt('[data-slot="toast"]', this.toast);
    this.adopt('[data-slot="footer"]', this.footer);
    this.syncFloorplan();
  }

  /**
   * Mounts or swaps the active SAP floorplan inside the `<main>` container.
   *
   * WHAT:
   * 1. If the current floorplan matches `kind`, ensures it is attached to `main`.
   * 2. If transitioning (e.g. from List to Object Page or vice versa), destroys the old floorplan,
   *    instantiates the new floorplan (`ListReportView` or `ObjectPageView`), and mounts it.
   *
   * WHY:
   * 1. Memory hygiene: Unlike the persistent shell bar or dialogs, floorplans hold large collections
   *    of table rows, chat transcripts, or citation chunks. Destroying the inactive floorplan
   *    ensures full garbage collection of unused DOM nodes.
   * 2. Clean view lifecycle: Mounting a fresh instance guarantees clean initial focus and predictable state.
   */
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

  /**
   * Teardown callback for the root application view.
   *
   * WHAT: Destroys the active floorplan.
   * WHY: Ensures complete cleanup when unmounting the root application.
   */
  protected onDestroy(): void {
    this.floorplan?.destroy();
    this.floorplan = null;
  }
}
