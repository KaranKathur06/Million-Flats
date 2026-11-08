# Homepage Video Reels and Featured Video Monetization

**Status:** Design for implementation planning  
**Date:** 2026-11-08  
**Scope:** Public homepage property/real-estate video reels and paid rotating featured-video campaigns  
**Out of scope:** MillionFlats Passport, exclusive placements, CPM/auction bidding, third-party ad networks, and physical media production

## 1. Objective and fixed product decisions

Add a short-form property and real-estate video experience to the existing MillionFlats homepage, plus a paid featured-video campaign product. Preserve the current Next.js application and payment/storage integrations, while keeping editorial content, advertiser campaigns, and payment records independently understandable.

The featured-video placement is **rotating inventory only**:

- Multiple advertisers can be eligible concurrently.
- The scheduler rotates eligible paid campaigns using their booked duration and display allocation.
- No advertiser purchases exclusive ownership of a homepage placement.
- Campaign priority, schedule, frequency, and delivery limits are administrator-controlled.
- A hard per-advertiser delivery ceiling and organic/house content between sponsored cards prevent one advertiser from dominating the feed.
- Campaigns expose measurable impressions, starts/views, completions, clicks, and engagement.

Video campaigns are separate from existing `ProjectVideo` records. Existing project videos remain project-detail content and are not silently converted into ad inventory.

## 2. Existing architecture and reuse

- The homepage is a Next.js App Router page with an existing configurable `HOME_SECTIONS` list. Add the reels section there, retaining its current order and responsive conventions.
- `ProjectVideo` is already attached to `Project` and is managed through project forms. Its lifecycle is not suitable for advertiser campaigns.
- Manual property uploads already support MP4/WebM through S3-compatible signed uploads. Reuse the storage/signing/asset URL primitives, with a reels-specific key namespace, ownership checks, a lower product-specific upload cap, and moderation before public serving.
- Razorpay order creation, signature verification, payment fetch, and webhook signature/idempotency primitives exist. Reuse those primitives; do not make a campaign depend on an agent subscription `Payment` row or the partner `PackagePurchase` entitlement model.
- The active `User` record links to Agent, AgencyProfile, or DeveloperProfile. Reuse these accounts and existing authorization/verification helpers; do not create a second advertiser identity system.

## 3. Product assumptions selected for this phase

These are launch defaults, not new permanent business constraints:

- Launch advertisers are active, verified Agent, Agency, or Developer accounts. An administrator may create and manage campaigns on their behalf. Other advertiser audiences require a later explicit authorization decision.
- A submitted short-form reel is at most 60 seconds and MP4 or WebM. The exact byte limit is an environment-backed configuration with a conservative default of 100 MiB, independent of the existing 500 MiB property-video limit.
- Campaigns use fixed-price, administrator-managed duration/allocation packages. Do not introduce CPM, bidding, variable per-impression charges, or auction logic.
- An administrator approves the reel and campaign booking before checkout is enabled. Captured payment activates delivery only when the campaign is approved and its schedule is currently eligible.
- When paid inventory is insufficient or a campaign reaches its caps, show eligible organic reels or house content; do not repeatedly serve one advertiser as a substitute for inventory.

## 4. Domain model

Add campaign-specific Prisma models and migrations; do not overload `ProjectVideo`, `Payment`, or `PackagePurchase`.

### 4.1 `VideoReel`

Stores one short-form creative and its owner:

- owner `User` relation and, where available, linked agent/agency/developer profile attribution;
- title, caption, media object key/URL, poster object key/URL, measured duration, optional linked public project/property, and timestamps;
- moderation state: `DRAFT`, `PENDING_REVIEW`, `APPROVED`, `REJECTED`, or `ARCHIVED`;
- reviewer, decision timestamp, and bounded rejection reason.

