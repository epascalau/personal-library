/**
 * @license
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * Keeps the Keycloak session alive by renewing the access token before it expires.
 *
 * The realm issues short-lived access tokens on purpose: a leaked one stops being
 * useful quickly. Without renewal that short lifetime becomes the maximum length of
 * a working session, and an active user is signed out mid-task. This service closes
 * that gap by exchanging the refresh token for a new access token shortly before the
 * current one lapses, so the session stays continuous while each individual token
 * remains short-lived.
 */

import { requestBackend } from './backend/BackendGateway';
import type { AuthSession } from './backend/types';
import type { UserProfile } from '../types';

const ACCESS_TOKEN_KEY = 'personal_library_token';
const REFRESH_TOKEN_KEY = 'personal_library_refresh_token';
const EXPIRES_AT_KEY = 'personal_library_token_expires_at';

/**
 * How long before expiry a renewal is attempted, in milliseconds.
 *
 * Renewing early rather than exactly at expiry absorbs clock skew between browser
 * and realm, and leaves room for the round trip plus a slow network. Too small a
 * margin risks in-flight requests carrying a token that expires before it arrives.
 */
const RENEW_MARGIN_MS = 60_000;

/**
 * Smallest delay before a scheduled renewal fires, in milliseconds.
 *
 * A restored session may already be inside the renewal margin, which would otherwise
 * schedule a timer in the past and fire a burst of immediate retries. The floor also
 * gives the application time to finish booting before the first network call.
 */
const MIN_DELAY_MS = 5_000;

/**
 * Tokens are considered stale this far ahead of expiry when the tab regains focus.
 *
 * Browsers heavily throttle, and on sleep entirely suspend, timers in background
 * tabs, so a scheduled renewal may fire late or not at all. Re-checking on focus
 * catches those cases rather than letting the user meet a dead token on their next
 * click.
 */
const STALE_THRESHOLD_MS = 30_000;

/**
 * Persisted session credentials.
 */
interface StoredSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Callbacks the owning store supplies so this service stays free of UI concerns.
 */
export interface SessionCallbacks {
  /** Invoked after a successful renewal with the realm's current profile */
  onRenewed?: (user: UserProfile) => void;
  /** Invoked when the session can no longer be renewed and the user must sign in again */
  onExpired?: () => void;
}

/**
 * Owns the lifetime of the stored Keycloak tokens and their renewal schedule.
 *
 * WHAT: Persists the token triple, schedules a renewal ahead of expiry, re-checks on
 * tab focus and network recovery, and clears everything on sign-out.
 * WHY: Centralizing this means no view or store has to reason about token expiry; they
 * read `personal_library_token` as before and it is simply always current.
 */
class SessionService {
  private timer: ReturnType<typeof setTimeout> | null = null;

  private callbacks: SessionCallbacks = {};

  private realm = 'personal-library-realm';

  /**
   * In-flight renewal, reused by concurrent callers.
   *
   * Several triggers can coincide — the scheduled timer firing just as the tab
   * regains focus, or a second tab waking on the same shared expiry timestamp.
   * Without this guard each would issue its own exchange and race to write the
   * result, leaving storage holding whichever reply happened to land last rather
   * than the newest. Sharing one promise collapses them into a single exchange.
   */
  private inFlight: Promise<boolean> | null = null;

  private listenersBound = false;

  /**
   * Registers the callbacks used to report renewal outcomes.
   *
   * WHAT: Stores the handlers invoked after a successful renewal or a terminal failure.
   * WHY: Keeps this service independent of the store and the UI, so it can be unit
   * tested and reused without dragging application state along.
   *
   * @param callbacks Handlers for renewal and expiry.
   */
  configure(callbacks: SessionCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Reads the persisted session, if one is present and complete.
   *
   * WHAT: Loads the access token, refresh token and expiry timestamp from localStorage.
   * WHY: A partially written session (for example a token saved by an older build that
   * knew nothing of refresh tokens) cannot be renewed, so it is reported as absent and
   * left to expire naturally rather than driving a renewal that is certain to fail.
   *
   * @returns The stored session, or null when no renewable session exists.
   */
  private read(): StoredSession | null {
    const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const expiresAt = Number(localStorage.getItem(EXPIRES_AT_KEY) || 0);

    if (!accessToken || !refreshToken || !expiresAt) {
      return null;
    }
    return { accessToken, refreshToken, expiresAt };
  }

  /**
   * Persists a newly issued or renewed session.
   *
   * WHAT: Writes the token triple, deriving the absolute expiry from `expiresIn`.
   * WHY: Storing an absolute timestamp rather than a duration means a page reload can
   * tell how much life the token has left; a duration alone would be meaningless once
   * the issuing moment is forgotten.
   *
   * @param session Session returned by sign-in or renewal.
   */
  private write(session: AuthSession): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, session.accessToken);

    if (session.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
    }

