# MillionFlats Ecosystem Partner Experience — Design

**Status:** Proposed design for user review  
**Scope:** Ecosystem partner access, partner operations, and inquiry/CRM integration only  
**Date:** 2026-11-01

## 1. Goals

Extend the existing MillionFlats ecosystem rather than introduce parallel systems. The experience serves:

- Public visitors, who can view the ecosystem introduction, category summaries, and educational content.
- Registered users, who can browse approved partner directories and profiles and submit inquiries.
- Approved partner members, who can manage authorized partner information and their organization’s leads.
- MillionFlats administrators, who govern categories, partner approval, visibility, membership, and sensitive changes.

The design reuses the existing NextAuth identity, Prisma records, CRM, S3/CloudFront helpers, notifications, and Command Center. It does not design or implement video advertising or Passport.

## 2. Repository audit and implementation map

### Platform and shared services

| Area | Existing implementation | Reuse / extension |
|---|---|---|
| Application | Next.js 14 App Router, React, TypeScript, Tailwind CSS | Keep current route and component conventions. |
| Database | PostgreSQL with Prisma 5; primary schema is `prisma/schema.prisma` | Add only partner-scoped access and necessary CRM integrity/idempotency data. Preserve existing rows. |
| Authentication | NextAuth JWT session in `lib/auth.ts`; authorization helpers in `lib/rbac.ts` and `lib/rbacServer.ts` | Use existing session and `User` records. Do not add a separate login or a global ecosystem role. |
| Roles | Prisma `Role` includes `USER`, `BUYER`, `AGENT`, `DEVELOPER`, `AGENCY`, `MODERATOR`, `VERIFIER`, `ADMIN`, and `SUPERADMIN` | `SUPERADMIN` is the actual enum spelling. Partner access must come from partner-scoped membership, not a new account-wide role. |
| Admin authorization | `requireAdminSession()` in `lib/adminAuth.ts` delegates to `requireRole('MODERATOR')` | Reuse for administrative APIs; retain stricter existing RBAC for sensitive actions as applicable. |
| CRM | `Lead`, `LeadActivity`, `LeadNote`, and `LeadFollowUp` models; `lib/leads/createLead.ts` and `lib/leads/notifications.ts` | Make `Lead` the canonical live destination for partner inquiries. Extend existing services and lifecycle. |
| Audit | Shared `writeAuditLog` plus ecosystem-specific audit helpers | Use existing audit services for membership, moderation, and governance changes. |
| Media | `lib/s3.ts`, CloudFront URL helpers, and private/public key conventions | Reuse existing S3 upload and media patterns for partner media; keep verification documents private. |
| Rate limiting | `lib/redis.ts` exposes optional Redis helpers; `incrWithExpiry` returns `0` when Redis is not configured | Do not treat the current helper’s missing-Redis return as an allowed request. Inquiry throttling must explicitly handle missing/unavailable Redis. |
| UI conventions | Existing ecosystem category/profile components and admin shell | Extend the existing components and Command Center; do not create a separate admin portal. |

### Existing ecosystem implementation

- All 12 requested category slugs are represented in the admin category endpoint and existing category routes.
- `EcosystemCategory` is database-backed. `EcosystemPartner` already stores approval/visibility, profile, coverage, category-specific data, and featured state.
- Category content is not fully dynamic yet: `lib/ecosystem/categoryConfig.ts` contains category presentation, and `app/api/admin/ecosystem-partners/categories/route.ts` uses a fixed `COMPLETE_CATEGORY_SEED` fallback list.
- Related profile models already exist for services, locations, gallery, portfolios, reviews, FAQs, and media.
- `EcosystemPartnerApplication` stores application details and uploaded documents. Its current application route uses the existing public/private S3 conventions.
- The category listing path uses `lib/ecosystem/categoryPage.tsx`, `components/ecosystem/EcosystemCategoryLanding`, and `lib/ecosystem/fetchPublicPartners.ts`.
- Partner profile pages already exist at `/partners/[slug]/[partnerSlug]` and render portfolio, services, locations, FAQs, and contact actions.
- Partner profile records currently have no owner or organization-membership relation.
- `app/api/ecosystem/partners` and the legacy `app/api/ecosystem-partners/partners` endpoint use the shared public partner query without a session check. The profile page likewise loads partner data without authentication.
- `EcosystemLead` is a separate ecosystem-specific lead store. The inquiry endpoint `app/api/ecosystem-partners/leads` writes there. Partner onboarding also writes to unified `Lead`; the admin ecosystem route redirects into the unified lead list.
- Existing partner admin APIs and pages manage records, categories, media, banners, and governance. The admin Command Center already has an Ecosystem navigation group.

