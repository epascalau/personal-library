# Identity & Access: Keycloak Realm, Users, Roles and Passwords

Every account that can reach the Personal Library sandbox, where each one is defined, which roles it carries, and exactly where to find and change it in the Keycloak admin console. This document also records precisely how far enforcement currently goes: **authentication is real, authorization is not**.

---

## 1. Read This First: What Is and Is Not Enforced

The project ships a complete Keycloak realm — users, roles, a confidential client — and the Spring Boot side is configured as an OIDC resource server.

**Authentication is genuine.** Signing in performs a real OAuth2 password grant against the realm. A wrong password is rejected with `401`, and the roles shown in the profile card are the actual `realm_access.roles` claims decoded from the issued token. Signing in as `viewer` really does yield only `VIEWER`.

**Authorization is not yet enforced.** `SecurityConfig` still ends with `.anyRequest().permitAll()`, so every API endpoint remains reachable *without* a token. A `VIEWER` is therefore not actually prevented from calling a write endpoint — the role is reported truthfully but not acted upon.

| Layer | Status |
| --- | --- |
| Realm, users, roles, client | Provisioned and working |
| Login credential check | **Enforced** — real password grant, wrong passwords fail |
| Roles reported to the UI | **Real** — decoded from the Keycloak token |
| Token issued to the browser | **Real signed JWT**, validated when presented |
| Session renewal | **Implemented** — renewed before expiry; logout revokes at the realm |
| API authorization rules | **Not enforced** — `anyRequest().permitAll()` |

Section 10 lists what remains to close the last gap.

### Why the backend brokers the login

The browser does **not** call Keycloak directly, and cannot. The backend trusts the issuer `http://keycloak:8080/realms/personal-library-realm` (see `application-docker.yml`), which only resolves inside the Docker network. A token minted through the published `localhost:8180` address carries that host in its `iss` claim and is rejected with `401 invalid_token` even though it is otherwise perfectly valid.

So `POST /api/v1/auth/login` performs the password grant server-side and returns the resulting token. Both runtimes implement this identically — `KeycloakAuthService` (Java) and the equivalent handler in `src/main/server/server.ts` — so the "Gateway" backend mode cannot be used to bypass the credential check.

### The trap: a malformed token is worse than no token

`permitAll()` does **not** mean "ignore the Authorization header". Spring Security's bearer-token filter runs *before* authorization rules, so a request carrying a credential the resource server cannot decode is rejected outright:

```text
no token                  -> 200 OK
Bearer kc_jwt_1791…       -> 401 invalid_token ("Malformed token")
Bearer <real Keycloak JWT> -> 200 OK
```

This caused a real defect: the login endpoints used to mint opaque markers (`kc_jwt_<millis>`), so **signing in broke every subsequent API call while signing out restored it** — the app appeared to "lose the backend connection" right after a successful login. Two changes fixed it: logins now return genuine JWTs, and `RestBackendAdapter.isJwt()` forwards a credential only when it is structurally a JWT, so any future opaque marker is held locally rather than sent.

> **Sandbox credentials only.** Every password in this document is a local development value committed to `config/keycloak-realm.json`. They exist so the sandbox boots unattended on a laptop. Never reuse them, and never expose this stack to an untrusted network as-is.

---

## 2. Where Identity Is Defined

| Concern | File / source of truth |
| --- | --- |
| Realm, users, roles, client | `config/keycloak-realm.json` (imported at container start) |
| Keycloak container & admin account | `docker-compose.yml`, service `keycloak` |
| Spring Boot resource-server wiring | `src/main/resources/application.yml`, `application-docker.yml` |
| Spring Boot authorization rules | `src/main/java/com/personallibrary/config/SecurityConfig.java` |
| Simulated login/logout endpoints | `src/main/server/server.ts`, `controller/AuthController.java` |
| In-app login dialog & quick profiles | `src/main/frontend/views/dialogs/AuthModalView.ts` |
| Admin console link surfaced in the UI | `src/main/frontend/views/dialogs/SystemLinksModalView.ts` |

The realm file is bind-mounted read-only and imported on every start:

```yaml
command: start-dev --import-realm
volumes:
  - ./config/keycloak-realm.json:/opt/keycloak/data/import/realm.json:ro
```

Because the import is driven from a file in source control, **changes made by hand in the admin console are lost whenever the container is recreated.** To make a change permanent, edit `config/keycloak-realm.json`.

---

## 3. Realm Users (Who Can Log Into Keycloak)

Five users are imported into the `personal-library-realm` realm. All are enabled, and all passwords are **non-temporary** (`"temporary": false`), so Keycloak will not force a password change on first login.

| Username | Password | Email | Full name | Realm roles |
| --- | --- | --- | --- | --- |
| `admin` | `admin` | `admin@personallibrary.local` | Library Administrator | `LIBRARY_ADMIN`, `CHIEF_RESEARCHER` |
| `researcher` | `researcher123` | `researcher@personallibrary.local` | Chief Researcher | `CHIEF_RESEARCHER` |
| `viewer` | `viewer123` | `viewer@personallibrary.local` | Academic Viewer | `VIEWER` |
| `emilian.pascalau` | `emilian123` | `emilian.pascalau@gmail.com` | Emilian Pascalau | `LIBRARY_ADMIN`, `CHIEF_RESEARCHER` |
| `alan.turing` | `turing123` | `alan.turing@cambridge.ac.uk` | Alan Turing | `CHIEF_RESEARCHER` |

All five are **real realm users** — valid at the Keycloak login page, in any OIDC flow, and in the application's own login dialog. The last two back the "Quick Connect" buttons described below.

Because `loginWithEmailAllowed` is `true`, either the username or the email address can be supplied as the login identifier.

### The Keycloak master admin (a different account)

The account that administers the Keycloak server itself is **not** a realm user. It is created from environment variables:

| Setting | Env var | Default |
| --- | --- | --- |
| Admin username | `KEYCLOAK_ADMIN_USER` | `admin` |
| Admin password | `KEYCLOAK_ADMIN_PASSWORD` | `admin` |

It lives in the `master` realm and is what you use to reach the admin console. The name collision with the realm user `admin` is coincidental — they are separate accounts in separate realms.

### Quick Connect buttons

The frontend login dialog offers two "Quick Connect" buttons, defined in `AuthModalView.ts`. Each one fills in a **real realm account** and its sandbox password, so one-click sign-in still works now that credentials are genuinely checked:

| Email | Display name | Fills password | Resulting roles |
| --- | --- | --- | --- |
| `emilian.pascalau@gmail.com` | Emilian Pascalau | `emilian123` | `LIBRARY_ADMIN`, `CHIEF_RESEARCHER` |
| `alan.turing@cambridge.ac.uk` | Dr. Alan Turing | `turing123` | `CHIEF_RESEARCHER` |

The realm field defaults to `personal-library-realm`. Editing the password to anything else and submitting now fails with "Invalid username or password" — the dialog stays open and no token is stored.

Before anyone logs in, the application also boots with a default identity (`emilian.pascalau`, roles `LIBRARY_ADMIN` + `CHIEF_RESEARCHER`), restored from `localStorage` key `personal_library_user` when present.

---

## 4. Realm Roles

Three realm roles are defined, with these descriptions taken verbatim from the realm import:

| Role | Intended privileges |
| --- | --- |
| `LIBRARY_ADMIN` | Full administrator privileges (CRUD, versions, rollback, system administration) |
| `CHIEF_RESEARCHER` | Researcher privileges (upload, summarize, vector search, RAG chat) |
| `VIEWER` | Read-only access (search, read documents, download assets) |

There are **no client roles and no groups** in this realm — role assignment is flat and direct, user to realm role.

Note the naming inconsistency worth knowing about: the Node gateway hands out a role literally named `RESEARCHER`, which does not exist in the realm (the realm defines `CHIEF_RESEARCHER`). Another reason not to rely on the simulated login for authorization decisions.

---

## 5. The OIDC Client

