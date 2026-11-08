# Ecosystem Partner Public Access — Implementation Plan

**Design:** [Ecosystem Partner Public Access — Audit and Design](../specs/2026-11-04-ecosystem-partner-public-access-design.md)  
**Scope:** Public category directories, approved partner profiles, and anonymous enquiries  
**Status:** Approved for implementation planning; implementation has not started

## Objective

Remove the sign-in barrier from all twelve existing Ecosystem Partner category directories, approved partner profiles, and enquiry submissions. Reuse existing partner records, visibility policy, public projections, CRM lead creation, notifications, and Redis rate limiting. Keep partner management and administration protected.

Do not include video/reels/advertising or Passport in this plan.

## Non-negotiable behavior

- Every existing ecosystem category route and approved public partner profile works when logged out.
- Only partners with `status=APPROVED` and `isActive=true` in an active category are publicly visible.
- Directory, profile, metadata, structured data, and public APIs do not expose partner email/phone, documents, internal verification data, memberships, or leads.
- Contact is through the existing public enquiry form; account creation and verified account email are not required.
- Public enquiries are created in the existing `Lead` CRM and are idempotent.
- Production enquiry writes require `ECOSYSTEM_PUBLIC_INQUIRIES_ENABLED=true`, Redis availability, and an edge-verified `x-real-ip`; the flag defaults to disabled if unset.
- Partner dashboards, partner-owned APIs, private CRM, and admin moderation remain protected.
- Partner application submission remains public and pending review; submission never publishes a partner.
- No schema migration, new CRM, new category/partner model, new auth system, new CAPTCHA vendor, or new public URL is planned.

## Phase 0 — Baseline and public-field audit

1. Check worktree status and branch before editing. Preserve all unrelated user changes.
2. Inventory all twelve category field-registry definitions and record the exact allowlisted `categoryData` keys and public price/rate fields that may be returned publicly. Exclude email/telephone fields, unknown keys, and any unregistered value; omit pricing unless explicitly marked public. Save this inventory as a required implementation artifact/test fixture before changing public profile projections.
3. Trace writes to partner services, locations, gallery, portfolios, FAQs, and profile fields. Confirm that existing partner approval/publication is their publication boundary and identify fields that must be omitted from public projection.
4. Inspect the active `EcosystemPartnerDirectoryClient` and its enquiry form to identify current request payloads, form state, login prompts, empty/loading/error states, and existing category-specific filters.
5. Inspect all inquiry route aliases, application flow, API consumers, error conventions, Redis configuration, trusted proxy settings, and relevant tests. Confirm that both directory endpoints share the same projection and public visibility predicate. Confirm source attribution is restricted to fixed `sourceType` and a server-derived category/profile path without query/fragment; reject visitor-supplied UTM, referrer, and URL fields.
6. Document the trusted source-IP contract with the platform/deployment owner: the origin must be inaccessible except through the trusted edge, and the edge must strip client-provided `x-real-ip` and overwrite it with the connection IP. Do not trust `x-forwarded-for`.
7. Confirm the CRM data-controller/privacy owner has an approved retention, deletion, privacy-request, and backup-retention policy covering anonymous inquiries. If not, keep the production inquiry feature gate disabled until one is approved.

**Gate:** Exact public projections and trusted-IP assumptions are established; current protected management paths and tests are identified. If the deployment cannot guarantee a trusted IP and proxy-only origin access, keep `ECOSYSTEM_PUBLIC_INQUIRIES_ENABLED` unset/false and record the deployment prerequisite rather than weakening rate limiting.

## Phase 1 — Public category directory rendering and APIs

1. Update `lib/ecosystem/fetchPublicPartners.ts` to remove its authenticated-user early return.
2. Ensure its query combines shared `APPROVED + isActive` visibility with an active category, and preserves existing search, location, budget, featured, rating, ordering, and pagination semantics.
3. Keep the existing explicit directory selection. Confirm selected fields against the design's allowlist and do not select email, phone, documents, applications, or membership/private data.
4. Update `components/ecosystem/EcosystemCategoryPage.tsx` to always load directory records for the public page and remove the sign-in gate. Preserve the twelve existing category-specific content layouts, tools, CTA behavior, filters, and accessible loading/empty/error states.
5. Remove the `getAuthenticatedEcosystemUser()` 401 gate from both `app/api/ecosystem/partners/route.ts` and `app/api/ecosystem-partners/partners/route.ts`. Keep query validation, pagination limits, no-store behavior, and identical projections.
6. Confirm category URLs, category links, and the application CTA remain unchanged.

