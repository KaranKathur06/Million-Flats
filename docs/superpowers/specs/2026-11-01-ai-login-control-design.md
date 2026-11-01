# MillionFlats AI System Login Policy Design

## Status

Approved by the project owner in three design sections on 2026-11-01.

## Goal

Provide one PostgreSQL-backed Admin Panel control for requiring authentication
before visitors can view the approved AI System informational pages. The policy
must be reversible without an application deployment or process restart and
must not weaken authorization for AI APIs, private data, or operations.

## Confirmed route scope

The project owner confirmed that the control should cover the six existing
informational routes, rather than the four originally mentioned:

- `/ai/view` — AIView
- `/ai/shield` — AIShield
- `/ai/index` — AIIndex
- `/ai/title` — AITitle
- `/ai/pro` — AIPro
- `/ai-system` — AI System overview

The existing route registry uses prefix matching. Existing informational
descendants, including `/ai/shield/about`, inherit their registered root's
policy, except any descendant whose path contains a `demo` segment. Other
`/ai/*` routes, `/ai-demos/*`, APIs, and dashboards are not included
automatically. The route registry is the single source of truth for page
policy matching, admin scope display, and tests.

## Existing architecture findings

- `lib/ai-public-routes.ts` currently lists six public prefixes and reads
  `MF_AI_PUBLIC_PAGES` at runtime.
- `components/GatedActionLink.tsx` separately reads the build-time
  `NEXT_PUBLIC_MF_AI_PUBLIC_PAGES` value to decide whether AI links bypass its
  login interception.
- `lib/auth/routes.ts` includes the AI prefixes in public route classification.
- `middleware.ts` does not match the AI pages, so it should not be given a
  PostgreSQL dependency for this policy.
- Prisma already defines a PostgreSQL `AuthSettings` singleton with an
  `updatedByUserId` field, plus an `AuditLog` model and audit enums.
- Existing authentication settings restrict modification to the `SUPERADMIN`
  role. The app role is spelled `SUPERADMIN`.
- The existing public AI design distinguishes public information/page access
  from private AI operations and APIs. That security boundary remains intact.

## Recommended architecture

### Route registry

Keep one server-safe registry of the six canonical page roots. Route matching
removes one optional trailing slash and matches either the exact root or a
descendant path unless any descendant segment is exactly `demo`, case
sensitively. It uses the framework-provided pathname without manually
decoding or rewriting encoded path segments. It must not use broad `/ai/*`
matching. The registry must not contain `/api/ai/*`, demo paths, or protected
dashboard routes.

### Runtime policy evaluation

Add a centralized server-side service that:

1. Identifies whether a pathname belongs to a registered AI information route.
2. Loads the login-required value from the `AuthSettings` singleton.
3. Treats a missing row, invalid value, or database error as login required.
4. For a registered page, redirects an anonymous visitor to the existing
   `/auth/login` flow with the requested path and query preserved when login is
   required.
5. Allows authenticated visitors through to the page's existing behavior.

Controlled App Router server page entry points call the shared guard before
rendering. The existing nested information page under `/ai/shield/about` must
also use that guard. The controlled pages must render dynamically so a page
response is not served from a stale static/ISR cache.

The middleware remains Edge-compatible and does not query PostgreSQL. There
will be no policy cache: each page request reads the authoritative configured
database, so changes apply to the next page request on every app instance after
the update commits. Production instances must use the same production
authoritative database; staging must continue using its own database.

`GatedActionLink` must no longer use either build-time or runtime environment
flags to decide AI page access. AI page links navigate directly; the server
page guard remains authoritative and preserves the login redirect behavior
when enabled. Other gated links retain their existing behavior.

### Persistence and audit

Reuse `AuthSettings` rather than introduce a second settings table. Add a
non-null boolean field, `aiInformationLoginRequired`, with a database default
of `true`, and a non-null integer field, `aiInformationPolicyVersion`, with a
database default of `0`. Existing rows receive those defaults during the
additive migration; a missing row remains secure through service fallback.
The policy-specific monotonically increasing version avoids treating
unrelated authentication-setting changes as policy updates and prevents stale
requests from silently winning after a policy has changed more than once.

Add an audit action and entity discriminator for this policy to the existing
audit enums. A successful policy update writes an `AuditLog` record in the
same database transaction as the setting change. Record the stable setting
identifier `AI_SYSTEM_LOGIN_REQUIRED`, previous and new values, the resulting
policy version, actor ID and role, timestamp, and supported request
correlation/IP metadata. Do not record credentials, tokens, or unnecessary
personal data. An audit failure rolls back the policy update; it must not
produce a success response.

GET returns the current policy version. When the singleton row is absent, it
returns the secure default (`loginRequired: true`) and version `0`. PATCH
requires the observed version. For an existing row, the backend atomically
updates only when the stored version matches, then increments the version. If
the row is absent and the expected version is `0`, the backend attempts a
create-if-absent with the new policy and version `1`; a competing create yields
a conflict. A stale version returns HTTP 409. Successful GET and PATCH
responses include the effective policy and current version. Submitting the
already-saved value with the current version is a no-op: return the persisted
state without incrementing the version or adding an audit event.

Policy-specific `updatedAt` and `updatedBy` values are derived from the audit
event whose recorded policy version equals the current setting version, not
the shared `AuthSettings.updatedAt` or `updatedByUserId`, which can change for
unrelated settings. Version is stored in the audit event metadata and
after-state. GET reads the setting and matching audit event in one
repeatable-read transaction, so the policy, version, actor, and timestamp
cannot be mixed across concurrent updates. Version `0` has no matching event,
so `updatedAt` and `updatedBy` are null.

### Admin API and authorization

Use the existing API conventions with:

