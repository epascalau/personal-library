/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Vanilla + UI5 replacement for `components/AuthModal.tsx`.
 *
 * The Keycloak sign-in form keeps its own local state (username, password,
 * realm, in-flight flag, error message), exactly as the React component did
 * with `useState`; only the backend call now travels over the event bus.
 */

import { cx, html, raw, RawHtml } from '../../core/html';
import { watch } from '../../core/store';
import { requestBackend } from '../../services/backend';
import { appStore } from '../../stores/appStore';
import { icon } from '../../ui5/icons';
import { DialogView } from './DialogView';
import type Input from '@ui5/webcomponents/dist/Input.js';

interface QuickProfile {
  email: string;
  name: string;
  subtitle: string;
  /** Substring used to mark the profile as active, as in the React version. */
  match: string;
  /**
   * Sandbox password for this realm user.
   *
   * WHY: The backend now brokers a real Keycloak password grant, so a placeholder would simply be
   * rejected. These are the throwaway credentials provisioned in `config/keycloak-realm.json`,
   * carried here only to keep one-click demo sign-in working.
   */
  password: string;
}

const QUICK_PROFILES: QuickProfile[] = [
  {
    email: 'emilian.pascalau@gmail.com',
    name: 'Emilian Pascalau',
    subtitle: 'Administrator & Researcher',
    match: 'emilian',
    password: 'emilian123'
  },
  {
    email: 'alan.turing@cambridge.ac.uk',
    name: 'Dr. Alan Turing',
    subtitle: 'Academic Fellow',
    match: 'turing',
    password: 'turing123'
  }
];

const DEFAULT_PASSWORD = QUICK_PROFILES[0].password;

export class AuthModalView extends DialogView {
  private username = 'emilian.pascalau@gmail.com';

  private password = DEFAULT_PASSWORD;

  private realm = 'personal-library-realm';

  private loading = false;

  private errorMsg = '';

  /**
   * Initializes the AuthModalView component.
   *
   * WHAT: Calls base DialogView constructor with `undefined` props.
   * WHY: The authentication modal's state (open/closed, current user) is driven globally
   * from `appStore`, eliminating the need for local constructor properties.
   */
  constructor() {
    super(undefined);
  }

  /**
   * Checks whether the authentication modal is currently opened.
   *
   * WHAT: Queries `appStore.state.authModalOpen`.
   * WHY: Driving visibility from the central application store allows any part of the UI
   * (ShellBar login button, HTTP 401 response interceptor, session timeout warning) to prompt the user for credentials.
   *
   * @returns `true` if open, `false` otherwise.
   */
  protected isOpen(): boolean {
    return appStore.state.authModalOpen;
  }

  /**
   * Determines if the user can dismiss the authentication modal.
   *
   * WHAT: Returns `!this.loading`.
   * WHY: Disallowing dismissal while Keycloak OIDC authentication is in flight prevents orphaned
   * network requests and indeterminate credential states.
   *
   * @returns `true` if safe to close, `false` if authentication is in progress.
   */
  protected canClose(): boolean {
    return !this.loading;
  }

  /**
   * Dispatches the store action to dismiss the authentication modal.
   *
   * WHAT: Invokes `appStore.closeAuth()`.
   * WHY: Centralizing the close action in the store ensures any dependent UI triggers
   * or focus restorations are handled consistently.
   */
  protected requestClose(): void {
    appStore.closeAuth();
  }

  /**
   * Subscribes to authentication modal visibility changes.
   *
   * WHAT: Tracks `appStore.state.authModalOpen` and re-renders when toggled.
   * WHY: Enables reactive open/close transitions when triggered by external events.
   */
  protected onMount(): void {
    super.onMount();
    this.track(
      watch(
        appStore,
        (state) => state.authModalOpen,
        () => this.requestRender()
      )
    );
  }