The owner is the authenticated `User`; an associated business profile is attribution only and does not change ownership. Only approved reels are returned to public endpoints. Store uploads in a private bucket/prefix: pending and rejected objects are never publicly addressable, and approved media is delivered through short-lived read URLs or an equivalent access-controlled CDN. Direct upload metadata is not trusted: enforce extension/content-type/size allowlists, verify magic bytes and media metadata from the stored object, and measure duration server-side with the deployed media-inspection tool before submission. Never accept arbitrary external playback URLs or expose signed write URLs in public responses. Admin review uses a short-lived private read URL. Rejected or abandoned uploads are deleted after 30 days; approved media is immutable, and a changed creative requires a new reel and moderation cycle. Archive removes a reel from public delivery; retain its object while a campaign/audit record references it, then delete under the same 30-day cleanup policy.

### 4.2 `VideoCampaign` and fixed campaign packages

A campaign references exactly one approved reel and the advertiser owner. It records:

- lifecycle state: `DRAFT`, `PENDING_REVIEW`, `APPROVED_AWAITING_PAYMENT`, `SCHEDULED`, `ACTIVE`, `PAUSED`, `COMPLETED`, `REJECTED`, or `CANCELLED`;
- requested/approved start and end times, package snapshot, target display allocation in basis points, administrator priority, optional daily and total impression caps, and a per-viewer frequency cap;
- the effective campaign order/payment relation and the final moderation/audit fields.

Campaign package definitions (fixed duration, permitted share band, default limits, amount in minor currency units, currency, active flag) are administrator-managed and versioned in the purchase snapshot. The client cannot choose or change price, priority, schedule approval, share, or caps by submitting raw values.

The authenticated advertiser `User` is the campaign owner and must own the selected reel. A linked Agent, Agency, or Developer profile may be used for public attribution only when it is the user's active, verified profile; submitted profile/owner IDs are never authorization evidence. An administrator creating a campaign on an advertiser's behalf records both the beneficiary owner and the acting admin in the audit trail. Admin settings include the rotation cadence, maximum permitted allocation, default frequency cap, scheduling horizon, and campaign priority. Allocation is an absolute share of all sponsored opportunities during the campaign's approved UTC schedule, not a relative weight or guaranteed number of impressions; concurrent approved allocations may not sum above 10,000 basis points. Unallocated share belongs to organic/house content and is never redistributed to other advertisers. Priority is a tie-breaker only and cannot override allocation or fairness limits.

### 4.3 `VideoCampaignOrder`

A dedicated purchase record snapshots campaign/package, purchaser, amount, tax/currency, idempotency key, Razorpay order/payment IDs, `CREATING`, `CREATED`, `CAPTURED`, `FAILED`, or `REFUNDED` status, and timestamps. Enforce unique owner/idempotency-key, provider order ID, and payment ID constraints. Use current finance-approved tax configuration; if unavailable or invalid, do not create an order.

Order creation first persists a unique local order in `CREATING` with a stable receipt/reference, then creates the Razorpay order and persists its provider ID before returning checkout details. Repeated requests with the same idempotency key return the existing order; a provider timeout with unknown outcome is not blindly retried, but is reconciled by stable receipt/reference or surfaced for administrative reconciliation to avoid duplicate provider orders. The endpoint accepts only a server-known approved campaign/package snapshot. Verification confirms the provider signature and fetches the provider order/payment to verify captured status, amount, currency, and order association. A signed webhook must match the unique provider order ID and the expected amount/currency before capture is accepted. Store a unique provider event ID and apply order capture plus campaign activation/scheduling in one database transaction; duplicate/out-of-order events are idempotent and cannot activate twice. Do not activate from a browser success callback alone. If the database is unavailable, return a retryable webhook failure; a periodic/manual reconciliation path re-fetches provider state for unresolved orders and applies the same checks and transaction.

Campaign moderation precedes checkout, so no advertiser is charged for content rejected during the initial review. A captured order moves its approved campaign to `SCHEDULED` when the approved start time is in the future or `ACTIVE` when the schedule is currently open; a future campaign becomes active at its start time through eligibility evaluation. Automated refunds, prorating, and self-serve cancellation are not part of this phase; finance/support follow the existing manual refund policy. An administrator can pause delivery without altering the captured payment record.

### 4.4 Delivery metrics

Record privacy-minimized campaign events and daily aggregates:

- event types: `IMPRESSION`, `START`, `QUALIFIED_VIEW`, `COMPLETE`, `CLICK`, `ENGAGEMENT`;
- campaign, event ID/idempotency key, event timestamp, and a first-party pseudonymous viewer-token HMAC; the raw random viewer token is held only in a Secure, HttpOnly, SameSite cookie, is not logged or persisted, and rotates every 30 days;
- unique event key and appropriate campaign/date/event indexes;
- daily totals including impressions, qualified views, completions, clicks, engagement, and derived CTR/completion rate; report a rate as `null` when its denominator is zero.

An impression requires at least 50% of the card to be in view continuously for one second. A start is playback beginning. A qualified view requires 10 seconds of playback; completion requires the media's actual ended event. Click is a user-initiated activation of the reviewed destination. Engagement is a user-initiated share action from the reel's share control; passive playback/scrolling is not engagement. CTR is unique clicks divided by impressions; completion rate is completions divided by starts. Count each metric at most once per delivery token. Do not store raw IP addresses, email, names, or persistent cross-site identifiers in analytics. Deduplicate events by event ID and by the metric/token pair; enforce the campaign frequency cap using the viewer-token HMAC over a rolling 24-hour window. The HMAC key is server-only and rotated at least every 30 days, retaining the previous key for 24 hours so rotation cannot reset the frequency window. Frequency enforcement is best-effort where users block first-party cookies, with per-session limits as fallback. Event writes are idempotent, bounded, and validate that the campaign was eligible and served by the rotation API, as well as sensible event ordering and elapsed time. Invalid, stale, replayed, or fabricated campaign tokens do not increment delivery metrics.

Keep detailed event retention bounded at 90 days, aggregate long-term campaign results into daily rows, and delete viewer-token HMACs with the detailed events; daily campaign aggregates contain no viewer identifiers and are retained for 24 months after campaign end, subject to finance/privacy approval before launch. Apply the repository's existing privacy and deletion conventions. Client events are validated signals, not independently verified proof of attention; do not claim viewability from a network response alone.

## 5. Rotation and delivery policy

Use one shared rotating pool for all homepage reel sponsorships; sponsored cards are interleaved with organic or house content and no placement is sold exclusively.

The feed contains batches of up to 12 cards. No more than one card in any four consecutive cards may be sponsored (maximum 25% of feed cards); fill unused positions with approved organic reels or house content. The server assigns sponsorship opportunities at every fourth position in the continuous feed sequence; an opaque cursor carries the global card offset across batches, so pagination cannot reset the cadence.

1. For each opportunity, include in allocation accounting every campaign with approved content, confirmed captured payment, and an approved UTC schedule containing now, including campaigns that are paused, capped, frequency-limited, or temporarily unavailable. Delivery eligibility is checked separately after allocation selection; an unusable assignment becomes house/organic content rather than being redistributed.
2. Uses deterministic weighted-deficit scheduling for absolute allocations. For every sponsored opportunity, add each campaign's approved basis-point allocation to its deficit and add the unallocated share to a house/organic deficit; select the largest deficit and subtract 10,000 from the selected deficit. Campaigns scheduled during the period retain their allocated share even when paused, capped, frequency-limited, or temporarily unavailable: if selected but not deliverable, that opportunity becomes house/organic content, with no reassignment. Break equal deficits by admin priority, then stable campaign ID; house content is the final tie-breaker. State changes are atomic and durable in the database; Redis may cache scheduling state but cannot reset opportunity sequence, deficits, fairness history, or paid-delivery counts after loss. If Redis is unavailable, fail closed for sponsored delivery while continuing the organic feed.
3. Enforces advertiser fairness across all campaigns owned by a `User`: reset the sponsored-opportunity sequence at 00:00 UTC each day and partition that day's sequence into blocks of four (opportunities 1-4, 5-8, etc.); an advertiser may receive at most one delivery in each complete block. In the day's final incomplete block, an advertiser may receive at most one and receives no carry-over entitlement at the next UTC day. A slot assigned to a capped/paused advertiser becomes house/organic content and does not get reassigned. This is a hard 25% ceiling over complete blocks and prevents a sole advertiser from occupying every paid slot. Sum of scheduled campaign allocations remains at most 10,000 basis points for every overlapping schedule period.
4. Applies the campaign frequency cap per pseudonymous viewer and respects UTC-day and lifetime campaign impression limits. Admin overrides can lower limits or pause campaigns but cannot disable the cadence/fairness rules.
5. Emits a short-lived signed delivery token bound to campaign, creative, placement, viewer scope, and expiry for validating client metric events. Only a token-backed impression increments delivery allocation/caps; other events are deduplicated against that impression. A payment callback or schedule transition never reactivates a paused or completed campaign.

