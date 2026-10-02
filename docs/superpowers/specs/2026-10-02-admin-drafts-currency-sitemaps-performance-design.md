# Admin Draft Workflows, Currency, Sitemaps, and Performance

## Context and objective

This coordinated work addresses five connected requests in the MillionFlats Next.js 14 marketplace: expose project Draft counts, add usable bulk actions for both project drafts and manually entered property drafts, default display currency to INR, simplify the homepage Meta-dology message, expose dedicated Buy and Rent sitemaps, and improve the homepage performance identified by the supplied desktop PageSpeed Insights report.

The current project API counts `DRAFT` and `PUBLISHED` together as Active and returns at most 500 projects. The `/admin/drafts` page is a separate workflow for `ManualProperty` records in `DRAFT`; it also returns at most 500 and currently supports only single-row deletion. Project bulk actions already exist in `/admin/projects`. Property lifecycle actions already exist in `/api/admin/properties/bulk-action`, and each manual property publication is readiness-checked and audited. The single-draft deletion route removes associated S3 media and writes an audit record, so batch deletion must preserve both behaviors.

The shared display-currency default is currently AED. The browser persists an explicit choice in local storage. The sitemap index currently includes `/buy` and `/rent` as static URLs and property details together in `sitemap-properties.xml`; property detail paths already vary by sale/rent intent.

The supplied desktop PSI report (September 30, 2026) scored Performance 60, with Total Blocking Time 2,650 ms, 9,131 KiB total payload, estimated image savings of 6,832 KiB, cache-lifetime savings of 7,889 KiB, 842 KiB unused JavaScript, and 276 KiB unused CSS. FCP was 0.5 s, LCP 0.9 s, and CLS 0.012, so initial render delay is not the primary reported issue.

## Objectives and boundaries

- Make project Draft inventory directly visible without conflating it with published Active projects.
- Provide useful bulk operations in both admin draft workflows without bypassing authorization, lifecycle validation, audit logging, or media cleanup.
- Change only the initial display-currency choice; a previously saved user choice remains authoritative.
- Use the requested Meta-dology sentence as the prominent message and remove the supporting small copy around it.
- Expose unambiguous, canonical Buy and Rent URL sets to crawlers without duplicating those URLs in the sitemap index.
- Improve measured homepage delivery while preserving required analytics, video events, customer-support integrations, accessibility, and visual content.

This does not redesign the whole admin experience, change project/property schemas, change listing ownership, alter exchange rates, or promise a specific Lighthouse score. Counts are exact, but bulk selection remains bounded to the records currently loaded (up to 500) until pagination or server-side filter-wide selection is separately designed.

## Admin project counts and lifecycle controls

Add a first-class Draft filter/count to the Projects lifecycle tabs. Counts are computed independently in the database: All includes every project; Active counts non-deleted `PUBLISHED` projects; Draft counts non-deleted `DRAFT` projects; Archived counts non-deleted `ARCHIVED` projects; Deleted counts soft-deleted projects. Each tab's query predicate must match its count predicate, so Active rows become Published-only and Draft rows are shown only under Draft. The GET response retains the existing response structure where practical and adds the Draft count. Search, city/developer filters, and selection mechanics remain unchanged within the currently displayed rows.

The selection toolbar remains the shared entry point for bulk project actions. Actions that do not apply to the selected lifecycle state are disabled or omitted with clear feedback. Publishing continues through the existing readiness validation. Archive, soft-delete, restore, and permanent delete remain distinct lifecycle operations. Permanent project deletion is SUPERADMIN-only, requires the project to be soft-deleted first, and requires the exact typed confirmation `DELETE`. Single and bulk permanent deletion share one transaction that commits the project deletion, audit event, and durable S3 cleanup work item; partial failures are reported by project ID/count, and pending cleanup is surfaced separately. Successful rows are removed from selection and the list is refreshed. No bulk action may be represented as successful when its API reports failures.

## Manual property draft actions

Add selection checkboxes and a selected-record toolbar to `/admin/drafts`. For the displayed `DRAFT` records, offer Publish, Archive, and Delete permanently. Unpublish is not offered because it is not a valid operation for a row already in Draft. Publishing reuses the manual-property lifecycle service and its readiness checks; the UI reports per-record partial failures and leaves failures selected for correction.

Implement a bounded bulk-draft endpoint/service that applies the same admin role checks as the existing property bulk endpoint. Reuse `applyManualPropertyAdminAction` for publish/archive transitions. For permanent deletion, share the existing draft deletion behavior rather than calling `deleteMany`: verify the record is still a manual DRAFT, then atomically commit the database deletion, audit event, and durable cleanup outbox item in one transaction. If the outbox item or audit event cannot be persisted, roll back the deletion. A retry worker processes associated S3 keys idempotently; API results distinguish deleted records from media cleanup that is pending or failed. Apply rate limiting once to the batch, cap and deduplicate submitted IDs, and return per-ID success/failure/cleanup state. The existing one-record endpoint remains supported and uses the same deletion implementation to prevent behavior drift.

The server-rendered page queries an exact Draft count separately from the capped row query and displays that count in the Draft heading. Admin role/capability checks remain enforced on the server; hiding controls in the client is not authorization.

## Default currency and homepage message

Set `DEFAULT_DISPLAY_CURRENCY` to `INR`. Continue to restore a valid value from `millionflats-display-currency`, so users who deliberately selected AED retain that choice. Guard local-storage reads and writes because browser privacy modes can throw; a failed read falls back to INR and must not break the provider. Do not modify stored project/property currency or conversion logic.