| Property | Value |
| --- | --- |
| Client ID | `personal-library-client` |
| Type | Confidential (`"publicClient": false`) |
| Client secret | `enterprise-library-secret` |
| Standard flow (authorization code) | Enabled |
| Direct access grants (password grant) | Enabled |
| Service accounts | Enabled |
| Valid redirect URIs | `http://localhost:13000/*`, `http://127.0.0.1:13000/*` |

Because **direct access grants** are enabled, you can obtain a genuine token from the command line without a browser (see section 8).

The same values are passed to the application container as environment variables, each overridable:

| Env var | Default |
| --- | --- |
| `KEYCLOAK_AUTH_SERVER_URL` | `http://keycloak:8080` |
| `KEYCLOAK_REALM` | `personal-library-realm` |
| `KEYCLOAK_CLIENT_ID` | `personal-library-client` |
| `KEYCLOAK_CLIENT_SECRET` | `enterprise-library-secret` |

---

## 6. Realm Settings

| Setting | Value | Meaning |
| --- | --- | --- |
| Realm name | `personal-library-realm` | Used in issuer URIs and shown in the app's realm field |
| Display name | Personal Library & AI Research Engine | Shown on the Keycloak login page |
| Enabled | `true` | |
| SSL required | `none` | Plain HTTP is accepted — sandbox only |
| User registration | `true` | Visitors may self-register a realm account |
| Login with email | `true` | Email is accepted in place of username |
| Duplicate emails | `false` | Email addresses must be unique |
| Forgot password | `true` | Password reset flow is offered |
| Edit username | `false` | Usernames are immutable once created |
| Access token lifespan | `1800` (30 min) | How long an issued JWT stays valid; nothing refreshes it yet |
| SSO session idle timeout | `1800` (30 min) | Session ends after 30 minutes of inactivity |
| SSO session max lifespan | `36000` (10 h) | Absolute ceiling, enforced even while active |
| Client session idle timeout | `1800` (30 min) | Per-client idle limit, aligned with the SSO idle timeout |

---

## 7. Finding Things in the Keycloak Admin Console

**URL:** `http://localhost:8180/admin/` — sign in with `admin` / `admin`.

You can also reach it from inside the application: click the **user avatar** in the top-right ShellBar → **System Services & Admin Consoles** → **Keycloak Admin Console**. The dialog displays the `admin / admin` credential hint next to the link and builds the URL from the current hostname, so it works from another machine on the network too.

The port is published as `${KEYCLOAK_PORT:-8180}:8080` — `8180` on the host, `8080` inside the Docker network. Use `8180` from your browser and `http://keycloak:8080` from other containers.

> **Switch realms first.** You land in the `master` realm. Use the **realm selector dropdown at the top of the left sidebar** and choose **Personal Library & AI Research Engine** (`personal-library-realm`). Nearly every task below is invisible until you do this — the single most common point of confusion.

| What you want to do | Where to go (Keycloak 24 admin console) |
| --- | --- |
| List all realm users | **Manage → Users**, then press **Search** with an empty box (the list is empty until you search) |
| Inspect or edit one user | **Manage → Users → *(username)* → Details** |
| Change a user's password | **Manage → Users → *(username)* → Credentials → Reset password**; toggle **Temporary** off to avoid a forced change |
| Assign or revoke roles | **Manage → Users → *(username)* → Role mapping → Assign role**, then filter by **realm roles** |
| Create a new user | **Manage → Users → Add user**; set a password afterwards in the **Credentials** tab |
| Disable an account | **Manage → Users → *(username)* → Details → Enabled** toggle |
| View or edit the three roles | **Manage → Realm roles** |
| See who holds a role | **Manage → Realm roles → *(role)* → Users in role** |
| Client settings and redirect URIs | **Manage → Clients → `personal-library-client` → Settings** |
| Read or regenerate the client secret | **Manage → Clients → `personal-library-client` → Credentials** |
| Service-account role mappings | **Manage → Clients → `personal-library-client` → Service accounts roles** |
| Registration / forgot-password toggles | **Configure → Realm settings → Login** tab |
| Token and session lifetimes | **Configure → Realm settings → Tokens** / **Sessions** tabs |
| Active logins, force logout | **Manage → Sessions** |
| Confirm the issuer and endpoint URLs | **Configure → Realm settings → General → OpenID Endpoint Configuration** |
| Audit login attempts | **Configure → Realm settings → Events** (disabled by default; enable **Save events** first) |

