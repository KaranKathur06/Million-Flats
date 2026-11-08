# MillionFlats Ecosystem Partner Public Access — Audit and Design

**Status:** Approved design; implementation planning authorized  
**Date:** 2026-11-04  
**Scope:** Public access to ecosystem categories, approved partner directories and profiles, and anonymous enquiries  
**Out of scope:** Partner dashboard redesign, new partner governance workflows, video/reels and advertising, MillionFlats Passport

## 1. Objective and decisions

Correct the public Ecosystem Partner experience so visitors do not need an account to read category pages, search approved partners, open approved partner profiles, or submit a partner enquiry. Extend existing MillionFlats routes, partner records, visibility rules, CRM, notifications, and abuse controls.

Decisions for this workstream:

- Keep all existing category and partner-profile URLs.
- Public browsing and enquiry submission require no authentication, regardless of visitor login state or platform role.
- A partner is publicly eligible only when its category is active and the partner is `APPROVED` and active.
- Direct partner phone and email stay private. Public visitors use the enquiry form.
- Public enquiries are created in the existing unified `Lead` CRM workflow; do not introduce a second CRM or use the legacy `EcosystemLead` table for new enquiries.
- Partner applications remain public submissions that require subsequent review and never publish a profile automatically.
- Partner dashboards, partner-owned APIs, private leads, and admin review remain protected.
- Do not add a new partner/category/lead model or an external CAPTCHA service in this phase.
- The user's current public-access requirement supersedes any contradictory older Ecosystem design document.

## 2. Phase 0 architecture audit

### 2.1 Platform and existing shared services

| Area | Existing implementation | Reuse and audit findings |
|---|---|---|
| Web application | Next.js 14 App Router, React, TypeScript, Tailwind CSS | Keep the current server-component and route-handler patterns. |
| Database | PostgreSQL and Prisma 5 in `prisma/schema.prisma` | Existing category, partner, application, profile-content, membership, and CRM records are sufficient for this scope. |
| Authentication | NextAuth in `lib/auth.ts`; `getAuthenticatedEcosystemUser()` in `lib/ecosystem/auth.ts` requires an active verified user | Remove its use only from public reads and public enquiry handling. Retain the helper for private partner operations. |
| Public partner visibility | `PUBLIC_PARTNER_VISIBILITY` and `buildPublicPartnerWhere()` in `lib/ecosystem/partnerVisibility.ts` | Reuse the canonical `status=APPROVED` and `isActive=true` rule. Require an active category as well. `isVerified` is a badge, not an additional visibility condition. |
| Partner data | `EcosystemCategory`, `EcosystemPartner`, and related service/location/gallery/portfolio/review/FAQ/media models | Reuse current records and route slugs; do not seed duplicate categories. |
| Partner applications | Public `POST /api/ecosystem-partners/apply`; existing category-specific registration UI and application model | Preserve the current public submission flow and pending moderation semantics. |
| Directory and profile | `fetchPublicPartners()`, `getPartnerProfile()`, the category landing page, and `/partners/[slug]/[partnerSlug]` | Existing public-field projections are a good base, but authentication is imposed around them at several layers. |
| Unified CRM | `Lead`, `lib/ecosystem/inquiries.ts`, `lib/leads/createLead.ts`, existing lead notifications and admin CRM | Current ecosystem enquiry creation already writes to `Lead`, with `leadType=ECOSYSTEM`, a unique request key, a payload hash, consent fields, partner association, and existing notifications. `Lead.userId` is nullable. |
| Legacy CRM data | `EcosystemLead` remains in the Prisma schema | Do not write new public enquiries there and do not migrate/delete historic records as part of this access correction. |
| Abuse controls | Existing Redis-backed per-account and per-IP fixed-window limit in `lib/ecosystem/inquiries.ts`, origin check, payload validation, and idempotency | Preserve and adapt for anonymous submissions. Production must fail closed if Redis is unavailable. |
| Partner management | Partner-scoped membership and permission checks in `lib/ecosystem/membership.ts`; partner APIs under `/api/ecosystem-partners/[partnerId]/...` | Keep ownership and permission checks intact. Media uploads stage sensitive changes. |
| Admin | Existing Command Center and ecosystem admin surfaces | No new admin app or permission changes. |
| Middleware | `middleware.ts` protects admin, dashboards, and ecosystem management paths; public ecosystem paths are not broadly protected there | This is primarily a server-component/service/API authorization correction, not a global middleware relaxation. |
| Tests | `tests/unit/ecosystem-inquiry-auth.test.ts` currently expects anonymous rejection; `tests/unit/ecosystem-partner-profile.test.ts` tests missing-data projection behavior | Update the outdated auth expectation and add public visibility and regression coverage. |

