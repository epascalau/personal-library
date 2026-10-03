/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
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
}

const QUICK_PROFILES: QuickProfile[] = [
  {
    email: 'emilian.pascalau@gmail.com',
    name: 'Emilian Pascalau',
    subtitle: 'Administrator & Researcher',
    match: 'emilian'
  },
  {
    email: 'alan.turing@cambridge.ac.uk',
    name: 'Dr. Alan Turing',
    subtitle: 'Academic Fellow',
    match: 'turing'
  }
];

const DEFAULT_PASSWORD = '••••••••••••';

export class AuthModalView extends DialogView {
  private username = 'emilian.pascalau@gmail.com';

  private password = DEFAULT_PASSWORD;

  private realm = 'personal-library-realm';

  private loading = false;

  private errorMsg = '';

  constructor() {
    super(undefined);
  }

  protected isOpen(): boolean {
    return appStore.state.authModalOpen;
  }

  protected canClose(): boolean {
    return !this.loading;
  }

  protected requestClose(): void {
    appStore.closeAuth();
  }

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
          <label class="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            Quick Connect Profiles
          </label>
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

  private quickProfileButton(profile: QuickProfile): string {
    const active = this.username.includes(profile.match);
    return html`
      <button
        type="button"
        data-quick-profile="${profile.email}"
        class="${cx(
          'p-2 rounded border text-left transition-colors cursor-pointer',
          active
            ? 'border-[#0070f2] bg-blue-50/70 text-[#0070f2]'
            : 'border-gray-200 hover:border-gray-300 text-gray-700 bg-gray-50'
        )}"
      >
        <div class="font-semibold text-xs truncate">${profile.name}</div>
        <div class="text-[10px] text-gray-500 truncate">${profile.subtitle}</div>
      </button>
    `.toString();
  }

  private field(
    label: string,
    key: 'username' | 'password' | 'realm',
    value: string,
    options: { iconKey: Parameters<typeof icon>[0]; placeholder?: string; type?: string; inputClass?: string }
  ): string {
    return html`
      <div>
        <label class="block font-semibold text-gray-700 mb-1">${label}</label>
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
    `.toString();
  }

  protected bind(): void {
    this.onAll('[data-quick-profile]', 'click', (event) => {
      const button = event.currentTarget as HTMLElement;
      this.username = button.dataset.quickProfile as string;
      this.password = DEFAULT_PASSWORD;
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
