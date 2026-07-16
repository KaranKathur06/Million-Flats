# MillionFlats Authentication Architecture RFC

Version: 0.1
Date: 2026-07-16
Authors: Principal IAM Architect

Purpose
-------
This RFC prescribes the Authentication & Identity architecture for MillionFlats. It is the authoritative specification for all teams implementing or integrating with the platform's auth system (website, mobile apps, partner portals, CRM, admin). Implementations must conform to this document unless a signed exception is approved.

Executive Summary
-----------------
- Goals: Secure, scalable, auditable, and consistent authentication across products; prevent dead-end flows; provide robust recovery; support millions of users and enterprise account types.
- Non-goals: Full identity governance (IdP for corporate SSO) — out of scope for initial rollout, but supported via adapters.
- Scope: Registration, verification, login, session lifecycle, recovery, provider linking, admin operations, events, monitoring, and service boundaries.
- Success criteria: 95% verification success within 24 hours, zero dead-end registrations, observable metrics for verification and resend, automated cleanup of unverified accounts per policy.

Business Requirements
---------------------
- Supported account types: `user`, `agent`, `developer`, `agency`, `ecosystem_partner`, `admin`.
- Each role has role-specific onboarding and verification requirements (see Role Matrix below).
- Registration must not create irrecoverable accounts; user must always be able to complete verification.
- Admin workflows for manual approval, suspension, merging, and support-assisted recovery.

Role Matrix (high level)
- user: email verification → profile → active
- agent: email verification → profile → KYC documents → admin approval → active
- developer: email verification → company verification → additional docs (GST/RERA) → active after approval
- agency/partner: similar to agent with contractual acceptance and approval
- admin: invite-only or SSO + mandatory MFA

Functional Requirements
-----------------------
- Registration: create user record (status machine), enqueue verification, return a remediation token for UI flows.
- Login: authenticate credentials; if unverified, return generic error with remediation options (do not leak existence) and remediation token.
- Email verification: support magic link (preferred) and numeric OTP fallback. Tokens are single-use and hashed in DB.
- Password reset: standard flow for verified emails; for unverified emails require additional verification before allowing password changes to prevent takeover.
- Session management: server-side sessions with refresh token rotation and revocation endpoints.
- OAuth: support OIDC/OAuth providers with provider adapters; respect provider `email_verified` claim.
- Admin actions: force verify, resend, suspend, unlock, view audit, impersonate (with logging)

Non-Functional Requirements
---------------------------
- Security: hashed tokens, rotation, rate-limiting, CSP, HSTS, CSRF protection, MFA support.
- Performance: registration < 300ms API latency (enqueue only); verification request < 150ms.
- Scalability: event-driven, horizontally scalable workers and stateless services.
- Availability: 99.95% for auth critical paths; graceful degradation to limited-access mode.
- Auditability: immutable logs for verification events and admin actions (90-day retention minimum for audit logs).
- Accessibility: WCAG AA compliant verification pages and accessible email templates.

Authentication State Machine
----------------------------
See the Mermaid lifecycle diagram: `docs/authentication/lifecycle.mmd`.

States (authoritative enum - `User.status`):
- `AUTH_PENDING` (created but not yet queued)
- `EMAIL_PENDING` (verification sent, unverified)
- `EMAIL_VERIFIED` (email verified)
- `PROFILE_PENDING` (profile incomplete)
- `KYC_PENDING` (documents uploaded, pending automated checks)
- `APPROVAL_PENDING` (awaiting admin approval)
- `ACTIVE` (full access)
- `MFA_REQUIRED` (policy enforces step-up)
- `LOCKED` (temporary lockout)
- `SUSPENDED` (manual/automated suspension)
- `SOFT_DELETED` (user requested or TTL purge candidate)
- `DELETED` (hard delete after retention)

Transitions
- Triggers: `UserRegistered`, `EmailSent`, `EmailVerified`, `ProfileCompleted`, `KycUploaded`, `AdminApproved`, `Lockout`, `Suspend`, `Delete`.
- Every transition must be recorded in `AuthAuditLog` with actor and correlationId.

Decision Engine Specification
-----------------------------
See `docs/authentication/decision_engine.md` and `src/lib/decideNextStep.ts`.

Contract (summary)
- Endpoint: `POST /api/decide-next-step` (internal)
- Inputs: `userId | email | sessionId | route | device | featureFlags`
- Outputs: `nextStep (enum)`, `reason`, `payload { remediationToken, verificationExpiresAt, allowedActions, missingFields }`, `meta`
- Policies: deterministic rules first; risk-scoring optional; cacheable with short TTL; all calls produce metrics and trace.

Identity Lifecycle
------------------
- New account: `AUTH_PENDING` -> create `EmailVerification` record -> emit `VerificationRequested` event -> queue email.
- Verification: token validation -> mark `EMAIL_VERIFIED` -> emit `EmailVerified` event -> evaluate `OnboardingProfile` for role.
- Profile completion: update `PROFILE_PENDING` -> if role requires KYC, transition `KYC_PENDING` else `APPROVAL_PENDING` or `ACTIVE`.
- KYC & Approval: KYC service updates -> `APPROVAL_PENDING` -> admin approval -> `ACTIVE`.
- Suspension & Deletion: rules for lockout and use of soft-delete with retention; cleanup jobs to hard-delete.