    // Fall back to the realm's configured 30 minutes when the server omits the field,
    // so a missing value shortens the schedule rather than disabling renewal entirely.
    const lifetimeMs = (session.expiresIn ?? 1800) * 1000;
    localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + lifetimeMs));
  }

  /**
   * Begins managing a freshly authenticated session.
   *
   * WHAT: Persists the tokens, remembers the realm, schedules the first renewal and
   * binds the focus and connectivity listeners.
   * WHY: Called once at sign-in, this is what turns a static token into a maintained
   * session.
   *
   * @param session Session returned by the sign-in call.
   */
  start(session: AuthSession): void {
    this.realm = session.user?.realm || this.realm;
    this.write(session);
    this.bindListeners();
    this.schedule();
  }

  /**
   * Resumes management of a session persisted by an earlier page load.
   *
   * WHAT: Schedules renewal for an existing stored session, renewing immediately when
   * the token is already expired or close to it.
   * WHY: A reload must not silently drop the renewal schedule, or the session would
   * die at the next expiry despite a perfectly valid refresh token being on hand.
   *
   * @returns True when a renewable session was found and rescheduled.
   */
  restore(): boolean {
    const stored = this.read();
    if (!stored) {
      return false;
    }

    this.bindListeners();

    // A session restored after the tab was closed for a while may already be past
    // expiry. The refresh token usually outlives the access token, so attempt renewal
    // rather than assuming the session is lost.
    if (this.isStale()) {
      void this.renew();
    } else {
      this.schedule();
    }
    return true;
  }

  /**
   * Reports whether the access token has expired or is about to.
   *
   * @returns True when the token is within the stale threshold of expiry.
   */
  private isStale(): boolean {
    const stored = this.read();
    return !!stored && stored.expiresAt - Date.now() <= STALE_THRESHOLD_MS;
  }

  /**
   * Arms the renewal timer for the current stored session.
   *
   * WHAT: Clears any pending timer and sets a new one to fire `RENEW_MARGIN_MS` before
   * the token expires, never sooner than `MIN_DELAY_MS`.
   * WHY: Replacing rather than adding timers keeps exactly one renewal pending, which
   * matters because `start` and `restore` can both run during a single page load.
   */
  private schedule(): void {
    this.clearTimer();

    const stored = this.read();
    if (!stored) {
      return;
    }

    const delay = Math.max(stored.expiresAt - Date.now() - RENEW_MARGIN_MS, MIN_DELAY_MS);
    this.timer = setTimeout(() => {
      void this.renew();
    }, delay);
  }

  /**
   * Cancels any pending renewal.
   */
  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  /**
   * Exchanges the stored refresh token for a new access token.
   *
   * WHAT: Calls the backend refresh operation, persists the rotated tokens, reschedules
   * the next renewal and reports the refreshed profile. On failure it clears the session
   * and reports expiry.
   * WHY: Treating any failure as terminal is deliberate. A refresh token that has expired, been
   * revoked by a sign-out elsewhere, or whose SSO session has ended is reported identically, and
   * in every one of those cases the token has no further use — retrying would present the same
   * dead credential and merely delay the sign-in prompt the user needs to see.
   *
   * @returns True when the session was renewed.
   */
  async renew(): Promise<boolean> {
    if (this.inFlight) {
      return this.inFlight;
    }

    const stored = this.read();
    if (!stored) {
      return false;
    }

    this.clearTimer();
    this.inFlight = (async () => {
      try {
        const session = await requestBackend('refreshSession', {
          refreshToken: stored.refreshToken,
          realm: this.realm
        });

        this.write(session);
        this.schedule();

        if (session.user) {
          this.callbacks.onRenewed?.(session.user);
        }
        return true;
      } catch (_) {
        this.clear();
        this.callbacks.onExpired?.();
        return false;
      } finally {
        this.inFlight = null;
      }
    })();

    return this.inFlight;
  }

  /**
   * Renews the session now if the token is stale, otherwise does nothing.
   *
   * WHAT: The focus and reconnect entry point.
   * WHY: Scheduled timers are unreliable in background tabs and do not run at all while
   * the machine sleeps, so a token can lapse with no renewal ever attempted. Checking
   * whenever the tab becomes active again repairs the session before the user's next
   * action hits a rejected token.
   */
  private renewIfStale(): void {
    if (this.read() && this.isStale()) {
      void this.renew();
    }
  }

  /**
   * Subscribes to the browser events that indicate a timer may have been missed.
   *
   * WHAT: Listens for tab visibility changes and for the network coming back.
   * WHY: Guarded by a flag because `start` and `restore` may both be called in one page
   * load, and duplicate listeners would trigger duplicate renewals.
   */
  private bindListeners(): void {
    if (this.listenersBound || typeof document === 'undefined') {
      return;
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.renewIfStale();
      }
    });
    window.addEventListener('online', () => this.renewIfStale());
    this.listenersBound = true;
  }

  /**
   * Returns the stored refresh token so the caller can have it revoked.
   *
   * WHAT: Reads the refresh token without clearing it.
   * WHY: Sign-out needs to send this to the realm before local state is discarded;
   * clearing first would throw away the only means of revoking the server-side session.
   *
   * @returns The refresh token, or undefined when none is stored.
   */
  getRefreshToken(): string | undefined {
    return localStorage.getItem(REFRESH_TOKEN_KEY) || undefined;
  }

  /**
   * Stops renewal and erases all stored credentials.
   *
   * WHAT: Cancels the pending timer and removes the token triple from localStorage.
   * WHY: Leaving a refresh token behind after sign-out would let the session be revived.
   */
  clear(): void {
    this.clearTimer();
    this.inFlight = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
  }
}

export const sessionService = new SessionService();