Remember: anything changed here is overwritten on container recreation. Persist it in `config/keycloak-realm.json`.

---

## 8. Verifying the Realm Works

The realm genuinely authenticates even though the app ignores it. Direct access grants let you prove this:

```bash
curl -s -X POST \
  http://localhost:8180/realms/personal-library-realm/protocol/openid-connect/token \
  -d client_id=personal-library-client \
  -d client_secret=enterprise-library-secret \
  -d grant_type=password \
  -d username=researcher \
  -d password=researcher123
```

A correct password returns an `access_token`; a wrong one returns `401` with `invalid_grant`. Decode the token's payload to see the `realm_access.roles` claim carrying `CHIEF_RESEARCHER`.

> **The issuer must match, or the token is rejected.** A token minted through `localhost:8180` carries `"iss": "http://localhost:8180/..."`, but the containerized backend is configured for `http://keycloak:8080/...` (`application-docker.yml`). Presenting the former yields `401` even though the token is perfectly valid. To obtain a token the running backend will accept, request it from inside the Docker network:
>
> ```bash
> docker exec personal-library-app sh -lc 'curl -s -X POST \
>   "http://keycloak:8080/realms/personal-library-realm/protocol/openid-connect/token" \
>   -d client_id=personal-library-client \
>   -d client_secret=enterprise-library-secret \
>   -d grant_type=password -d username=researcher -d password=researcher123'
> ```
>
> That token returns `200` against `/api/v1/documents`, confirming the realm, the client, the password, and the resource-server wiring are all genuinely functional — only the authorization rules are open.

Useful endpoints:

| Purpose | URL |
| --- | --- |
| Discovery document | `http://localhost:8180/realms/personal-library-realm/.well-known/openid-configuration` |
| Issuer (host) | `http://localhost:8180/realms/personal-library-realm` |
| Issuer (in-network) | `http://keycloak:8080/realms/personal-library-realm` |
| JWKS | `http://localhost:8180/realms/personal-library-realm/protocol/openid-connect/certs` |
| Account console | `http://localhost:8180/realms/personal-library-realm/account/` |
| Readiness probe | `http://localhost:8180/health/ready` |

Spring Boot is already pointed at these. `application.yml` uses `KEYCLOAK_ISSUER_URI` (defaulting to the `localhost:8180` form) and `application-docker.yml` overrides it to the in-network `keycloak:8080` form, because a container cannot resolve the host's published port.

---

## 9. Session Renewal

Access tokens deliberately expire after 30 minutes so a leaked one stops being useful quickly.
Without renewal that lifetime would also be the maximum length of a working session, signing an
active user out mid-task. `SessionService` (`src/main/frontend/services/SessionService.ts`) closes
that gap.

**How it works**

1. On sign-in, the token bundle is persisted under three keys: `personal_library_token`,
   `personal_library_refresh_token` and `personal_library_token_expires_at` (an absolute
   timestamp, so a reload can tell how much life is left).
2. A renewal is scheduled for **60 seconds before expiry**, leaving room for clock skew and the
   round trip itself.
3. The renewal posts to `/api/v1/auth/refresh`, which brokers an OAuth2 `refresh_token` grant and
   returns a fresh bundle plus the realm's current profile — so a role granted or revoked
   mid-session takes effect on the next renewal rather than at the next manual sign-in.
4. A page reload calls `appStore.initSession()`, which resumes the schedule. If the stored token is
   already expired or within 30 seconds of it, renewal happens immediately instead.
5. Because browsers throttle, and on sleep suspend, timers in background tabs, renewal is also
   re-checked whenever the tab regains focus or the network comes back.
6. Any failure is terminal: the tokens are cleared, the auth dialog opens, and the user sees
   *"Session expired, please sign in again."* Retrying would only present the same dead credential.