- `GET /api/admin/settings/ai-login-policy`
- `PATCH /api/admin/settings/ai-login-policy`

The GET endpoint is restricted to authenticated admin roles. The PATCH
endpoint independently requires `SUPERADMIN`; browser state is not trusted.
Use the established same-origin/CSRF protections, strict request validation,
and the project's response/error format. PATCH accepts only the boolean policy
and a non-negative integer `expectedVersion`; reject unexpected fields. Do not
expose stack traces or database internals.

When login is required, the server guard redirects to
`/auth/login?next=<encodeURIComponent(pathname + search)>`, preserving the
requested page and query using the same `next` parameter convention as the
existing middleware login flow.

### Admin UI

Place the control in Admin → Settings → Authentication Settings, the existing
security/authentication settings area.

The page contains exactly one global switch for this policy and clearly states
that it applies to the six approved informational routes only. It displays the
saved state, last-updated time, and responsible administrator when available.
Non-SUPERADMIN admins receive a read-only view, consistent with the existing
authentication settings.

The UI starts in a loading state instead of claiming an unsaved default is
persisted. If the initial GET fails, it displays an understandable error and a
retry action; it does not display a switch or represent a default as saved.
Toggling opens a confirmation dialog that displays the new state:

- Turning login OFF: title “Enable public access?” and description
  “Unauthenticated visitors will be able to access the six designated AI
  System™ information pages. Protected dashboards, private AI operations, and
  APIs will continue to require their existing authorization.”
- Turning login ON: title “Require login for AI pages?” and description
  “Visitors will need to authenticate before accessing the six designated AI
  System™ information pages.”

The UI does not optimistically persist a new state. It disables duplicate
submissions while saving, shows success only after persistence, and restores
the last known persisted state with a clear error if the update fails. On HTTP
409, it reloads the current policy and version, explains that another admin
changed the setting, and requires a fresh confirmation before retrying. On
success, it adopts the returned policy, version, and audit metadata.
In the Authentication Settings page, the policy card appears immediately after
Authentication Mode and before the Danger Zone.

The PATCH same-origin check compares the browser Origin to the externally
visible host and protocol when the application is behind a reverse proxy,
falling back to the Host header and request URL protocol when forwarded
headers are absent. It continues to reject missing, malformed, and genuinely
cross-origin requests.

Before writing, PATCH verifies that the session's administrator ID still maps
to a database user whose current role is `SUPERADMIN`, so a stale JWT cannot
cause an audit foreign-key failure or retain revoked privileges. Unexpected
database failures are logged with a server-generated reference ID and return
safe, actionable messages for missing schema, stale actor references, and
database constraint failures. The UI shows that reference ID for support and
reports non-JSON server responses with their HTTP status.

### Security boundaries

The setting controls page rendering for the six registered roots and their
existing informational descendants only. It does not change:

- `/api/ai/*` or other AI API authorization.
- Private property analysis, user-specific reports, valuations, uploaded
  documents, or agent/buyer/agency/developer dashboards.
- Subscription, entitlement, billing, moderation, verification, or admin
  checks.
- Protected operations launched from an information page.

Every API, server action, and private data access operation keeps its own
existing server-side authentication and authorization.

### Error behavior and propagation

If the setting is unavailable or invalid, anonymous visitors are not granted
access. Authenticated visitors may continue through their existing page
authorization. No process-local cache or shared cache is introduced, and no
restart is required. After a successful commit, subsequent page requests
against the authoritative database observe the new value. The design does not
claim instantaneous behavior for a request already in flight or an
environment configured to read from a lagging replica.

Concurrent updates that use stale UI state fail with a conflict and require a
fresh read. Staging and production remain isolated by their existing database
configuration.

## Verification plan

Add focused tests for:

- Registry contains exactly the six confirmed roots and matches only their
  exact paths and descendants.
- The overview is included; AI demos, unrelated routes, and API routes are
  excluded.
- Missing row, malformed value, and database failure all require login.
- Anonymous requests redirect through `/auth/login` with the original
  destination preserved when the setting is ON.
- Anonymous page requests render when the setting is OFF; authenticated page
  access retains existing behavior.
- `SUPERADMIN` can update; all other roles and unauthenticated callers cannot.
- Invalid and extra request properties are rejected.
- A same-origin update succeeds when the reverse proxy's public origin differs
  from the internal application URL, while a genuinely cross-origin update is
  rejected.
- Concurrent stale updates conflict rather than silently overwrite, including
  competing first-time creates when the singleton row is absent.
- Existing `AuthSettings` rows receive the secure migration defaults, and an
  audit-write failure rolls back the setting update.
- The audit record contains previous/new values and actor metadata and is
  committed atomically with the setting.
- Concurrent GET/PATCH activity returns policy, version, and audit metadata
  from a consistent database snapshot.
- Protected AI APIs and private operations remain protected regardless of the
  page setting.
- GatedActionLink no longer relies on a build-time AI-public value while
  unrelated gating remains unchanged.

Run focused Jest tests and the applicable TypeScript/production build checks.
Production multi-instance propagation can only be verified in the deployed
environment; the implementation's no-cache read strategy is designed to
observe the committed database value on the next page request.

## Migration and rollback

The migration adds the non-null boolean policy field with a secure `true`
default, the non-null version field with a `0` default, and the required audit
enum values. PostgreSQL applies the defaults to existing rows. Deploy the
migration before the application code so the new Prisma client never queries
missing columns; the previous application version ignores the added columns
and enum values. Then deploy the app. Existing rows inherit the secure default;
an absent singleton row remains secure through service fallback.

Rollback by reverting application code while leaving the additive columns and
enum values in place. Do not run a destructive schema rollback against
production; the prior application version remains compatible with these
additions. If operationally desired, switch login back ON in the Admin Panel
before reverting the application.