### 2.2 Relevant routes and current access behavior

| Surface | Existing route/component | Current behavior and required result |
|---|---|---|
| Ecosystem landing | `/ecosystem-partners` | Public; remains public. |
| Twelve category pages | `/ecosystem-partners/<category-slug>` | Routes and category-specific content already exist. The shared category component conditionally fetches directory results and renders the sign-in card when no verified user exists. Remove that gate. |
| Category directory API | `GET /api/ecosystem/partners` | Currently returns `401` without an authenticated ecosystem user. Return only the public directory projection for anonymous and authenticated callers. |
| Legacy category directory API | `GET /api/ecosystem-partners/partners` | Currently returns `401` without authentication. Keep compatibility and apply the same query and projection rules as the canonical route. |
| Public profile page | `/partners/[category-slug]/[partner-slug]` | Currently redirects logged-out visitors to login; metadata is `noindex`. Render approved profiles publicly and allow indexing. |
| Category/profile enquiry | `POST /api/ecosystem-partners/leads` and `POST /api/partners/[slug]/[partnerSlug]/inquiry` | Shared handler currently requires a verified account and account-email match. Accept validated anonymous submissions without changing CRM read permissions. |
| Partner application | `/ecosystem-partners/<category>/partner-registration` and `POST /api/ecosystem-partners/apply` | Public application path exists; retain it and confirm pending status in tests. |
| Partner management | `/dashboard/ecosystem-partner` and `/api/ecosystem-partners/[partnerId]/...` | Authentication, membership, ownership, and permission checks remain required. |
| Admin moderation | Existing ecosystem admin routes in the Command Center | Authorization and approval workflow remain unchanged. |

The actual category page uses `EcosystemPartnerDirectoryClient`; the separately named `PartnerDirectoryPlaceholder` is not the active directory implementation identified in this audit.

### 2.3 Existing data projections and risks

- The directory query selects a limited set of fields and does not select partner email, phone, documents, application data, or membership data.
- The profile loader maps partner data into `PartnerProfileData` rather than returning a raw Prisma record. It does not expose direct phone/email fields, but its category-specific JSON must be filtered against the public field registry before anonymous rendering.
- Reviews already have an `isApproved` filter. Gallery, portfolio, FAQs, services, and locations do not have individual approval flags in the inspected schema; public eligibility is currently controlled at the partner level. The implementation must preserve explicit field projection and avoid adding private documents or administrative fields. If the review finds partner-controlled values that are not appropriate for publication under the approved partner record, those values must be excluded rather than exposed by default.
- `EcosystemPartnerMedia` stores logo/cover assets; sensitive uploads use staged profile changes. Direct contact fields on `EcosystemPartner` are not shown to public users in this design.
- `Lead` already supports nullable `userId`, unique `requestKey`, `requestPayloadHash`, consent, source URL/type, UTM fields, metadata, and partner association. No schema migration is expected for anonymous lead creation.

### 2.4 Reusable components and implementation surfaces

- Category pages: `app/ecosystem-partners/**/page.tsx`, `lib/ecosystem/categoryPage.tsx`, `components/ecosystem/EcosystemCategoryPage.tsx`
- Directory data and UI: `lib/ecosystem/fetchPublicPartners.ts`, `lib/ecosystem/partnerVisibility.ts`, `components/ecosystem/EcosystemPartnerDirectoryClient.tsx`
- Public profile: `lib/ecosystem/partnerProfile.ts`, `app/partners/[slug]/[partnerSlug]/page.tsx`, existing partner-profile components
- Enquiries: `lib/ecosystem/inquiryHttp.ts`, `lib/ecosystem/inquiries.ts`, and existing enquiry route handlers
- Application, CRM notifications, rate limits, Redis, role and membership checks: existing routes and helpers above
- Tests: existing ecosystem inquiry/profile tests and relevant route/API tests

