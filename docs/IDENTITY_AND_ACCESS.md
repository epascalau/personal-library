# Identity & Access: Keycloak Realm, Users, Roles and Passwords

Every account that can reach the Personal Library sandbox, where each one is defined, which roles it carries, and exactly where to find and change it in the Keycloak admin console. This document also records an important and easily-missed fact: the realm below is fully provisioned, but the running application does **not** currently enforce it.

---

## 1. Read This First: Provisioned vs. Enforced

The project ships a complete, working Keycloak realm — users, roles, a confidential client, and an OIDC resource-server configuration on the Spring Boot side. That realm is real and you can log into it directly at the Keycloak admin console.

However, **the application's own login dialog does not authenticate against Keycloak**, and **no API endpoint requires a token**. Three independent places make this true:

| Location | What it actually does |
| --- | --- |
| `src/main/java/com/personallibrary/config/SecurityConfig.java` | Ends with `.anyRequest().permitAll()`. CSRF is disabled and sessions are `STATELESS`. The OAuth2 resource server is wired up, but because every request is permitted, a JWT is never required. |
| `src/main/server/server.ts` → `POST /api/v1/auth/login` | Accepts **any** username, **ignores the password field entirely**, and always returns a session carrying `LIBRARY_ADMIN` and `RESEARCHER`. The "token" is just the user profile base64-encoded behind a `kc_jwt_` prefix. |
| `src/main/java/com/personallibrary/controller/AuthController.java` → `POST /api/v1/auth/login` | Returns `"kc_jwt_" + System.currentTimeMillis()` and hardcodes the roles `LIBRARY_ADMIN` and `CHIEF_RESEARCHER`. No credential check occurs. |

**Consequence:** signing in through the application's ShellBar dialog with `viewer` / `viewer123` will *not* give you a read-only session — it grants administrator roles, exactly like every other username. The realm roles in section 4 describe *intent*, not currently enforced authorization.

This is deliberate for an educational sandbox (it keeps the stack usable without an OIDC redirect dance), but it must be understood before anyone treats this deployment as secured. See section 9 for what to change to make the realm authoritative.

> **Sandbox credentials only.** Every password in this document is a local development value already committed to `config/keycloak-realm.json` and `docker-compose.yml`. They exist so the sandbox boots unattended on a laptop. Never reuse them, and never expose this stack to an untrusted network as-is.

---

## 2. Where Identity Is Defined

| Concern | File / source of truth |
| --- | --- |
| Realm, users, roles, client | `config/keycloak-realm.json` (110 lines, imported at container start) |
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

Three users are imported into the `personal-library-realm` realm. All are enabled, and all passwords are **non-temporary** (`"temporary": false`), so Keycloak will not force a password change on first login.

| Username | Password | Email | Full name | Realm roles |
| --- | --- | --- | --- | --- |
| `admin` | `admin` | `admin@personallibrary.local` | Library Administrator | `LIBRARY_ADMIN`, `CHIEF_RESEARCHER` |
| `researcher` | `researcher123` | `researcher@personallibrary.local` | Chief Researcher | `CHIEF_RESEARCHER` |
| `viewer` | `viewer123` | `viewer@personallibrary.local` | Academic Viewer | `VIEWER` |

These three are **realm users** — they are valid at the Keycloak login page and in any OIDC flow against the realm.

### The Keycloak master admin (a different account)

The account that administers the Keycloak server itself is **not** a realm user. It is created from environment variables:

| Setting | Env var | Default |
| --- | --- | --- |
| Admin username | `KEYCLOAK_ADMIN_USER` | `admin` |
| Admin password | `KEYCLOAK_ADMIN_PASSWORD` | `admin` |

It lives in the `master` realm and is what you use to reach the admin console. The name collision with the realm user `admin` is coincidental — they are separate accounts in separate realms.

### Identities the application shows (not Keycloak users)

The frontend login dialog offers two "Quick Connect" profiles, defined in `AuthModalView.ts`. These are **UI conveniences only** and do not exist in the realm:

| Email | Display name | Subtitle |
| --- | --- | --- |
| `emilian.pascalau@gmail.com` | Emilian Pascalau | Administrator & Researcher |
| `alan.turing@cambridge.ac.uk` | Dr. Alan Turing | Academic Fellow |

The password field is pre-filled with a bullet placeholder and, as established in section 1, is never validated. The realm field defaults to `personal-library-realm`.

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

## 9. Making the Realm Actually Authoritative

If you want enforcement rather than simulation, these are the changes required — listed so the gap is explicit, not as a recommendation to make them blindly:

1. **Replace the blanket permit in `SecurityConfig.java`.** Change `.anyRequest().permitAll()` to `.anyRequest().authenticated()`, keeping `permitAll()` only for `/actuator/health`, the OpenAPI spec, and static assets. The resource-server and JWT converter plumbing is already present.
2. **Delete or gate the simulated login endpoints.** Both `POST /api/v1/auth/login` implementations mint fake tokens and must not survive into an enforced configuration.
3. **Make the frontend obtain a real token**, either via the authorization-code flow against the client's registered redirect URIs or via direct access grants, and attach it as an `Authorization: Bearer` header.
4. **Map realm roles to method security** (for example `@PreAuthorize("hasRole('LIBRARY_ADMIN')")`) so `VIEWER` is genuinely read-only.
5. **Harden the deployment**: set `sslRequired` away from `none`, disable self-registration, rotate the client secret out of source control into a secret store, and change every default password including `KEYCLOAK_ADMIN_PASSWORD`.

---

## 10. Quick Reference

| Account | Password | Where it is valid | Roles |
| --- | --- | --- | --- |
| `admin` (master realm) | `admin` | Keycloak admin console | Keycloak server administrator |
| `admin` (library realm) | `admin` | Realm login / OIDC flows | `LIBRARY_ADMIN`, `CHIEF_RESEARCHER` |
| `researcher` | `researcher123` | Realm login / OIDC flows | `CHIEF_RESEARCHER` |
| `viewer` | `viewer123` | Realm login / OIDC flows | `VIEWER` |
| Any username at all | *(ignored)* | The application's own login dialog | Granted admin roles regardless — see section 1 |

Related reading: [Backend Architecture](BACKEND_ARCHITECTURE.md) for the Spring Boot layering, [DevOps Guide](DEVOPS_GUIDE.md) for the Compose stack and ports, and [Frontend Architecture](FRONTEND_ARCHITECTURE.md) for how the ShellBar and dialogs are built.