### Related capabilities audited for future phases

- Homepage currently includes a click-to-load Wistia presentation (`components/MetaDologyVideoSection.tsx`), not a catalog of property/partner reels. Project videos exist, but no dedicated commercial video inventory or featured-slot models/routes were found in the inspected schema/API paths.
- `lib/s3.ts` supports existing S3 upload flows and public/private asset keys. No video transcoding or streaming pipeline was identified in the inspected implementation.
- Razorpay is already integrated through `lib/razorpay.ts`, agent payment routes, package checkout routes, and `app/api/webhooks/razorpay`. The webhook verifies signatures and has idempotency records. `PackagePurchase` and `PackageEntitlement` support one-time packages; no Passport-specific product/membership models were found. These are future-phase dependencies, not part of this design.

### Audit limitation

The repository is read-only at this stage. `git status` and recent-commit inspection could not run because the sandboxed PowerShell process could not reach its local proxy. No claim is made about worktree cleanliness or recent commit history.

## 3. Architecture decisions

### 3.1 Public and authenticated surfaces

- `/ecosystem-partners` remains public and presents the introduction, category list, benefits, and general educational content.
- Existing category routes remain accessible for their informational and educational content. They do not query or serialize partner names, profile data, or directory results for unauthenticated visitors.
- The directory area is an authenticated surface. The page renders a login/register gate when no valid session exists; the server does not fetch protected partner records for that request.
- Partner profile pages and APIs require authentication. Public metadata and structured data must not expose protected partner details.
- Directory, profile, lead, and dashboard APIs independently enforce authorization. Hiding a link or client-side component is not an access-control boundary.
- Approved and active partners remain the only partners eligible for authenticated customer listings. Suspended, pending, rejected, inactive, or otherwise unpublished records are not returned.

### 3.1.1 Category governance

`EcosystemCategory` remains the single source of truth; do not add another category model. The Command Center must manage category title, slug, description, hero image, SEO fields, active state, and ordering. Replace the API’s hard-coded fallback list with an idempotent one-time seed/migration for the 12 existing slugs. Do not silently recreate an admin-disabled category on reads.

Preserve the current differentiated category experiences and their stable URLs. Existing special tools remain explicit category components selected by slug; categories created later use a generic configured category template. A category cannot be permanently deleted while partner or lead records reference it; administrators deactivate it instead. Slug collisions are rejected.

### 3.1.2 Partner profile presentation

The authenticated `/partners/[categorySlug]/[partnerSlug]` route uses one shared, responsive profile shell for all 12 categories. The HTML files in `public/ecosystem pages` are product/design references, not runtime pages or sources of partner facts. The live profile is composed from the existing partner, category-field registry, service, location, portfolio/gallery, review, FAQ, and CRM inquiry data.

The profile shell follows the reference information hierarchy: partner identity and verified status; available partner metrics; section navigation; category-aware details and services; portfolio/gallery; partner-provided trust/process/review/FAQ content; and a consultation form alongside the profile on wide screens. Styling uses MillionFlats navy, white, and gold tokens, with responsive layouts and no duplicated site navigation.

Only persisted partner facts may be presented as rates, regulatory credentials, response SLAs, offers, or service guarantees. Missing optional profile content is omitted or represented by a neutral visual placeholder; it must not be filled with unrelated category copy, fictional reviews, platform branding as the partner logo, or demo calculator values. Until partner-specific quote inputs and formulas are governed by persisted data, category interactions collect service intent and route it through the existing consent-based CRM inquiry flow rather than returning a fabricated estimate.

### 3.2 Partner identity and membership

Add a partner-scoped membership model linked to the existing `EcosystemPartner` and `User` records. It supports multiple people in an organization without changing global authentication roles or misusing global `TeamAccess`.