### 2.5 Migration and rollout risk assessment

No Prisma model or migration is planned. The principal risk is accidental exposure of fields or profile content that was not intended for public publication. Mitigate with explicit select/projection allowlists, existing partner/category publication predicates, tests for excluded data, and keeping direct contact details form-only. A second risk is public enquiry abuse; mitigate with the existing Redis limiter, strict origin validation, bounded attribution, payload bounds, consent, honeypot, and idempotency. Keep the existing fail-closed production behavior when Redis is unavailable.

The pre-existing design document `docs/superpowers/specs/2026-11-01-ecosystem-partner-experience-design.md` and its plan describe an authenticated directory, which conflicts with the user's current requirement. They are historical context only for this feature; this design supersedes that access decision without changing their partner-governance decisions.

## 3. Proposed architecture

### 3.1 Public category pages and directories

Keep all twelve existing category routes and their category-specific content, calculators/tools, filters, and calls to action. The `/ecosystem-partners` landing page and category pages are public for every visitor.

Remove the authentication-dependent branch from `components/ecosystem/EcosystemCategoryPage.tsx`; always resolve the active category and fetch the first page of approved partners for the category. Remove the authentication return from `lib/ecosystem/fetchPublicPartners.ts`. Do not replace the gate with another restriction or a success-shaped empty list for anonymous callers.

Both directory GET routes remain available. Parse and bound query parameters as they do now, and return the existing public list projection only. Filter every query by the shared public visibility predicate and an active category. Preserve pagination, search, location, budget, featured, and rating filters. Do not add profile contact fields or private application/document data to the directory response.

The permitted directory projection is limited to partner ID, name, slug, logo/cover image URL, short description, rating, experience/project highlights, service-area summary, an explicitly approved public price range, and featured/verified flags. Include `pricingRange` only when the category field registry explicitly marks that field public; otherwise omit it. Private quote details, negotiated commercial terms, payment data, and internal pricing are never selected. Search/filter result counts must use the same public predicate.

### 3.2 Public partner profile

Keep `/partners/[category-slug]/[partner-slug]` as the canonical profile URL. Remove the login redirect and anonymous noindex response. Continue resolving a profile only through the shared approved/active partner rule and active category. Return not-found for an ineligible profile.

The aggregate partner publication rule is the publication boundary for its existing public profile fields: the partner must be approved and active, and its category must be active. Keep the current mapped profile content (identity/branding, description, services, locations, public gallery and portfolio details, approved reviews, FAQs, and experience/highlight fields) but never return raw Prisma models. Related services, locations, gallery, portfolios, and FAQs have no per-item approval state in the inspected schema; this scope does not add one or invent a second moderation lifecycle. The implementation must confirm the existing write paths and expose only fields represented by the mapped public profile, excluding internal or private values.

Filter `categoryData` using the category field registry; omit fields of type email or telephone and all unknown/unregistered fields. Include price/rate fields only if the registry explicitly marks the specific field public. Continue excluding direct email, phone, internal verification notes, application content, private documents/storage keys, membership records, and lead information. The “MillionFlats Verified” badge must remain dependent on `isVerified`; approval alone must not invent verification. Canonical and social metadata should be generated only for a public profile.

Before implementation, the engineering owner must inventory the field registry for all 12 categories and record the exact category-data allowlist used by the public projection. Only registered, non-contact fields from that allowlist may be serialized; any field without an explicit registry entry is excluded.

The inspected registry contains these fields; the initial public allowlist is deliberately limited to the following names, with `email`/`tel`-typed, unknown, and unlisted keys excluded:

| Category | Public `categoryData` allowlist |
|---|---|
| Home Loans & Finance | `loanTypes`, `interestRateMin`, `interestRateMax`, `rbiRegistration` |
| Legal & Documentation | `licenseNumber`, `courtRegistration`, `specialization`, `dueDiligence`, `agreementDrafting`, `registration`, `rera`, `litigationSupport` |
| Property Insurance | `products`, `irdaiRegistrationNumber` |
| Interior Design & Renovation | `portfolioLinks` (valid HTTPS URLs only) |
| Packers & Movers | `serviceTypes`, `fleetDetails` |
| Property Management | `unitsManagedDisplay` |
| Vastu / Feng Shui | `consultationModes`, `philosophy` |
| Tiles & Surface Finishing | `materials`, `supportedBrands` |
| Hardware & Architectural Fittings | `productCategories`, `supportedBrands` |
| Cement & Structural | `materials`, `deliveryCapability` |
| Smart Home & Automation | `supportedBrands`, `amcAvailable` |
| Technology Partners | `solutions`, `integrationType` |

Exclude `processingFee` and `feeStructure` from public projections because they may contain unapproved commercial terms. The two home-loan interest-rate bounds are the only rate values explicitly allowed in this phase, to support the requested lender filtering. Any change to this table requires an explicit product/admin approval decision and corresponding projection tests.

### 3.3 Public enquiry and CRM write

Use the existing public form and inquiry endpoints; no new CRM or public lead-read API is introduced. Require a case-insensitive `application/json` media type, optionally with `charset=utf-8`; otherwise return `415 Unsupported Media Type`. Accept JSON request bodies up to 16 KiB measured from the actual raw body bytes; enforce the limit while streaming/reading even when `Content-Length` is missing or inaccurate, before parsing JSON. Require a JSON object and reject unknown keys (including `userId`, `sourcePage`, arbitrary metadata, UTM, referrer, and URL fields), except for the explicitly listed `websiteConfirm` field below. Validate server-side with this contract:

- `name`: required, trimmed string, 2–120 characters.
- `email`: required, trim whitespace, validate with the existing Zod email validator, maximum 254 characters, then lowercase before storage.
- `phone`: required string, 5–30 input characters, allowed characters `[+0-9() .-]`, 7–15 digits, at most one leading `+`; trim and normalize storage to an optional leading `+` followed by digits.
- `message`: required, trimmed string, 1–5000 characters.
- `consentToShare`: required literal `true`.
- `categorySlug`: required for the generic leads endpoint, matching `[a-z0-9-]{1,100}` and exactly equal to an active category's canonical database slug; do not trim or case-fold it. A category-specific route derives it from route configuration.
- `partnerId`: optional nullable string, maximum 100 characters; profile-specific routes use the route-resolved partner and reject a conflicting body value.
- `city`: optional nullable string, maximum 120 characters.
- `propertyType`: optional nullable string, maximum 80 characters.
- `budget`: optional nullable string, maximum 100 characters.
- `requirement`: optional nullable string, maximum 500 characters.
- `idempotency-key` header: required UUID v4 generated by a cryptographically secure client API.
- `websiteConfirm`: optional string honeypot, maximum 200 characters, empty only; it is never persisted or included in errors.
- A partner association must resolve to an approved/active partner in the selected active category.
- Same-origin requests, bounded input lengths, idempotency key format, and trusted source IP.

Do not accept visitor-supplied UTM, referrer, or URL attribution fields in this phase. Even syntactically bounded campaign values can contain personal data; source attribution is limited to the server-derived route context and fixed source type.

The form consent text is version `ecosystem-inquiry-consent-v1`: “I agree to be contacted by MillionFlats about this inquiry. If I request a specific partner or MillionFlats matches me with one, I consent to sharing the details provided with that partner for this purpose.” For category-only enquiries, MillionFlats receives the inquiry first and may share it only with a partner selected under the existing lead-routing rules. Persist the existing consent boolean and timestamp plus this version identifier in lead metadata so the wording can be audited without a schema migration. Any substantive wording change creates a new immutable version identifier; prior records retain the original value.

