# Sitemap Delivery Reliability — Implementation Plan

## Objective

Replace instance-local sitemap files as the source of truth with shared, versioned database snapshots. Prevent failed source queries from replacing good sitemap XML with empty output, publish index and child files atomically, and make admin/public status match what is actually available.

**Approved design:** [2026-10-05-sitemap-delivery-reliability-design.md](../specs/2026-10-05-sitemap-delivery-reliability-design.md)

## Implementation sequence

### 1. Add shared sitemap snapshot persistence

**Files:** `prisma/schema.prisma`, `prisma/migrations/<timestamp>_shared_sitemap_snapshots/migration.sql`

- Add immutable generation snapshot metadata with a monotonic database-assigned sequence, `COMPLETE`/`PARTIAL`/`FAILED` status, generation time, duration, URL count, and structured source errors.
- Add child sitemap artifacts keyed by generation and type, containing XML, URL count, and format version.
- Add a singleton current-generation pointer with the published generation ID and sequence.
- Add a database sequence for generation ordering.
- Enforce uniqueness for one artifact per type per snapshot and a valid pointer to a published snapshot.
- Keep existing rows/cache unaffected; this is additive, with no unreliable import from local `.sitemap-cache`.

### 2. Separate source results from snapshot publication

**Files:** `lib/sitemap/sitemapService.ts`, optional focused helper modules under `lib/sitemap/`

- Refactor source fetching so each source returns either a successful URL set (including a valid empty set) or an explicit error. Remove catch-and-return-empty behavior from source-level fetchers.
- Keep current public visibility filters, canonical property paths, intent partitioning, XML escaping, and deduplication.
- Build the candidate for every existing sitemap type. For a failed source, carry forward the last published artifact; if none exists, omit that type from the candidate index.
- Preserve compatibility of `properties` output and its current excluded-from-index behavior.
- Allocate the generation sequence from the database before source queries.
- Prepare the exact candidate artifact set before publishing.
- In one transaction, write the snapshot and all child/index XML, then update the current pointer only if its sequence is lower than the candidate. Roll back artifacts if the compare-and-swap loses to a newer generation.
- Mark the run `PARTIAL` if any source failed, even if a prior artifact was retained; mark `COMPLETE` only when every source succeeded. Persist source-level errors and URL counts.
- Ensure the index XML is built from the exact artifacts in the candidate snapshot, never from anticipated filenames.

### 3. Serve published snapshots consistently

**Files:** `lib/sitemap/sitemapService.ts`, `app/sitemap.xml/route.ts`, all existing `app/sitemap-*/route.ts`

- Resolve the current-generation pointer once per read and return the requested sitemap artifact from that generation.
- If there is no published snapshot/artifact, initiate generation and then reread the pointer/artifact.
- Retain local cache only as a degraded fallback: validate XML/root type and accept only files no older than seven days.
- Mark degraded local responses with `X-Sitemap-Stale: true` and `Cache-Control: no-store`; without acceptable fallback return 503 with `Retry-After: 300`.
- Use common response helpers so every public sitemap route applies XML content type and the same normal `Cache-Control: public, max-age=60, s-maxage=300, must-revalidate` headers.
- Preserve `robots.txt`, route names, and index/child URL compatibility.

### 4. Align generation and status APIs with persisted outcomes

**Files:** `app/api/system/sitemap/generate/route.ts`, `app/api/system/sitemap/status/route.ts`, `lib/sitemap/sitemapService.ts`

- Make status read published snapshot counts/cache state and latest persisted generation outcome.
- Keep cron-secret and moderator/admin authorization behavior intact.
- Return 200 only for `COMPLETE`; return 503 with a structured result for `PARTIAL` or `FAILED`. Preserve an explicit result when a run loses publication ordering to a newer snapshot.
- Do not return filesystem-derived cache status as if it were globally authoritative.
- Keep detailed query errors private to the authorized status API and server logs; public XML routes should return generic failure text.

### 5. Make the admin dashboard communicate real sitemap health

**Files:** `app/admin/seo/sitemap-dashboard/SitemapDashboardClient.tsx`, relevant status/generation API tests

- Show the published generation status and timestamp, not merely whether process-local files exist.
- Display per-source failures and identify when an old artifact was retained.
- Treat `PARTIAL` and `FAILED` response statuses or result states as failures, not success-shaped notifications.
- Refresh dashboard state after generation and clearly distinguish a new complete snapshot from retained previous data.
- Preserve existing links to public sitemap URLs and current manual regenerate workflow.

### 6. Add focused tests and validate rollout

**Files:** sitemap unit/API tests under `tests/unit/`

- Test complete snapshot publication and serving from a different/empty local cache directory.
- Test generated index membership exactly matches artifacts in the published snapshot.
- Test source errors retain only that source's previous artifact and never replace it with empty XML.
- Test a failed source without an earlier artifact is omitted and surfaced.
- Test simultaneous runs: a lower sequence cannot replace a higher published sequence; compare-and-swap loser rolls back its artifacts.
- Test empty-but-successful source responses, initial generation, all dynamic-source failures, and unavailable database/cache behavior.
- Test expected sitemap XML, escaping, canonical URL preservation, route content type, response cache headers, stale fallback header/age, and 503/Retry-After.
- Test complete/partial/failed API status codes, authorization, persisted status visibility, and dashboard partial-failure behavior.
- Run focused Jest selectors, Prisma schema validation/client generation, ESLint on changed files, `git diff --check`, and `npm run build`.
- Apply the migration before deploying code. After rollout, run manual generation and verify `/sitemap.xml` plus each child sitemap referenced by the index from public routes. Confirm a partial failure preserves the previous index/artifacts.

## Dependencies and completion criteria

- Steps 2–5 depend on step 1. Tests in step 6 should be added alongside each change and run again as a focused set at the end.
- Completion requires one valid published snapshot readable without `.sitemap-cache`, a consistent index, explicit partial-failure reporting, safe stale fallbacks, and passing focused/build validation.
- Deploy the additive migration before application rollout; complete rollout and a successful generation before declaring sitemap cache convergence.