The membership model should include:

- Partner and existing user references, with a pending-invitation state before account association where necessary.
- A normalized invitation email, invitation token hash and expiry, activation/revocation state, and timestamps.
- Organization-scoped roles: `OWNER`, `ADMIN`, and `MEMBER`.
- Unique constraints preventing duplicate active membership for the same partner/user and duplicate pending invitations for the same partner/email.
- Foreign keys and indexes supporting partner/user authorization queries.

Only verified MillionFlats accounts can accept invitations. Existing approved partners receive no automatic owner assignment: an authorized platform administrator verifies the partner representative and sends or associates the first owner membership explicitly. An administrator may associate a verified existing account during approval. Do not grant access solely because a submitted application email matches an unverified session email.

Invitation lifecycle:

1. An existing partner `OWNER`/`ADMIN` or authorized platform administrator invites a normalized email.
2. Generate a cryptographically random, single-use token; store only its hash, invitation timestamp, and seven-day expiry. Send the invitation through the existing email service.
3. Acceptance requires an authenticated account with verified email exactly matching the invitation. If no account exists, the recipient first completes the existing registration and email-verification flow.
4. In one transaction, confirm the invite is pending and unexpired, associate the user, activate membership, and consume the token.
5. Repeated acceptance is idempotent for the same active membership; reused, expired, revoked, or email-mismatched tokens cannot grant access. A pending invite may be resent, which invalidates the previous token. Revocation and role changes take effect immediately.
6. Only platform administrators can create or transfer an `OWNER` role. A partner must always retain at least one active owner; owner transfer/revocation uses a transaction that serializes changes for the partner, rejects removal of the final active owner, and records the before/after membership state.

The role policy is:

| Action | OWNER | ADMIN | MEMBER |
|---|---:|---:|---:|
| View all partner leads | Yes | Yes | No |
| View assigned partner leads | Yes | Yes | Yes |
| Assign/reassign leads to active partner members | Yes | Yes | No |
| Change status/add follow-up to any partner lead | Yes | Yes | No |
| Change status/add follow-up to an assigned lead | Yes | Yes | Yes |
| Edit low-risk public profile fields | Yes | Yes | No |
| Submit sensitive profile changes for review | Yes | Yes | No |
| Invite/revoke ADMIN or MEMBER accounts | Yes | Yes | No |
| Grant/revoke OWNER or alter platform verification/visibility | No | No | No |

Platform administrators retain the existing approved governance authority. Partner roles cannot change category, approval, active/suspended, verified, featured, or subscription state.

Authorization requires all of:

1. A valid existing MillionFlats session and an active user account.
2. An active membership for the requested partner and user.
3. An approved and active partner record.
4. A membership role that grants the requested operation.

Partner members are scoped to one or more explicit partner memberships. Cross-partner access returns a non-disclosing not-found response where appropriate. Suspended partners and revoked members fail closed.

### 3.3 Partner editing and moderation

Partners edit only allowlisted business information. Sensitive fields are not written directly to the live profile:

- Low-risk fields that may publish immediately with before/after audit records: `tagline`, `shortDescription`, `description`, `locationCoverage`, services, locations, gallery, portfolios, and FAQs.
- Fields staged for administrator review: legal/business name, logo/cover media, contact person/email/phone/WhatsApp, website, GST/registration details, pricing range, category-specific offer data, service-area changes, and certification/document changes.
- Fields not editable through partner self-service: category, approval status, active/suspended status, verification state, featured state, priority, and subscription tier.
- Rejections include an administrator reason and leave the previously approved public values unchanged.
- Review actions, membership changes, partner status changes, and visibility changes use the existing audit infrastructure.

The exact field allowlists are centralized and tested. Unknown fields are rejected, not silently ignored.

### 3.4 Unified CRM and inquiry flow

`Lead` becomes the single live CRM destination for new partner inquiries. Extend the existing lead creation service to accept the partner association rather than creating new CRM records or duplicating every inquiry into `EcosystemLead`.

Each inquiry records the available existing CRM fields plus:

- Customer account ID for authenticated customers.
- Partner ID and category.
- Requested service and message.
- Inquiry source/page and relevant campaign attribution.
- Required consent to share the submitted inquiry with the selected partner, plus separate optional marketing/communication preferences.
- Submission/idempotency key.
- Existing lead status, assignment, activity, notes, and follow-up history.

Use the existing CRM lifecycle and activity infrastructure. Partner dashboards query by authorized `ecosystemPartnerId`; owners/admins may view organization leads, while members are limited to leads assigned to them and the allowed status actions. The idempotency key is unique on `Lead`; repeated requests with the same key and payload return the original lead, while reuse with a different payload returns `409`. A deliberate new submission uses a newly generated key.

Use existing email/notification services to notify the customer, the partner’s permitted contact, and administrators. Persist the lead before sending. If notification delivery fails, return the persisted lead ID with an explicit notification-pending result, log the failed recipient/provider outcome, and expose an administrator retry action through the existing lead workflow. Retrying notification must not create another lead. Do not report that a notification was delivered when it was not.

Historical `EcosystemLead` records are preserved. A retry-safe backfill maps each source row into `Lead` with `legacyTable = 'ecosystem_leads'` and `legacyId = EcosystemLead.id`, relying on the existing composite unique constraint for idempotency. Copy category, partner, contact details, requirement/message, city, budget, source, assignment, status, and timestamp; retain the exact legacy status string and store unmapped source attributes in CRM metadata. Before insert, reconcile possible existing CRM duplicates; report ambiguous matches rather than deleting or merging them automatically.

Cutover is write-once to unified CRM, not dual-write: first deploy the compatibility API that writes `Lead`, allow old app instances to drain, then run/re-run the final-delta backfill until no new legacy rows appear. The old table remains read-only history. The old endpoint URL may remain as a compatibility route, but it must write only unified `Lead`.

### 3.5 Admin integration

Continue using the existing Command Center and ecosystem navigation. Extend existing partner administration with:

- Partner-to-user membership creation/invitation, role change, and revocation.
- Staged sensitive profile-change review with reasons and audit history.
- Existing category and partner visibility management.
- Unified CRM lead list and lifecycle actions.

Do not create a second admin application or independent partner CRM.

## 4. Proposed API and route changes

Keep established routes where possible; names below are logical changes, not a requirement to duplicate existing route groups.

| Surface | Proposed behavior |
|---|---|
| `/ecosystem-partners` | Public introduction and category summaries. |
| Existing category routes | Public educational content; authenticated server-rendered partner directory only. |
| `/partners/[slug]/[partnerSlug]` | Require an authenticated active user; return only approved public profile data. |
| `/dashboard/ecosystem-partner` | Partner member dashboard; load the authorized membership and partner server-side. |
| `/api/ecosystem/partners` | Require a valid user session before returning partner directory records. |
| Legacy `/api/ecosystem-partners/partners` | Preserve compatibility only if needed; apply the same session and projection rules as the canonical endpoint. |
| `/api/ecosystem/partners/[id]` | Require a valid session and approved profile visibility. |
| Existing admin category API | Replace fixed fallback behavior with database-backed create/update/activate/deactivate/reorder operations and uniqueness validation. |
| `/api/ecosystem/inquiries` | Validate input, enforce registered-user access and idempotency, create unified CRM lead, apply inquiry rate limits, and trigger existing notifications. |
| Partner dashboard APIs | Require active partner membership, partner status, and per-operation role checks on every request. |
| Existing admin ecosystem APIs | Reuse existing admin session protection; add membership and staged-change governance actions. |

All request payloads use the repository’s Zod validation patterns. Media mutation routes verify membership, partner ownership, file limits/types, and storage-key prefixes server-side.

## 5. Data and migration plan

### Additive schema changes

1. Add partner-scoped membership and membership-role/status enums.
2. Add a partner change-request model for staged sensitive edits, including proposer, requested changes, status, reviewer, reason, and timestamps.
3. Add a CRM inquiry idempotency key with a unique constraint and normalized payload hash, and an index for partner/time lead queries.
4. Keep `EcosystemCategory` as the category model; migrate the existing 12 category definitions into database rows and remove read-time creation/fallback behavior.
5. Add or strengthen user/partner relations only after checking existing data for orphans and uniqueness conflicts.
6. Preserve all existing ecosystem categories, partners, applications, media, leads, and payment models.