An anonymous submission creates an existing `Lead` with `leadType=ECOSYSTEM`, `userId=null`, source attribution, consent timestamp, and the same CRM ownership/notification behavior. When `getAuthenticatedEcosystemUser()` returns an active, verified session user, set `Lead.userId` to that user for attribution and apply the existing per-user limit; do not require the submitted email to match the account. If there is no eligible session user, process it as an anonymous inquiry. Never accept a client-supplied user ID. Set `sourceType` to the fixed value `ECOSYSTEM_PARTNER_INQUIRY`. Derive `sourcePage` from server-validated inquiry context: for a category-only inquiry, record the selected category route `/ecosystem-partners/{categorySlug}` after validating the category as active; for a profile-specific inquiry, derive `/partners/{categorySlug}/{partnerSlug}` from the partner resolved by the server. This records the selected inquiry context, not a verified browser referrer or necessarily the visitor's actual entry page. Do not store query strings or fragments. Public API responses return a lead reference and delivery status, never the lead record or partner contact data.

For route-specific profile submissions, category and partner identity come from route parameters and server lookup; if the request body supplies conflicting category/partner identifiers, reject it with a generic `400`. For the generic category endpoint, `categorySlug` is required in the body and must exactly match the canonical database slug of an active category. Hash the canonical database slug.

Public API responses return only `{ success, leadId, reused, notificationStatus }`; new lead creation returns `201`, an idempotent replay returns `200`, and `notificationStatus` is `sent` or `pending`. Both success and error responses use `Content-Type: application/json; charset=utf-8`. An idempotent replay returns the lead's current notification status and must not trigger another notification attempt; existing background retry behavior remains responsible for pending notifications. Never return the lead record or partner contact data.

Apply validation in this order for deterministic responses: disabled feature gate (`503`); content type (`415`); body size (`413`); malformed JSON, unknown fields, or field validation (`400`); invalid/missing canonical-origin configuration (`503`); missing/opaque/malformed/mismatched request origin (`403`); missing/non-v4 idempotency key (`400`); unavailable category/partner (`404`); invalid/missing trusted IP (`503`); idempotency lookup; changed payload/user attribution for an existing key (`409`); exact replay of an existing lead (`200`); Redis/rate-limit failure (`503`), exhausted limit (`429`), and CRM persistence failure (`503`). Recheck category/partner publication eligibility before idempotency lookup on every request; if the target has become inactive/unpublished, return the generic `404` even for a prior key. Do not echo submitted values or disclose unpublished partner status in any error.

Every non-2xx response uses `{ error: { code, message } }` with the following stable codes and generic, non-echoing messages; it never includes a lead reference or submitted values. Use `UNSUPPORTED_MEDIA_TYPE` for `415`, `PAYLOAD_TOO_LARGE` for `413`, `INVALID_REQUEST` for malformed/unknown/invalid fields and honeypot rejection (`400`), `SERVICE_UNAVAILABLE` for disabled gate, invalid server configuration, invalid trusted IP, Redis/database failure (`503`), `ORIGIN_NOT_ALLOWED` for origin rejection (`403`), `NOT_FOUND` for unavailable category/partner (`404`), `INVALID_IDEMPOTENCY_KEY` for a missing/invalid key (`400`), `IDEMPOTENCY_CONFLICT` for changed payload or user attribution (`409`), and `RATE_LIMITED` for exhausted quota (`429`). The success shape above applies only to `200` and `201` responses.