Database Design Principles
--------------------------
- Data ownership: Auth Service owns `User`, `EmailVerification`, `IdentityProvider`, `AuthSession`, `RefreshToken`, `AuthAuditLog`, `FailedLoginAttempt`.
- Minimal personal data in events; PII stored encrypted at rest (Postgres), with field-level encryption where required.
- Indexing: `email` (ci-unique), `status`, `expiresAt` on verification table, `userId` on sessions.
- Retention & Cleanup: verification records expire and are purged; unverified accounts older than configurable TTL (e.g. 30d) are soft-deleted and then hard-deleted after retention.
- Schema is normalized for core identity tables to be performant and easy to query.

Security Model & Threats
------------------------
Threat model highlights:
- OTP brute-force: mitigations - hashed tokens, attempt counters, progressive lockout, IP rate-limit, CAPTCHA.
- Account enumeration: generic responses on register/login; suppression of explicit existence checks in public endpoints.
- Replay attacks: single-use tokens, immediate invalidation, token rotation.
- Token leakage: short lifetimes, refresh rotation, server-side revocation lists.
- Session hijacking: secure cookies, SameSite, device records, impossible-travel detection and step-up.
- Email delivery risks: verify ESP bounces and suppress repeatedly failing addresses.

Token & OTP policies
- Magic link tokens: cryptographically random, 32+ bytes, HMAC signed or stored hashed with salt. Expiry: short, e.g. 15–30 minutes.
- Numeric OTP: 6 digit, use HMAC with secret+salt, expiry 5–10 minutes, max 5 attempts.
- Refresh tokens: rotating, stored hashed server-side, revocable.

Event-Driven Architecture
-------------------------
Key events (JSON schema required):
- `UserRegistered` { userId, email, role, correlationId }
- `VerificationRequested` { verificationId, userId, method }
- `EmailSent` { verificationId, provider, sentAt }
- `EmailDelivered`/`EmailBounced` { verificationId, status }
- `EmailVerified` { verificationId, userId, verifiedAt }
- `AccountActivated` { userId, activatedAt }
- `PasswordResetRequested` { requestId, userId }
- `SessionCreated` / `SessionRevoked`

Transport: durable queue (Kafka/SNS+SQS) with idempotent consumers and DLQ. Consumers: Notification Worker, CRM sync, Analytics, Referral service.

Service Boundaries
------------------
- Auth Service: user CRUD, decision engine API (may be separate), session validation, RBAC for admin.
- Verification Service: token lifecycle (create/validate/invalidate), verification record store, audit writing.
- Notification Service: queue workers and ESP adapters, delivery tracking, retry logic.
- Session Service: session storage (Redis), session revocation and refresh logic.
- Audit Service: write-once audit store for compliance queries.
- Integrations: connectors for CRM, Analytics, Billing, Referral, KYC, Identity Providers.

API Standards
-------------
- REST conventions; use `/api/auth/...` namespace.
- Use JSON:API-like structure for errors. Example:
  - 400 { code: "invalid_input", message: "...", fieldErrors: [...] }
  - 429 { code: "rate_limited", retryAfter: 60 }
  - 403 { code: "unverified", remediation: { remediationToken }}
- Idempotency: POST endpoints that create resources must accept `Idempotency-Key` header.
- Versioning: include `v1` in public endpoints and support compatibility headers.
- Authentication: internal service tokens for internal APIs, OAuth or session cookies for user APIs.

Operational Monitoring
----------------------
- Metrics: `auth.registration.count`, `auth.verification.sent`, `auth.verification.success`, `auth.verification.expired`, `auth.resend.count`, `auth.login.success`, `auth.login.failure`, `auth.lockout.count`.
- Dashboards: Grafana/Datadog dashboards for the above and email bounce rates.
- Alerts: high bounce rate (>5%), verification success rate fall below threshold, sudden surge in resend attempts.
- Tracing: OpenTelemetry traces across services using `correlationId` from registration.

Testing Strategy
----------------
- Unit tests for token generation/validation, decision engine rules, and edge handling.
- Integration tests for register->verify->login flows using test queue and test ESP adapters.
- E2E tests for UI flows (verification page, resend, change-email).
- Security tests: fuzzing OTP endpoints, rate-limit stress tests, pentest before production.
- Load tests: verification throughput and worker scale test (simulate large registrations).

Migration & Rollout Plan
------------------------
Principles: backwards-compatible, feature-flagged, observable.
Phases:
- Canary: wire verification service in read-only or duplicate-write mode; no user-visible changes.
- Beta: opt-in for new verification flow for a subset of traffic.
- Gradual rollout: increase traffic, monitor KPIs.
- Cutover: flip feature flag, disable legacy path.
- Cleanup: retire legacy code after stable period.

Rollback: each deploy must include a rollback plan to revert to previous feature-flag state and DB-compatible schema migration scripts with down steps.

Future Roadmap
--------------
- Multi-factor (U2F/WebAuthn & OTP)
- Passkeys & Passwordless
- SMS/WhatsApp verification providers
- Enterprise SSO (SAML/OIDC) with tenant onboarding
- Risk-based adaptive authentication and ML scoring
- Identity governance & SCIM provisioning for enterprise customers

Acceptance Criteria
-------------------
- RFC reviewed and approved by Security, Platform, Product, and Support leads.
- Diagrams and decision engine contract implemented and stored in repo.
- Test plan approved and CI pipelines include verification tests.

Artifacts & References
----------------------
- Lifecycle diagram: `docs/authentication/lifecycle.mmd`
- Sequence diagrams: `docs/authentication/sequence_diagrams.mmd`
- Decision Engine spec: `docs/authentication/decision_engine.md`
- Decision Engine stub: `src/lib/decideNextStep.ts`

Next Steps (immediate)
----------------------
1. Review & sign-off on this RFC.
2. Proceed to Phase B (Prisma models + migrations) once approved.
3. Create policy configurations for decision engine and rate-limits.