### Safe rollout sequence

1. Inventory category slug uniqueness, partner status consistency, existing partner leads, orphaned user/partner references, and potential overlap between `EcosystemLead` and `Lead`.
2. Apply an additive Prisma migration; do not drop tables, columns, or production records.
3. Upsert the existing category records by slug, preserve admin-disabled state, and switch category administration to database-backed CRUD.
4. Deploy membership services and protected dashboard APIs without changing current public reads yet. Test invite issue, delivery, accept, expiry, resend, replay, and revocation.
5. Deploy the compatibility inquiry writer to unified `Lead`; drain old application instances.
6. Backfill all `EcosystemLead` records, then run a final-delta pass and reconcile source/target counts, statuses, and possible preexisting duplicates.
7. Switch admin ecosystem lead views to unified CRM; keep the old table read-only.
8. Gate directory/profile reads on the server and deploy the public informational/login-gate behavior.
9. Verify access, query counts, notification outcomes, and rollback behavior before broad production enablement.

Each rollout step has a gate:

| Step | Completion gate | Rollback |
|---|---|---|
| Additive schema and membership APIs | Prisma validation, invitation lifecycle tests, ownership tests, and existing application tests pass. | Disable the new dashboard/invitation surface; retain additive tables and data. |
| Category administration | Existing slugs and category presentations reconcile; CRUD, deactivate, ordering, and slug-conflict tests pass. | Restore the previous admin category interface while retaining additive category records. |
| Unified CRM writer and legacy backfill | Same-key idempotency, payload mismatch, final-delta backfill, and source/target reconciliation pass. | Stop the cutover and keep unified data; preserve legacy rows, do not delete or dual-write. |
| Admin CRM view cutover | Admin ecosystem filters, pagination, status actions, assignment, and lead counts operate on unified `Lead`; no active admin view depends on new `EcosystemLead` writes. | Keep the existing unified CRM route and restore the prior admin filters if the new query surface fails; retain legacy rows. |
| Directory/profile access gate | Anonymous route and API tests prove no partner data is serialized; authenticated directory/profile tests pass. | Keep directories hidden behind the login gate while fixing; never fall back to public partner data. |
| Production enablement | Focused permission, notification retry, rate-limit, migration, and build checks pass in staging. | Disable affected self-service features and keep admin-managed records available. |

No destructive production migration is authorized by this design. If a release phase fails, retain additive schema/data and disable the affected new surface; do not roll back by deleting migrated `Lead` records. The compatibility API continues writing to the unified CRM after cutover.

## 6. Failure handling and security

- Missing session: `401` on protected APIs; page routes show the existing login/register path.
- Authenticated user without a valid partner membership: `403` for dashboard operations; avoid disclosing another partner’s existence through object-ID lookups.
- Pending/rejected/suspended/inactive partner: deny dashboard mutations and do not return public directory/profile data.
- Invalid role, input, or media: return a clear validation response; do not silently ignore disallowed fields.
- Database failures: surface a server error and log a request correlation ID; do not return success-shaped empty partner or CRM data.
- Inquiry retries: use one request idempotency key per submitted inquiry so network retries cannot create duplicate leads. A deliberate new submission uses a new key.
- Inquiry abuse controls: allow at most five newly accepted inquiries per authenticated account per 15 minutes and 30 per trusted source IP per 15 minutes; idempotent retries do not consume additional quota. Use Redis with atomic counters and fixed-window expirations. `REDIS_URL`/`REDIS` must be configured for production inquiry submission; missing or unavailable Redis returns an explicit `503` rather than silently bypassing limits. Resolve source IP only through the configured trusted proxy chain.
- Notification failures: persist the lead first; return its ID with `notificationStatus: "pending"`, log the failed delivery, and allow an administrator to retry through the existing lead workflow. Retry is idempotent and does not create another lead.
- Sensitive partner documents remain private; public profile APIs never return document keys, application payloads, or payment/auth metadata.
- Enforce account status, membership, ownership, and field-level permissions in server handlers—not middleware navigation alone.