The allocation is a target, not a guaranteed minimum; caps, viewer frequency, organic inventory, and advertiser fairness may reduce actual delivery. A campaign that cannot use its assigned opportunity does not cause another campaign to exceed its absolute allocation. No campaign can be served unless its creative and campaign are approved and its order is captured. Scheduling and rotation use server time in UTC; UI renders in the advertiser/admin locale.

## 6. Public and advertiser flows

### Public homepage

- Add a responsive video-reels section using accessible controls, captions, poster images, and reduced-motion behavior.
- Fetch only approved organic reels and currently eligible sponsored items from a `no-store` public API.
- Lazy-load media, do not autoplay with sound, provide mute/play controls, and pause off-screen media. Support keyboard navigation and a usable static state if the video feed or metrics endpoint is unavailable.
- Sponsored creatives are labeled clearly. Click destinations use server-approved internal property/project routes or validated HTTPS destinations reviewed by admins.

### Advertiser

- Verified Agent/Agency/Developer users can upload and manage their own reels, submit them for moderation, and request a campaign package/schedule for an approved reel. The campaign owner must be the same `User` as the reel owner; only that user's active verified profile may be used for attribution.
- Users can view and edit only their own creatives, bookings, payment state, and analytics. Ownership is derived from the authenticated server session; never from a submitted owner/profile ID. Admin-created-on-behalf actions preserve the beneficiary owner and record the acting administrator.
- After admin campaign approval, the advertiser checks out through Razorpay. The campaign becomes eligible only after verified capture and the approved schedule start.
- On the dashboard show campaign status, booked duration/allocation, spend/payment status, impressions, qualified views, completions, clicks, engagement, CTR, and completion rate.

### Admin

- Add protected moderation/booking management to existing admin surfaces, reusing current RBAC and audit patterns.
- Review reels and campaigns, approve/reject/pause, configure package catalog and rotation limits, set priority/schedule/caps, and inspect aggregate delivery/payment results.
- Every administrative override, approval, rejection, schedule, package, and limit change is auditable.

## 7. API and failure behavior

Use focused route handlers for reel uploads/submissions, public feed/rotation, campaign requests, campaign order creation/verification, event ingestion, advertiser reporting, and admin moderation/configuration. Share authorization, validation, rotation, payment, and metrics services rather than duplicating behavior among aliases.

- Validate payload shape and media fields server-side; reject unknown keys and oversized bodies.
- Return stable non-2xx errors without internal provider details, credentials, or advertiser-private data.
- If rotation/Redis is unavailable while the database is healthy, omit sponsored items and return approved organic reels. If the database or media service is unavailable, return a configured static house-reel manifest served from the public CDN; if that is unavailable or empty, hide the reels section rather than returning an error-shaped or stale sponsored response.
- Payment, database, or Redis failure must never produce a success-shaped activated campaign. Razorpay webhook failures remain retryable and idempotent; unresolved provider/database outcomes remain pending for reconciliation and are surfaced to administrators without exposing raw provider payloads to public callers.
- Enforce `no-store` on user-specific and campaign delivery responses. Public creative responses contain only approved public fields.

## 8. Security, privacy, and operations