**Tests and gate:**

- Anonymous API requests return the same approved/active projection as authenticated requests.
- Inactive categories and pending/rejected/suspended/inactive partners never appear.
- Search/filter/pagination behavior and result counts use the same public predicate.
- Public results omit contact and private fields.
- Category page renders the directory, not a login card, for anonymous and all supported authenticated roles.

## Phase 2 — Public partner profile

1. Update `app/partners/[slug]/[partnerSlug]/page.tsx` to remove the login redirect and anonymous `noindex` behavior. Keep the existing canonical route and profile components.
2. Keep `lib/ecosystem/partnerProfile.ts` as a mapped projection; do not return Prisma records or add contact fields.
3. Ensure profile lookup requires an active category and shared approved/active partner visibility. Ineligible profiles resolve to not-found.
4. Filter `categoryData` with the registry allowlist established in Phase 0. Exclude email/tel, unregistered fields, direct partner contacts, storage keys, private documents, internal notes, membership data, and CRM data from rendered output, metadata, JSON-LD, and social metadata.
5. Preserve approved-review filtering, public profile sections, canonical/social metadata, and the verified badge's dependency on actual `isVerified`.
6. Ensure structured data does not contain private fields or claims not backed by public approved data.

**Tests and gate:**

- Anonymous approved profile renders with indexable metadata.
- Pending/rejected/suspended/inactive records return not-found and do not produce indexable metadata.
- Profile/API/HTML/JSON-LD projection excludes direct contact and internal values.
- Category-specific allowlist tests cover all twelve category configurations.

## Phase 3 — Anonymous enquiry submission through unified CRM

1. Update `lib/ecosystem/inquiryHttp.ts` to allow a public visitor and remove the verified-account-email requirement. Require a valid HTTP(S) `Origin` matching `NEXT_PUBLIC_BASE_URL`, falling back to `NEXTAUTH_URL`; reject missing, `null`/opaque, malformed, or mismatched origins and do not fall back to `Referer`. Apply the shared policy to every inquiry route alias.
2. Require a case-insensitive `application/json` media type, optionally with `charset=utf-8` (`415` otherwise). Enforce JSON raw-body size <=16 KiB while reading (independent of `Content-Length`); reject larger bodies before parsing. Reject unknown fields except explicitly listed `websiteConfirm`. Implement exact field validation from the design. Normalize email by trimming/lowercasing; validate phone characters and 7–15 digit count, then store only an optional leading `+` and digits. For profile routes, derive category and partner from route params/server lookup and reject conflicting request values; for the generic route, require body `categorySlug` to exactly match the canonical database slug of an active category (no trim/case folding). Return generic errors without echoing submitted data, using `{ error: { code, message } }` and the design's exact stable code mapping for every non-2xx response.
3. Display consent version `ecosystem-inquiry-consent-v1` and its exact category-only routing disclosure from the design. Persist the consent boolean, timestamp, and wording-version identifier in existing lead fields/metadata; substantive copy changes require a new version.
4. If `getAuthenticatedEcosystemUser()` returns an active verified user, attribute `Lead.userId` to that server-resolved user and apply the existing limit of 5 new submissions per account per 15 minutes; do not require the submitted email to match. Otherwise, create an anonymous lead with `userId=null`. Never use client-submitted user IDs.
5. Add a default-off `ECOSYSTEM_PUBLIC_INQUIRIES_ENABLED` gate in every environment; when unset or false, return `503` without creating a lead. Tests and local development must explicitly enable it. Once enabled after production deployment verification, parse and canonicalize `x-real-ip` as exactly one valid IPv4 or IPv6 address; reject absent, malformed, or comma-separated values before rate limiting. Apply the existing per-IP limit of 30 per IP per 15 minutes to all visitors. Hash canonical IP keys. Trust only `x-real-ip`; never use client-controlled `x-forwarded-for`. If IP is invalid, canonical-origin configuration is missing/invalid, or Redis is unavailable, return `503`; idempotent retries do not consume another quota.
6. Reject visitor-supplied UTM, referrer, and URL fields; persist only the fixed source type and server-derived category/profile route.
7. Add the visually hidden `websiteConfirm` string honeypot (maximum 200 characters, empty only) to the public form. A non-empty value returns a generic `400` and creates no lead or notification; never persist its value or disclose the spam rule.
8. Preserve category and approved-partner validation, `requestKey`, payload hash, and transaction/advisory-lock idempotency in `lib/ecosystem/inquiries.ts`. Normalize name by trimming while preserving case/internal whitespace; lowercase trimmed email; normalize phone to an optional leading `+` and digits; trim message while preserving case/internal whitespace; map omitted, null, and trimmed-empty optional fields to null, otherwise hash their trimmed values. Hash these normalized values, consent boolean/version, canonical database category slug, resolved partner/source context, and server-resolved user ID or null. Serialize the exact fixed key order from the design as compact UTF-8 JSON using Node.js `JSON.stringify`, then SHA-256; exclude the idempotency key and honeypot. Add a golden hash test for normalization, key ordering, and serialization. Recheck category/partner publication eligibility before idempotency lookup, so an unavailable target returns `404` even on retry; add a regression test for this behavior. Serialize concurrent same-key submissions under the existing lock; on a unique-key race, re-read and compare hash/user attribution, return exact replay or `409`, and never trigger duplicate notifications. For an eligible target, return `409` for changed payload/user attribution and replay an exact match as `200` without consuming quota.
9. Preserve existing unified CRM `Lead` creation and notification/retry behavior. Set source type to `ECOSYSTEM_PARTNER_INQUIRY`; category-only source attribution is the selected active category context, while profile-specific source attribution comes from the server-resolved partner. Store only that bounded category/profile path (no query/fragment). Use a client-generated cryptographically random UUID v4 per intentional submission; retries reuse the key, new submissions use a new key, and the key is retained for the CRM lead's lifetime. Return `201` for a new lead and `200` for an exact replay, with only `{ success, leadId, reused, notificationStatus }` and JSON content type. An exact replay returns current notification status without triggering another notification attempt; background retries remain unchanged. Never return a CRM lead record or partner contact information. Logs must not contain inquiry PII, full messages, or raw IPs.
10. Verify every enquiry route alias in `app/api/ecosystem-partners/leads/route.ts` and `app/api/partners/[slug]/[partnerSlug]/inquiry/route.ts` uses the same policy.
11. Do not write to legacy `EcosystemLead` or change partner lead ownership/read permissions.