Reuse the existing unique request key and payload hash to make retries safe. The client generates a cryptographically random UUID v4 for each intentional form submission; a retry reuses that key, while a new submission gets a new key. Normalize name by trimming while preserving case and internal whitespace; lowercase trimmed email; normalize phone to an optional leading `+` and digits; trim message while preserving case and internal whitespace; normalize optional `city`, `propertyType`, `budget`, and `requirement` by mapping omitted, null, or trimmed-empty values to null and otherwise storing the trimmed string. Category slug, resolved partner ID, consent boolean/version, server-derived `sourcePage`/`sourceType`, and server-resolved user ID or null are authoritative normalized values. Construct the hash object with keys in exactly this order: `name`, `email`, `phone`, `message`, `consentToShare`, `consentVersion`, `categorySlug`, `partnerId`, `city`, `propertyType`, `budget`, `requirement`, `sourceType`, `sourcePage`, `userId`. Serialize as compact UTF-8 JSON using the Node.js `JSON.stringify` behavior for this ordered object and hash those bytes with SHA-256; do not include the idempotency key or honeypot value. Serialize concurrent submissions with the same request key using the existing transaction/advisory lock before lookup and creation. If a unique-key conflict still occurs, re-read the stored lead and compare payload hash and user attribution: return the normal replay response for an exact match, `409` for a mismatch, and never create another lead or trigger a duplicate notification. The unique `Lead.requestKey` and payload hash enforce idempotency for the lifetime of the CRM lead; do not expire the key independently of the lead's approved retention/deletion lifecycle. Retain the existing rate limits: at most 5 new submissions per authenticated account and 30 per source IP per 15-minute fixed window; idempotent retries do not consume additional quota. Hash canonical IP values in Redis keys. The application reads only `x-real-ip`; it must not trust `x-forwarded-for` or another client-controlled header.

Parse `x-real-ip` as exactly one valid IPv4 or IPv6 address, canonicalize its textual representation before hashing, and reject absent, malformed, or comma-separated values before rate limiting.

For browser submissions, require a non-empty `Origin` header with a valid HTTP(S) origin. Compare it to the canonical origin configured by `NEXT_PUBLIC_BASE_URL`, falling back to `NEXTAUTH_URL` only when the former is unset. Missing or malformed canonical-origin configuration fails closed with `503`; reject missing, `null`/opaque, malformed, or mismatched request origins with `403`; do not use `Referer` as a fallback. Apply this exact policy to every public enquiry route alias through the shared handler.

Add an `ECOSYSTEM_PUBLIC_INQUIRIES_ENABLED` feature gate that defaults to disabled in every environment when unset. When disabled, public inquiry POST routes return an explicit `503` without creating a lead. Tests and local development must explicitly set the gate to enabled to exercise the write path; they must still cover missing/malformed IP and origin rejection. Production enabling is a release operation permitted only after the deployment owner confirms that (1) the public origin is reachable only through the trusted edge proxy, and (2) that proxy strips a client-provided `x-real-ip` and overwrites it with the actual connection IP. If the header is absent, return `503`. The app cannot authenticate a proxy header on its own; preventing direct-origin bypass and verifying spoof resistance are deployment acceptance tests, not inferred from header presence.

Add the visually hidden `websiteConfirm` text field to the public form as a low-cost spam signal. If it is non-empty, reject with a generic `400` validation response and do not create a lead or notify anyone. Missing/unavailable production Redis remains a clear `503`; exhausted limits return `429`; validation, origin, and invalid partner errors return explicit client errors.

If an idempotency key already exists with a different payload hash or user attribution, return `409 Conflict` without revealing the prior lead or changing it.

### 3.4 Public partner application

Keep current category-specific partner application pages, validation, upload limits, private document storage, and notification behavior. Ensure the public application path does not require login and creates a pending application. Application submission does not approve, verify, publish, or create an active directory record automatically.

### 3.5 Protected management surfaces

Do not modify `getAuthenticatedEcosystemUser()` semantics or authorization for partner dashboard APIs. Keep partner membership, status, role, ownership, and per-operation permission checks in force. Keep admin review and publication actions protected by the existing Command Center RBAC. Public read access to approved profile data grants no access to private CRM, application, verification, or partner-management data.

## 4. Public/private access-control matrix

| Area | Access | Enforcement |
|---|---|---|
| Ecosystem landing page | Public | Public route |
| All category pages and educational content | Public | Public route and category lookup |
| Approved, active partner directory | Public | Shared visibility predicate and explicit list projection |
| Approved, active public partner profile | Public | Shared visibility predicate, explicit profile projection, not-found otherwise |
| Public enquiry submission | Public write only | Server validation, consent, origin check, partner eligibility, rate limiting, idempotency |
| Partner application submission | Public write only | Existing validation/upload controls; pending moderation state |
| Partner dashboard and profile editing | Authenticated and authorized | Existing verified user + active partner membership + permission and ownership checks |
| Private partner leads | Authenticated and authorized | Existing CRM/partner lead authorization; no public read API |
| Applications, internal documents, verification notes | Admin/authorized staff only | Existing private storage and admin authorization |
| Admin approval, moderation, publication | Admin role required | Existing Command Center RBAC and audit behavior |