- Enforce active/verified advertiser authorization and admin RBAC on every write/read endpoint.
- Validate media key ownership and upload lifecycle. Limit type, file size, duration, and poster dimensions; verify stored object bytes and duration server-side; reject external media URLs, arbitrary redirect targets, and media not uploaded to the expected private namespace. Public delivery is enabled only after moderation approval.
- Use CSRF/origin protection consistent with existing state-changing browser routes; use server-side ownership checks and transaction/idempotency constraints for orders and campaign activation.
- Keep Razorpay secrets server-only. Never log payment signatures, raw provider payloads, private URLs, viewer tokens, raw IPs, or user-generated video captions as structured identifiers.
- Add rate limits to uploads, campaign creation, checkout, and analytics event ingestion. Invalid/stale event tokens do not count.
- Keep the feature behind a server-side default-off rollout flag until migration, webhook routing, private storage/CDN access, deployed media inspection, public moderation, and analytics privacy checks pass. No production payment or ad spend is enabled by local build success alone.
- Platform operations owns the payment reconciliation runbook and alerting. Alert administrators/operations when a paid order remains unresolved for more than 15 minutes; production rollout requires a named owner and tested escalation path.

## 9. Testing and acceptance

### Data/API

1. Prisma migration adds only campaign/reel/order/event/config records and uniqueness/index constraints; existing project video and payment behavior is unchanged.
2. Public endpoints return approved reels only and never return pending/rejected media, storage write credentials, owner-private fields, or raw provider data; pending/rejected objects are inaccessible except through authenticated, short-lived admin review access.
3. Unauthorized, unverified, cross-owner, and non-admin actions are denied; admin actions are role-guarded and audited.
4. Upload rejects oversized, unsupported, wrongly owned, or externally hosted media; stored bytes and duration are inspected server-side, pending/rejected assets remain private, and rejected creatives never become public.
5. Only an approved campaign with verified captured payment and a valid schedule/cap is eligible; payment callbacks never resume paused/completed campaigns.
6. Order creation is price-snapshot/idempotency safe; signature, amount, currency, provider order, and webhook event idempotency are verified; duplicate/out-of-order callbacks do not activate twice; provider timeouts and database failures remain reconcilable without blind duplicate order creation.
7. Scheduler tests cover simultaneous advertisers, absolute allocation with unallocated share and ineligible allocations going to house content, deterministic deficit/tie-break behavior, the advertiser ceiling (at most one delivery in each UTC-day block of four sponsored opportunities), the one-per-four feed-card cadence across cursor/batch boundaries, partial blocks, no advertiser catch-up entitlement, pauses, schedule boundaries, daily/total caps, persisted sequence/deficit/fairness state across Redis recovery, and Redis failure fallback.
8. Event tests cover exact impression/view/completion/click/share thresholds and formulas, forged/expired/replayed tokens, invalid event ordering, duplicate event IDs/metrics, 24-hour frequency caps across HMAC-key rotation, cookie-block fallback, aggregation, 90-day event deletion, and no raw IP/PII persistence.
9. Advertiser analytics enforce owner scoping and return exact agreed aggregate metrics only.

### UI and rollout

1. Homepage reels are responsive and accessible, labeled for sponsorship, do not autoplay with sound, and fall back gracefully when video APIs/storage are unavailable.
2. Advertiser dashboard reflects pending review, approval, payment, schedule, paused, and completed states without allowing users to modify approved price/priority/allocation.
3. Admin moderation, package/rotation configuration, and audit history are protected and usable.
4. Run targeted Jest tests, TypeScript, lint, Prisma validation/migration checks, and production build. Exercise the Razorpay webhook using signed fixtures without making a real charge.
5. Start with an internal flag and test account; verify observed advertiser share and event metrics before expanding access.
6. Production release remains blocked until provider webhook/reconciliation configuration and alerting owner, private storage/CDN behavior, server-side media inspection, tax configuration, admin moderation staffing, house-feed fallback, and 90-day event/24-month aggregate retention are signed off.

## 10. Deferred work

- CPM, auctions, dynamic bidding, and advertiser self-service allocation/priority overrides.
- External ad networks or ad-serving services.
- Automated video transcoding, captions generation, and multi-rendition adaptive streaming.
- Cross-platform ad attribution and persistent user profiling.
- Automatic refunds/proration and physical campaign production.
- MillionFlats Passport.