**Logout revokes server-side.** `/api/v1/auth/logout` now forwards the refresh token to the realm's
end-session endpoint. Clearing browser storage alone is not enough — a refresh token stays valid at
the realm until it expires, so anything that captured it could keep minting access tokens after the
user believed they had signed out.

**Refresh tokens are reusable, by choice.** The realm leaves `revokeRefreshToken` at its default of
`false`, so a previously issued refresh token remains valid until the SSO session ends. Enabling
revocation would add replay detection, but every open browser tab shares one `localStorage` and
renews on the same absolute timestamp: two tabs waking together would race, and the loser would
present a just-revoked token and be signed out of a perfectly healthy session. Making that safe
needs cross-tab leader election, which is not worth the complexity here.

**Effective session length:** indefinite while the user stays active, bounded by
`ssoSessionIdleTimeout` (30 min of inactivity) and the absolute `ssoSessionMaxLifespan` (10 hours),
after which re-authentication is required regardless of activity.

---

## 10. Making the Realm Actually Authoritative

Authentication is already real (section 1). Steps 1-3 below are **done**; what remains is authorization.

Already in place:

1. ~~Issue genuine tokens.~~ Both `POST /api/v1/auth/login` implementations broker a real password grant and return a signed JWT.
2. ~~Send the token from the browser.~~ `RestBackendAdapter` attaches `Authorization: Bearer` for any structurally valid JWT.
3. ~~Report real roles.~~ The profile card shows `realm_access.roles` decoded from the token.
4. ~~Handle token expiry.~~ `SessionService` renews the access token a minute before it lapses, so a session stays alive as long as the user keeps working. See *Session renewal* below.

Still required to enforce authorization:

4. **Replace the blanket permit in `SecurityConfig.java`.** Change `.anyRequest().permitAll()` to `.anyRequest().authenticated()`, keeping `permitAll()` for `/api/v1/auth/**`, `/actuator/health`, the OpenAPI spec, and static assets. The resource-server and JWT converter plumbing is already present and proven working.
5. **Map realm roles to method security** (for example `@PreAuthorize("hasRole('LIBRARY_ADMIN')")`) so `VIEWER` is genuinely read-only. The `KeycloakRealmRoleConverter` already applies the `ROLE_` prefix these checks expect.
6. **Authenticate the seeder.** `scripts/seed-initial-documents.sh` calls the API unauthenticated, including a readiness loop that would spin forever against a secured endpoint. Service accounts are enabled on the client, so a client-credentials token is the natural fix.
7. **Verify JWTs in the Node gateway.** It currently performs no token validation of its own; with Java enforcing and the gateway not, "Gateway" backend mode would become an unsecured path to the data.
8. **Harden the deployment**: set `sslRequired` away from `none`, disable self-registration, rotate the client secret out of source control into a secret store, and change every default password including `KEYCLOAK_ADMIN_PASSWORD`.

---

## 11. Quick Reference

| Account | Password | Where it is valid | Roles |
| --- | --- | --- | --- |
| `admin` (master realm) | `admin` | Keycloak admin console | Keycloak server administrator |
| `admin` (library realm) | `admin` | Everywhere | `LIBRARY_ADMIN`, `CHIEF_RESEARCHER` |
| `researcher` | `researcher123` | Everywhere | `CHIEF_RESEARCHER` |
| `viewer` | `viewer123` | Everywhere | `VIEWER` |
| `emilian.pascalau` | `emilian123` | Everywhere (Quick Connect #1) | `LIBRARY_ADMIN`, `CHIEF_RESEARCHER` |
| `alan.turing` | `turing123` | Everywhere (Quick Connect #2) | `CHIEF_RESEARCHER` |
| Anything else | — | Rejected with `401` | none |

"Everywhere" means the Keycloak login page, any OIDC flow, and the application's own login dialog — all three now validate against the same realm.

Related reading: [Backend Architecture](BACKEND_ARCHITECTURE.md) for the Spring Boot layering, [DevOps Guide](DEVOPS_GUIDE.md) for the Compose stack and ports, and [Frontend Architecture](FRONTEND_ARCHITECTURE.md) for how the ShellBar and dialogs are built.