  /**
   * Renders the Keycloak OIDC login form markup.
   *
   * WHAT: Generates header banner, quick-connect profile selector buttons, username/password/realm inputs,
   * error display box, and the submission button.
   * WHY: Providing preconfigured quick-connect profiles allows instant demonstration of role-based access
   * control (Administrator vs Academic Fellow) without tedious manual typing, while custom UI5 inputs ensure
   * accessibility and theme consistency.
   *
   * @returns RawHtml modal layout.
   */
  protected body(): RawHtml {
    return html`
      <div slot="header" class="w-full">
        <div class="bg-[#354a5f] text-white p-6 text-center relative">
          <div
            class="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0070f2] to-[#00b4d8] mx-auto flex items-center justify-center shadow-lg mb-3"
          >
            ${icon('ShieldCheck', { className: 'w-6 h-6 text-white' })}
          </div>
          <h2 class="text-lg font-bold">Personal Library Authentication</h2>
          <p
            class="text-xs text-[#cfdbe8] mt-1 flex items-center justify-center gap-1.5 font-mono"
          >
            ${icon('Server', { className: 'w-3.5 h-3.5' })}
            Keycloak OIDC Client v24.0
          </p>
        </div>
      </div>

      <div class="p-6 space-y-4 text-xs">
        ${this.errorMsg
          ? html`<div class="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              ${this.errorMsg}
            </div>`
          : ''}

        <div class="space-y-1.5">
          <ui5-label class="plib-label block text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            Quick Connect Profiles
          </ui5-label>
          <div class="grid grid-cols-2 gap-2">
            ${raw(QUICK_PROFILES.map((profile) => this.quickProfileButton(profile)).join(''))}
          </div>
        </div>

        <form data-form="login" class="space-y-3 pt-2">
          ${this.field('Username / Email Address', 'username', this.username, {
            iconKey: 'User',
            placeholder: 'name@enterprise.com'
          })}
          ${this.field('Password', 'password', this.password, {
            iconKey: 'Lock',
            type: 'Password'
          })}
          ${this.field('Keycloak Realm', 'realm', this.realm, {
            iconKey: 'Key',
            inputClass: 'font-mono bg-gray-50'
          })}

          <div class="pt-2">
            <ui5-button
              class="plib-button plib-button--block w-full"
              design="Emphasized"
              data-action="submit-login"
              ${this.loading ? raw('disabled') : ''}
              icon="navigation-right-arrow"
              icon-end
            >
              ${this.loading
                ? 'Authenticating with Keycloak...'
                : 'Sign In with OpenID Connect'}
            </ui5-button>
          </div>
        </form>
      </div>

      <div slot="footer" class="w-full">
        <div
          class="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500"
        >
          <span>Client: personal-library-client</span>
          <span>Security: TLS 1.3 / OAuth2 JWT</span>
        </div>
      </div>
    `;
  }

  /**
   * Generates markup for an individual quick-connect demo profile card.
   *
   * WHAT: Returns HTML button formatted with user name, subtitle, and active selection state.
   * WHY: Visual highlighting of active profiles lets users immediately understand which persona
   * credentials will be dispatched to the backend.
   *
   * @param profile Quick-connect profile record.
   * @returns HTML string.
   */
  private quickProfileButton(profile: QuickProfile): string {
    const active = this.username.includes(profile.match);
    return html`
      <ui5-button
        design="Transparent"
        data-quick-profile="${profile.email}"
        class="${cx(
          'plib-button plib-quick-profile rounded border text-left transition-colors cursor-pointer',
          active
            ? 'border-[#0070f2] bg-blue-50/70 text-[#0070f2]'
            : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-gray-50'
        )}"
      >
        <div class="font-semibold text-xs truncate">${profile.name}</div>
        <div class="text-[10px] text-gray-500 truncate">${profile.subtitle}</div>
      </ui5-button>
    `.toString();
  }