**Tests and gate:**

- Anonymous valid enquiries create one unified CRM lead with `userId=null`, consent timestamp, source attribution, and correct optional partner association.
- Authenticated requests from different platform roles do not require account-email matching.
- Unsupported or missing content type returns `415` (while `application/json; charset=utf-8` is accepted); new submissions return `201` and exact idempotent replays return `200` with the documented public response shape.
- Oversized raw body (`413`), invalid JSON/unknown field (including visitor-supplied UTM/referrer/URL)/field validation (`400`), invalid/missing canonical-origin configuration (`503`), missing/opaque/malformed/mismatched origin (`403`), unavailable category/partner (`404`), missing/non-v4 idempotency key (`400`), and changed payload for an existing idempotency key (`409`) are handled explicitly in the design's validation order.
- Filled `websiteConfirm` honeypot creates no lead and no notification.
- Rate limit exhaustion returns `429`; missing/untrusted IP, disabled gate, and Redis failure return `503`.
- Duplicate retry returns the prior lead reference without duplicate CRM records or notifications.
- Concurrent submissions with one key create at most one lead and one notification; the losing request re-reads and returns an exact replay or `409` on mismatch.
- Success and error responses use `Content-Type: application/json; charset=utf-8`; an idempotent replay does not send another notification.
- A retry with changed normalized payload or user attribution returns `409`; a retry whose category/partner is no longer public returns generic `404`.
- CRM/database failure does not return success; notification failure retains pending/retry semantics.
- Every non-2xx response uses `{ error: { code, message } }` with stable codes, generic messages, and no echoed input or lead reference.
- Consent wording/version and server-resolved user attribution are persisted consistently; logs exclude inquiry PII and raw IPs.
- Missing, opaque, malformed, and mismatched origins are rejected consistently; only a valid configured canonical origin is allowed.
- Visitor-supplied UTM, referrer, and URL fields are rejected and not persisted. Category-only source attribution is the selected category context, not a verified browser referrer; profile source attribution comes from the server-resolved partner. Exact source paths are asserted for both submission types.
- Canonical IP representations map to the same hashed rate-limit key.

