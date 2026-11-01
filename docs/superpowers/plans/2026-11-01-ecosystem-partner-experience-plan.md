# MillionFlats Ecosystem Partner Experience — Implementation Plan

**Design:** [Ecosystem partner experience design](../specs/2026-11-01-ecosystem-partner-experience-design.md)  
**Scope:** Ecosystem access, partner operations, category governance, and unified CRM migration  
**Order:** Additive schema and services first; protected surfaces only after authorization tests.

## Phase 0 — Baseline and schema safety

1. Re-check the current Prisma schema, migration conventions, generated client, ecosystem routes, partner visibility projections, lead lifecycle, email delivery, rate-limit utilities, and admin authorization.
2. Record current category slugs and active/disabled state; check partner references, lead counts and duplicate/ambiguous CRM mappings.
3. Add additive Prisma models/enums for partner membership and staged partner edits, relations from existing `User`/`EcosystemPartner`, unique constraints, and query indexes.
4. Add unified-Lead inquiry idempotency/payload-hash data without changing existing CRM semantics.
5. Validate Prisma schema and generate the client. Produce migration SQL through the repository’s Prisma migration flow after reviewing generated SQL; do not apply to production.

**Gate:** Existing schema and generated-client checks pass; no destructive migration operations; duplicate/orphan inventory is documented in tests or migration safeguards.

## Phase 1 — Partner membership and governance services

1. Implement a shared authorization helper that requires an active MillionFlats user, approved/active partner, active partner membership, and role permission.
2. Implement invitation issuance, hashed single-use token, seven-day expiry, verified-email acceptance, resend invalidation, revoke, and transactional final-owner protection.
3. Implement a central role/action matrix and partner-edit allowlists. Reject unknown/disallowed fields.
4. Implement staged change requests and audited approve/reject flows for sensitive fields; immediate low-risk edits are audited.
5. Add focused unit/integration tests for membership authorization, concurrent invite acceptance, token replay/expiry, final-owner protection, sensitive-change staging, and audit records.

**Gate:** Role matrix and invite lifecycle tests pass; no account-wide role changes or partner-ID trust from client input.

## Phase 2 — Dynamic category governance

1. Add an idempotent data migration/seed for the 12 canonical category slugs using existing rows and preserving administrator-controlled disabled states.
2. Replace read-time fallback category creation with database-backed category retrieval.
3. Extend the existing admin category surface/API for create, update, activate/deactivate, order, and SEO/hero fields.
4. Preserve category-specific content tools and stable category routes; use a configured generic presentation for categories without bespoke tools.
5. Test slug conflicts, disable persistence, referenced-category deactivation, CRUD, and ordering.

**Gate:** No duplicate category records; disabling a category is durable; all existing routes resolve their prior category slugs.

## Phase 3 — Authenticated directory and partner profiles

1. Add session checks to category server data loading, directory APIs, profile page/metadata and profile-related APIs.
2. Keep category education public; only render/fetch partner records for authenticated sessions.
3. Define explicit directory/detail response projections. Exclude direct contact values, private documents, application data and moderation/payment/auth metadata.
4. Apply the same protections to the legacy `/api/ecosystem-partners/partners` route.
5. Add an authenticated partner inquiry CTA and regression tests proving anonymous responses contain no partner data.

**Gate:** Anonymous page/API tests prove no protected partner data is fetched or serialized; authenticated users see only approved/active partners.

## Phase 4 — Unified CRM cutover and inquiry flow

1. Extend `Lead` and the existing `createLead` service for partner association, inquiry service/source, customer consent/preferences, unique idempotency key and payload hash.
2. Implement per-account and trusted-IP inquiry rate limits with Redis atomic fixed-window counters; production requests fail with `503` if Redis is missing or unavailable.
3. Update the existing inquiry endpoint and any legacy alias to write only unified `Lead`.
4. Persist first, notify customer/partner/admin via existing services, return notification-pending outcome on delivery failure, and support idempotent admin retry.
5. Write an idempotent backfill for `EcosystemLead` into `Lead`; preserve exact legacy status, map fields/metadata, reconcile likely duplicates, and keep source rows read-only.
6. Update existing admin ecosystem lead workflows to operate on unified CRM.
7. Test same-key retries, payload mismatch, rate limits, notification failures/retries, backfill repeatability, final-delta cutover, and CRM permissions.

**Gate:** Reconciliation passes; old writes are drained; no new `EcosystemLead` records are created; no source rows are deleted.

## Phase 5 — Partner dashboard and self-service APIs

1. Add `/dashboard/ecosystem-partner` within existing dashboard routing conventions.
2. Add server-loaded partner context and dashboard sections for profile, services/media, leads/status, analytics, documents and account/member settings.
3. Implement partner-owned APIs for allowed profile edits, services/media, lead list/detail/status/follow-up, and membership invites.
4. Enforce the design’s role matrix and field allowlists in every handler; audit every sensitive or administrative action.
5. Add ownership/IDOR, role-permission, suspended partner, revoked membership, upload authorization, and dashboard error/empty-state tests.

**Gate:** Cross-partner access is denied for all dashboard APIs; edits and media cannot escape authorized partner scope.

## Phase 6 — Admin Command Center integration

1. Extend the current Ecosystem admin navigation and pages for membership, staged change review, category management and partner CRM.
2. Preserve existing approval/suspension/feature controls and enforce existing role restrictions for financial/configuration decisions.
3. Add auditable before/after state and reasons for membership, partner status/visibility, and staged-edit decisions.
4. Test authorized admin roles and denial for lower roles.

**Gate:** All governance actions use the existing Command Center and audit history; no separate admin panel.

## Phase 7 — Staging verification and production readiness

1. Run focused Jest tests, Prisma validation/generation, schema/migration checks, type checking where available, lint, and production build.
2. Run integration tests for public/user/partner/admin permissions, inquiry lifecycle, invitation lifecycle, backfill/reconciliation and notification failure.
3. Review migration SQL and run against a staging database snapshot; verify rollback plan retains additive schema and data.
4. Confirm Redis rate limits, email delivery configuration, private S3 access, trusted proxy IP handling, and operational alerting.
5. Ship behind a controlled rollout: membership APIs, CRM writer/backfill, authenticated directory, then partner dashboard/admin management.

**Gate:** All focused checks pass in staging; no unresolved high-risk access-control or CRM integrity issue; production rollout has an approved migration/rollback plan.

## Dependencies and non-goals

- The design’s partner membership, CRM, user identity, and admin governance decisions are prerequisites.
- This plan does not implement video discovery/paid advertising or MillionFlats Passport; each needs its own design and plan.
- It does not create a new authentication system, CRM, notification service, media store, or admin application.
- Production migration execution and production enablement require explicit operational review and are not implied by local implementation.