In `MetaDologyVideoSection`, replace the existing headline with: “MillionFlats unifies AI, verified digital twins, and data intelligence through Meta-dology™.” Remove the small eyebrow, explanatory paragraph, and small post-video line so this message is the only copy in that section. Keep the video, responsive sizing, accessible iframe title, and event tracking intact.

## Buy and Rent sitemap strategy

Generate dedicated `sitemap-buy.xml` and `sitemap-rent.xml` URL sets. Each contains its canonical landing page and only public, published manual property URLs for its matching intent, with valid last-modified dates, XML escaping, and per-set deduplication. Include both sitemap types in the index when they contain URLs.

Keep `/sitemap-properties.xml` available during this change for compatibility, but do not list its combined duplicate URL set in the sitemap index. Continue including `/buy` and `/rent` in the dedicated intent sitemap rather than also listing them in the general static-pages sitemap. Generate and cache the legacy combined XML alongside the new intent-specific XML, but maintain sitemap-index membership independently from generated cache files. Version the index cache format (or validate required members and forbidden legacy entries) so an existing 24-hour cache cannot keep serving the pre-deployment index. Update sitemap dashboard cache metadata/types consistently. Preserve stale-cache fallback for valid current-format indexes and child sitemaps. Do not include drafts, deleted, archived, or otherwise non-public records.

## Performance strategy

Treat the provided desktop report as a diagnostic baseline, not a guarantee about every page or mobile. Start by mapping PSI treemap and network savings to first-party assets and scripts used by the homepage/global shell. Prioritize:

- reducing main-thread JavaScript and long tasks by deferring or splitting verified non-critical client features;
- evaluating the global customer-support script and homepage video embed for safe delayed loading while preserving their behavior and existing tracking;
- delivering correctly sized/compressed first-party images and reducing excess image bytes without degrading the visible homepage hero;
- setting or correcting cache lifetimes only for assets whose mutability/versioning is understood;
- removing unused CSS/JavaScript only where ownership and route usage are verified.

Do not indiscriminately delay analytics, remove integrations, or change global cache headers without verifying downstream behavior. Keep the first performance pass focused on the homepage and shared assets implicated by PSI. Record before/after lab metrics under the same desktop conditions and report any item that cannot be verified without a production deployment.

## Failure, security, and consistency behavior

- All bulk endpoints authenticate and authorize on the server, validate action and ID shape/count, deduplicate IDs, and return per-record failures.
- Publishing is never a blind status update; readiness and legal lifecycle transitions remain authoritative.
- Permanent deletion has explicit confirmation. The deletion audit event and database mutation commit atomically; failed cleanup remains in a durable retry queue, is observable, and is reported as pending cleanup rather than as a rolled-back deletion.
- Sitemap generation failure continues to serve a valid stale cache when available; empty or failed database queries must not inject draft URLs.
- A local-storage currency read failure falls back to INR; a valid saved preference is preserved.
- Deferred performance features must retain analytics and support behavior and provide a non-blocking fallback if their third-party request fails.

## Validation

- Project API tests verify exact counts for draft, published, archived, and deleted populations; each tab's rows agree with its count, Draft filter excludes deleted rows, and row data remains capped independently of counts.
- Admin UI checks verify Draft count/tab, row selection, lifecycle-appropriate actions, confirmation, partial-failure messaging, and selection refresh behavior on desktop and mobile.
- Property bulk API tests cover malformed/duplicate/oversized IDs, role denial, readiness failure, invalid lifecycle transition, partial success, rate limiting, atomic audit/deletion/outbox behavior, rollback when audit or outbox persistence fails, and cleanup retry/idempotency after S3 failure.
- Currency tests verify INR for first-time users, preservation of a valid saved AED preference, and fallback to INR when `localStorage.getItem` throws.
- Meta-dology section test/inspection verifies the exact headline is present and secondary copy is absent while the iframe remains accessible and event tracking is unchanged.
- Sitemap tests parse generated XML, assert `/buy` and `/rent` are in their dedicated sets and absent from the general pages sitemap, verify sale/rent property separation, verify no duplicate index entries and no index reference to the legacy combined sitemap, and exclude non-public records. Simulate an old-format cached index and verify it is regenerated; confirm the compatibility endpoint remains available and contains both public intents.
- Run targeted tests, TypeScript/lint checks for touched files, and a production build.
- Re-run the same desktop Lighthouse/PageSpeed audit where available. Compare Performance, TBT, payload, image/cache savings, unused JavaScript/CSS, and console errors. Report measurements rather than asserting an unmeasured improvement.

## Rollout and rollback

Apply the `storage_cleanup_jobs` migration before enabling permanent-delete controls; it is required for atomic audit/outbox persistence. Deploy the API and UI changes together so new controls are backed by their lifecycle handlers. Schedule `GET /api/system/storage-cleanup` with `Authorization: Bearer $CRON_SECRET` at least every five minutes so failed or interrupted S3 cleanup jobs are retried. Bump or invalidate the sitemap-index cache version at deployment; child XML can continue using the existing TTL and stale fallback. Verify the public index, compatibility sitemap, and both intent sitemap responses after deployment. Performance changes should be independently revertible by feature/component so a third-party integration can be restored without reverting admin, currency, or sitemap work.