## Phase 4 — Authorization and regression verification

1. Add tests proving unauthenticated access remains denied for partner dashboard, profile edit, media, member management, private lead list/detail, and admin moderation APIs.
2. Add cross-partner ownership/IDOR regression cases for partner lead and profile management paths.
3. Verify public partner application submission still works without login, stores private documents in existing private storage, and creates only a pending application.
4. Confirm public projections do not expose applications, internal verification records, partner memberships, private documents, or private lead information.
5. Run focused Jest tests for ecosystem inquiry, public partner profile, directory/API routes, and related component coverage. Run type-check/lint/build commands supported by the repository.

**Gate:** All public access tests pass while management/admin authorization remains unchanged. No unrelated workflow or schema changes are included.

## Phase 5 — Logged-out browser smoke and release

1. Verify with the platform/deployment owner that the origin accepts traffic only through the trusted edge, the edge overwrites `x-real-ip`, spoofed values are replaced, and Redis is available. Keep `ECOSYSTEM_PUBLIC_INQUIRIES_ENABLED` unset/false until these checks pass; then enable it through the deployment configuration.
2. In a fresh logged-out browser session, visit `/ecosystem-partners` and each of the twelve category pages. Confirm the directory appears and no sign-in card, redirect, or login modal exists.
3. Search/filter a category directory, open an approved public partner profile, inspect HTML/metadata/structured data for contact/private fields, and submit an enquiry.
4. Confirm pending/rejected records do not appear and the successful enquiry reaches the existing CRM/notification workflow.
5. Confirm partner dashboard, partner management APIs, and admin Command Center remain protected.
6. Record focused test/build outcomes and any deployment-only smoke tests that could not be run locally.
7. Confirm public directory responses retain `no-store` headers and that no session-specific/private result can be served across public and authenticated requests.
8. Obtain privacy-owner sign-off that the existing CRM retention/deletion/privacy-request policy covers anonymous enquiries and backups before enabling the production inquiry gate.
9. Confirm the exact per-category public field and pricing allowlists have been recorded and covered by tests.

**Gate:** Public flows and protected flows both pass from a fresh logged-out session; trusted-IP and Redis prerequisites are confirmed.

## Dependency map

```text
Phase 0 field registry + edge contract
  ├─> Phase 1 category and directory public access
  ├─> Phase 2 profile projection and SEO
  └─> Phase 3 anonymous CRM enquiry
         └─> Phase 4 auth/privacy regression tests
                └─> Phase 5 logged-out smoke and release
```

Directory and profile work can proceed after Phase 0's public field audit. Anonymous enquiry implementation can proceed in parallel with directory/profile code only after trusted-IP semantics and CRM/idempotency behavior are confirmed. Release remains gated on all prior phases.

## Changed surface inventory (expected)

- `components/ecosystem/EcosystemCategoryPage.tsx`
- `components/ecosystem/EcosystemPartnerDirectoryClient.tsx` (only if form payload/honeypot needs adjustment)
- `lib/ecosystem/fetchPublicPartners.ts`
- `lib/ecosystem/partnerProfile.ts`
- `lib/ecosystem/inquiryHttp.ts`
- `lib/ecosystem/inquiries.ts`
- `app/api/ecosystem/partners/route.ts`
- `app/api/ecosystem-partners/partners/route.ts`
- `app/partners/[slug]/[partnerSlug]/page.tsx`
- Existing focused ecosystem tests and narrowly scoped additional tests
- This implementation plan and the approved design document

No Prisma schema/migration, AWS S3/CloudFront, authentication, payment, notification, or CRM model changes are expected. One application environment setting, `ECOSYSTEM_PUBLIC_INQUIRIES_ENABLED`, is required to enable anonymous inquiry writes; it defaults off and must only be enabled after the trusted proxy/origin checks pass.

## Rollback

Rollback by redeploying the prior application version or setting `ECOSYSTEM_PUBLIC_INQUIRIES_ENABLED=false`. No schema/data rollback is needed. Retain all CRM leads already created; do not delete, merge, or rewrite them as part of rollback. If public inquiry abuse controls or trusted IP attribution fail, disable public enquiry writes with an explicit unavailable response while leaving public browsing available.

## Known environment limitation

The prior attempt to commit the design document was blocked because the sandbox could not start Git without local proxy/network access. Do not claim either document is committed unless Git access is enabled and a commit succeeds. The plan itself has not been implemented or executed.
