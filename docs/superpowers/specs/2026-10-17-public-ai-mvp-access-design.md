# Public AI MVP Access

## Goal

Allow logged-out users to access AIIndex, AIPro, AIShield, AITitle, and AIView
without weakening privacy for private properties or agent performance data.

## Public surface and existing inputs

Keep existing inputs and forms; do not add generic uploaders to all five
products. Existing pages are:

- AIIndex: property/project investment intelligence (`/ai/index`).
- AIPro: agent intelligence (`/ai/pro`, existing `agentId` input).
- AIShield: public project explorer (`/ai/shield`).
- AITitle: legal document analysis using its existing document URL and entity
  inputs.
- AIView: property/project media analysis using existing image URLs and entity
  inputs.

Public page access does not authorize retrieval of private entity data. In
particular, the full AIPro report includes private lead, churn, fraud-risk, and
coaching signals.

## Design

- Remove sign-in-only page gates from the five product pages while retaining
  existing forms and demo links.
- AIIndex, AITitle, AIView, and AIShield may operate anonymously only on
  published/public entities and their existing supported data. Private or
  draft entities return not-found/forbidden without disclosing existence.
- AIPro page and current `agentId` input are public. Anonymous AIPro responses
  use a public projection containing only: agent ID, display name, public
  profile photo, public bio, public city/country, public-facing rating and
  review count, published listing count, and published listing summaries
  (listing ID, title, type, price/currency, city, and public image URL). Omit
  email/phone unless an existing explicit public-contact setting is enabled.
  Archived agents are unavailable to anonymous AIPro requests and return
  not-found/forbidden without revealing their archived status.
  Never call or return private lead, churn, fraud-risk, subscription, payment,
  or coaching fields to anonymous visitors. The full report remains
  restricted to the owning agent or authorized admin.
- Allow only these public methods: `GET /api/ai/investment`; `GET
  /api/ai/agent` (public-safe projection only); `GET
  /api/ai-shield/projects`, `/api/ai-shield/filters`, `/api/ai-shield/stats`,
  and `/api/ai-shield/snapshot` (published projects only); `POST
  /api/ai/legal`; and `POST /api/ai/vision`. `POST /api/ai/investment`, `POST
  /api/ai/agent`, `POST /api/ai/orchestrate`, `POST /api/ai/valuation`, and
  force-refresh or management operations require authentication or remain
  internal-only. Verify page calls and keep every non-listed method private.
- Enforce a Redis-backed atomic budget of 5 anonymous requests per IP per
  engine per minute for AIIndex, AIPro, AITitle, and AIView. Count every
  request to these public endpoints, including cache hits and live
  computations; authenticated requests are outside this anonymous budget.
  AIShield public reads share a separate 30-request per IP per minute bucket.
  If Redis is missing/unavailable in production, return 503 rather than
  failing open. Read the client address only from `x-real-ip`, which the
  trusted deployment ingress must overwrite on every request and strip from
  untrusted client input; reject anonymous requests if it is absent or
  malformed.
- Limit AITitle to one document URL per request; AIView to at most 10 image
  URLs; JSON body to 1 MB; remote assets to HTTPS, at most 10 MB each, 15
  seconds total fetch time, and at most two redirects. Reject credentials,
  nonstandard ports, private/reserved IPs, and DNS results resolving to
  private/reserved ranges. Use a DNS-pinned HTTP client so the connection uses
  the validated address while preserving TLS SNI/Host; reject mixed public and
  private DNS answers and revalidate/pin every redirect target.
- Anonymous requests cannot set `forceRefresh`; cache reuse remains available.
  Preserve authenticated refresh behavior and protect management APIs.
  Public response cache keys must not include or leak private user-specific
  data; public results derive only from published/public entities.

## Error handling

Return 400 for malformed/unsupported input, 404 for private or nonexistent
entities without revealing existence, 413 for payload/asset size, 429 with
`Retry-After` when over budget, and 503 when required shared rate limiting or
trusted client IP is unavailable. Sanitize upstream errors; log detailed
failures server-side without document contents or secrets.

## Acceptance and validation

- All five product pages render and retain their current input experience while
  logged out.
- AIPro anonymous output excludes private metrics even when given a real
  `agentId`; an owning agent/admin can still access the full report.
- Archived agents do not appear in anonymous AIPro responses or public lookup.
- Private/draft properties and projects cannot be analyzed by anonymous users.
- URL fetch validation blocks internal addresses, redirects to internal
  addresses, oversized/slow responses, and unsupported schemes.
- Redis limits are atomic across instances; failure/unavailability never
  bypasses the budget.
- Tests cover page access, public entity boundaries, AIPro response allowlist,
  request size/input limits, URL safety, 429/503 behavior, and privileged
  refresh/management routes.

## Out of scope

No new AI engines or new input forms. No anonymous exposure of private
AI-generated agent data.