Authenticated directory/profile responses use explicit response projections. Directory responses may include partner ID/slug, business name, category, logo/cover image, short description, verification badge, rating, experience/project counts, and approved coverage/pricing display fields. Detailed profiles may additionally include approved descriptions, services, locations, portfolio/gallery, approved reviews/FAQs, and an approved website link. Direct email, phone, WhatsApp, GST/registration values, application data, private documents, and internal moderation fields are not returned; customers use MillionFlats inquiry CTAs for contact.

## 7. Testing and acceptance criteria

### Access and isolation

- Public users can read the introduction and category education but cannot receive partner directory/profile records from server pages or APIs.
- Both `/api/ecosystem/partners` and the legacy `/api/ecosystem-partners/partners` reject anonymous requests and return the same approved-data projection to authenticated users.
- Registered active users can browse only approved/active partners and their approved profile information.
- A pending or suspended partner member cannot access the dashboard.
- A partner member cannot read, update, upload, or delete another partner’s profile, media, or leads by changing an ID.
- A revoked membership and suspended partner lose access immediately, including through stale dashboard URLs.
- Owner/admin/member permissions are tested against the exact role matrix above, including the final-owner invariant and lead assignment boundaries.
- Invitation tests cover verified-email matching, unregistered invitees, expiration, resend invalidation, token replay, revocation, and concurrent acceptance.
- Profile API tests assert the response allowlists and prove that private/contact/governance fields cannot be serialized.

### CRM and moderation

- New inquiries create exactly one unified `Lead`, with customer, partner, category, service, source, consent, and idempotency data.
- Duplicate HTTP retries with the same idempotency key return the existing lead; a new explicit inquiry can create a new lead.
- Reusing an idempotency key with a different normalized payload returns `409` and does not alter the original lead.
- Account and IP rate limits reject excess distinct submissions without blocking valid idempotent retries.
- Missing/unavailable Redis returns an explicit `503`; no inquiry is accepted without the specified production rate limiting.
- Historical backfill is repeatable, maps all legacy fields/statuses, reconciles potential overlap, and does not create duplicates or delete source history.
- Lead status, assignment, activities, notes, and follow-ups remain visible to only authorized members.
- Sensitive edits remain unpublished until approval; rejection preserves existing live values and records the reason.
- Email/notification failure returns the persisted lead with pending notification status; administrator retry delivers notifications without creating another lead.

### Governance and migration

- Admin member invitations, role changes, revocations, approvals, rejections, suspensions, and visibility changes are audited.
- Category upserts do not create duplicate category records.
- Category create/update/deactivate/reorder is database-backed; disabled categories stay disabled after reads and referenced categories cannot be permanently deleted.
- Migration tests cover duplicate legacy records, orphan references, and a repeated backfill.
- Cutover tests prove no new inquiry is written to `EcosystemLead` after old instances drain; rollback tests retain all unified CRM leads.
- Existing approved partners receive owner membership only through explicit, audited administrator verification; no membership is created from an email match alone.
- Run focused tests, Prisma validation/generation, and the production build after implementation; production rollout also requires a reviewed migration plan.

## 8. Dependencies and unresolved decisions

- The implementation must confirm how existing partner approval records are associated with a verified MillionFlats account and ensure private document uploads remain private.
- Exact role-to-lead action mapping and field allowlists must be encoded in one server-side policy and reviewed in tests.
- Notification delivery and retry behavior must use the repository’s existing email/notification infrastructure; no separate notification queue is specified here.
- No configurable partner-edit moderation setting is proposed; the default is immediate publication for low-risk edits and review for sensitive edits.
- The separate video discovery/advertising and Passport product require their own repository audit and design cycles. Existing Wistia/project-video and Razorpay/package infrastructure is reusable context, not a production-ready implementation of those products.

## 9. Definition of done for this project

- The ecosystem intro and category education remain public without exposing protected partner records.
- Registered users can browse approved partner directories/profiles and submit service inquiries.
- Approved partner organizations have isolated, multi-member dashboard access using existing MillionFlats identities.
- New inquiries are recorded in unified `Lead`, visible through existing CRM workflows, and correctly notified.
- Partner profile changes, membership, and governance have server-side permissions and audit history.
- Existing partner/category/application/history data remains intact after additive migrations.
- Focused permission, CRM, migration, and build validation passes before production enablement.