  /**
   * Generates HTML markup for a branded SAP UI5 text or password input field.
   *
   * WHAT: Emits an input container with label, `ui5-input` custom element, slotted leading icon, and focus-key tracking.
   * WHY: Specifying `data-focus-key` ensures that when re-renders happen, the user's cursor and active focus
   * remain untouched, avoiding dropped keyboard input while typing.
   *
   * @param label Human-readable field label.
   * @param key State key ('username' | 'password' | 'realm').
   * @param value Current string value.
   * @param options Styling and input type parameters.
   * @returns `RawHtml` field markup. Returning the template token (rather than a plain string)
   *          is required: `html` escapes interpolated strings, so handing back `.toString()`
   *          here would render the entire field as visible markup text.
   */
  private field(
    label: string,
    key: 'username' | 'password' | 'realm',
    value: string,
    options: { iconKey: Parameters<typeof icon>[0]; placeholder?: string; type?: string; inputClass?: string }
  ): RawHtml {
    return html`
      <div>
        <ui5-label class="plib-label block font-semibold text-gray-700 mb-1">${label}</ui5-label>
        <div class="relative">
          <ui5-input
            class="${cx('plib-input w-full text-xs', options.inputClass)}"
            data-field="${key}"
            data-focus-key="auth-${key}"
            type="${options.type ?? 'Text'}"
            value="${value}"
            placeholder="${options.placeholder ?? ''}"
            accessible-name="${label}"
          >
            <div slot="icon" class="flex items-center">
              ${icon(options.iconKey, { className: 'w-3.5 h-3.5 text-gray-400' })}
            </div>
          </ui5-input>
        </div>
      </div>
    `;
  }

  /**
   * Binds user event listeners to quick profiles, inputs, Enter key presses, and form submissions.
   *
   * WHAT: Registers delegated event listeners for click, input, keydown, and submit events.
   * WHY: Event delegation ensures clean handling of custom UI5 web component input events
   * and allows keyboard navigation (pressing Enter to submit) to behave seamlessly.
   */
  protected bind(): void {
    this.onAll('[data-quick-profile]', 'click', (event) => {
      const button = event.currentTarget as HTMLElement;
      const email = button.dataset.quickProfile as string;
      const profile = QUICK_PROFILES.find((candidate) => candidate.email === email);
      this.username = email;
      // Carry the matching realm password: the backend performs a real password grant now.
      this.password = profile ? profile.password : '';
      this.render();
    });

    this.onAll('ui5-input[data-field]', 'input', (event) => {
      const input = event.currentTarget as Input;
      const key = input.dataset.field as 'username' | 'password' | 'realm';
      this[key] = input.value;
    });

    this.onAll('ui5-input[data-field]', 'keydown', (event) => {
      if ((event as KeyboardEvent).key === 'Enter') {
        void this.submit();
      }
    });

    this.on('[data-action="submit-login"]', 'click', () => void this.submit());
    this.on('form[data-form="login"]', 'submit', (event) => {
      event.preventDefault();
      void this.submit();
    });
  }

  /**
   * Executes the authentication request against the active backend adapter.
   *
   * WHAT: Validates inputs, sets loading state, calls `requestBackend('login', ...)`, commits token to `appStore`,
   * and closes the dialog on success or displays an error message on failure.
   * WHY: Routing authentication through `requestBackend` ensures credentials are processed appropriately whether
   * the active adapter is the integrated Node server, remote Spring Boot backend, or offline mock sandbox.
   */
  private async submit(): Promise<void> {
    if (this.loading) {
      return;
    }
    if (!this.username) {
      this.errorMsg = 'Username or email is required';
      this.render();
      return;
    }

    this.loading = true;
    this.errorMsg = '';
    this.render();

    try {
      const data = await requestBackend('login', {
        username: this.username,
        password: this.password,
        realm: this.realm
      });
      appStore.handleLoginSuccess(data.user, data.accessToken);
      appStore.closeAuth();
    } catch (err: any) {
      this.errorMsg = err?.message || 'Authentication failed';
    } finally {
      this.loading = false;
      this.render();
    }
  }
}