## 5. Error handling and privacy requirements

- A missing or inactive category returns not-found or the repository-standard unavailable response; it must not expose category or partner internals.
- A pending, rejected, suspended, or inactive partner must not appear in public directory/profile queries. The verified badge is shown only when `isVerified` is true.
- Malformed query/form input returns a validation error. Do not silently drop invalid fields or return empty success-shaped data.
- Redis or CRM database failures are surfaced explicitly and logged through existing error handling; do not claim a lead was created if persistence failed.
- Notification delivery failures retain the existing pending/retry outcome and never duplicate lead creation.
- Public directory API responses retain `Cache-Control: no-store, must-revalidate`; profile/category responses must not vary on session for public content and must not expose authenticated-only data. Test that caches cannot share a private response to a public request or vice versa.
- Public contact details stay hidden in HTML, JSON, metadata, structured data, and client payloads. No PII is placed in public URLs or analytics events.
- Application logs and error telemetry must not include inquiry names, emails, phone numbers, full message bodies, or raw IP addresses. Log request/lead identifiers and failure categories only; continue hashing IPs in rate-limit keys.
- Apply the existing CRM retention, deletion, and privacy-request process to these leads and any backups. The CRM data-controller/privacy owner must confirm that policy covers anonymous public inquiries before the feature gate is enabled. If no approved retention/deletion policy exists, keep public enquiry writes disabled until one is approved; do not invent a retention duration in this implementation.

## 6. Test and acceptance plan

### Unit and API tests

1. Anonymous and authenticated callers of all public directory APIs receive the same approved/active public projection.
2. Category directory data is loaded for logged-out visitors; there is no sign-in card or auth-dependent empty result.
3. Pending, rejected, suspended, inactive, and inactive-category records are excluded.
4. Public profile lookup returns approved profiles, returns null/not-found for unpublished profiles, and omits direct contact and internal fields from serialized data and metadata.
5. Category-specific fields containing email/tel, unregistered fields, or non-public/private data are not serialized into the public profile.
6. Anonymous valid enquiries create exactly one unified CRM lead with `userId=null`, consent, category/partner association, and source attribution.
7. Valid signed-in callers of all roles can browse and submit without the old account-email restriction.
8. Unsupported media type (including missing content type, `415`), oversized raw body (`413`), invalid JSON/unknown field/field validation (`400`), invalid/missing canonical-origin configuration (`503`), missing/opaque/malformed/mismatched origin (`403`), unavailable category/partner (`404`), missing/non-v4 idempotency key (`400`), a filled `websiteConfirm` honeypot (generic `400` and no lead), changed payload for an existing key (`409`), rate exhaustion (`429`), untrusted/missing IP or disabled feature gate (`503`), Redis failure (`503`), and database failure (`503`) have explicit expected outcomes in the stated validation order. All non-2xx bodies use the documented generic error object and never echo request fields.
9. Duplicate idempotency submissions reuse the original lead; changed payload with the same key is rejected. Simultaneous same-key submissions create at most one lead and send at most one notification; replay responses include the current notification status without another send attempt.
10. Public application submission remains pending and does not publish a partner.
11. Unauthenticated partner dashboard/profile-edit/private-lead APIs remain denied; cross-partner access remains denied; admin actions remain role-guarded.
12. Directory API cache headers are no-store, and page/API behavior cannot leak a session-specific/private response across authenticated and anonymous requests.
13. Visitor-supplied UTM, referrer, and URL fields are rejected as unknown fields and are not persisted. The existing 5/account and 30/IP per 15-minute limits are verified, with idempotent retries exempt.

### Browser smoke verification

In a fresh logged-out browser session:

- Visit `/ecosystem-partners` and each of the 12 category routes.
- Search/filter the visible directory, open an approved public profile, and verify no login redirect/modal or direct partner phone/email.
- Submit an enquiry and verify the success acknowledgement without an account.
- Confirm a pending/rejected partner is not discoverable.
- Confirm partner dashboard and admin paths still redirect/deny as appropriate.

### Definition of done for this workstream

- All public browsing/profile/enquiry flows work anonymously at existing URLs.
- All directory/profile queries enforce active category plus approved/active partner visibility.
- The direct contact policy and field projection are tested.
- Enquiries are stored in the existing unified CRM and remain inaccessible to public reads.
- Partner dashboards, private lead APIs, and admin moderation remain protected.
- Focused tests, relevant lint/type checks, and production build checks pass.

## 7. Implementation dependency map

1. Audit field registries, profile projections, route references, lead model requirements, Redis configuration, and current tests.
2. Update the public directory loader and category server rendering; update both directory APIs consistently.
3. Remove profile-page auth redirect/noindex behavior and validate public output fields.
4. Extend the existing enquiry handler/service for anonymous writes, preserving CRM idempotency and notifications.
5. Add or update tests for public access, private projection, abuse controls, and protected management regression.
6. Run logged-out browser smoke checks and production build/test verification.

The public profile and directory steps depend on the field-projection audit; anonymous enquiry work depends on preserving existing CRM idempotency and Redis fail-closed behavior. No schema migration, AWS media configuration change, or new external service is part of the planned change. Add one application environment gate, `ECOSYSTEM_PUBLIC_INQUIRIES_ENABLED`, defaulting to disabled when unset in every environment; tests and local development explicitly enable it.

## 8. Deployment, rollback, and deferred work

### Deployment

No database migration or AWS media configuration change is expected. Add the `ECOSYSTEM_PUBLIC_INQUIRIES_ENABLED` environment gate, defaulting to disabled when unset in every environment. Before setting it to enabled in production, the platform/deployment owner must verify that the application origin is not directly reachable outside the trusted edge proxy and that the proxy strips and overwrites `x-real-ip`. Test spoofed client headers through the public edge and verify rate limits key on the actual source address; test that direct-origin access is blocked. If the current edge/origin setup fails these tests, configure the existing proxy/network boundary and keep the feature gate disabled until verified. Also verify production Redis availability and the CRM owner's retention/deletion/privacy-request coverage for anonymous leads, including backup treatment. Deploy application code and tests through the existing pipeline. After deployment, smoke-test logged-out category, directory, profile, enquiry, partner dashboard, and admin routes.

### Rollback

Rollback is an application deployment to the previous version; no data rollback is required. Public enquiries created before rollback remain valid CRM leads. Do not delete or rewrite CRM records during rollback.

### Known limitations and deferred decisions

- The audit did not inspect the full video/media pipeline, Razorpay/payment operations, Passport documents, or GST configuration; those belong to separate design/audit cycles before those modules are implemented.
- No per-item approval columns exist for gallery, portfolio, FAQ, service, or location records in the inspected schema. This design explicitly treats active/approved partner publication and the existing mapped profile projection as the publication boundary; it does not add per-item moderation. The implementation audit must confirm their write paths and ensure only the enumerated mapped profile fields are emitted.
- Anonymous rate limiting requires the production edge to overwrite `x-real-ip` and the origin to reject direct non-proxy traffic. The production platform/deployment owner must verify both before enabling `ECOSYSTEM_PUBLIC_INQUIRIES_ENABLED`. Until then, the default-off application gate returns `503`. The application cannot determine whether a present header was forged before reaching it, so do not treat header presence alone as proof of trust or accept client-supplied proxy headers as a workaround.
- The CRM data-controller/privacy owner must confirm existing lead retention, deletion, privacy-request, and backup-retention policies cover anonymous partner enquiries before public writes are enabled. If not, production inquiry writes remain gated until an approved policy is defined.
- Fresh incognito behavior must be verified in the target deployment environment.
- A broader performance/cache policy can be evaluated after public traffic and revalidation behavior are measured; initial behavior remains conservative and correctness-first.
