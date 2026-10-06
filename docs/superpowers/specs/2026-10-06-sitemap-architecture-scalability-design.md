# Sitemap Architecture and Scalability

## Scope

Correct the topology and scalability of public Buy, Rent, and Projects sitemaps without implementing the separate database-persistence/cache-reliability redesign described in `2026-10-05-sitemap-delivery-reliability-design.md`.

The change must leave clear generation boundaries so the later persistence work can wrap the same query, canonical URL, chunking, XML, and index layers without rewriting them.

## Current architecture and defects

`lib/sitemap/sitemapService.ts` currently loads all property and project rows into memory, emits one URL-set per type, adds Buy/Rent landing pages to their respective property sitemap outputs, and generates a redundant `properties` sitemap. The generated sitemap index uses the single-file convention (`/sitemap-{type}.xml`). The admin dashboard derives a public link from that convention and therefore cannot represent a type with more than one public child file.

The canonical public listing routes already exist:

- SALE listings: `/buy/[slug]`
- RENT listings: `/rent/[slug]`

`buildManualPropertyPath` is the canonical route builder used by the public detail-page metadata and must remain the only sitemap URL builder for manual listings.

## Eligibility and canonical identity

The property source must include only records satisfying the existing public-page rules:

- `ManualProperty.status === PUBLISHED`
- `ManualProperty.sourceType === MANUAL`
- the owning agent is approved and `LIVE`
- the owning user is `ACTIVE`

`ManualProperty.intent` is the only canonical Buy/Rent classifier. `SALE` produces `/buy/...`; `RENT` produces `/rent/...`. Any unrecognized source value is excluded and reported in private/admin generation diagnostics; it is never silently treated as SALE. URL construction uses a non-empty ID and `buildManualPropertyPath`; duplicate canonical paths are emitted only once per logical sitemap.

`/buy` and `/rent` remain in the static Pages sitemap. They are not entries in the property-specific Buy/Rent datasets.

## Sitemap topology

The public index contains every generated child artifact for the logical sources:

- `/sitemap-pages.xml`
- `/sitemap-projects-1.xml`, `/sitemap-projects-2.xml`, …
- `/sitemap-buy-1.xml`, `/sitemap-buy-2.xml`, …
- `/sitemap-rent-1.xml`, `/sitemap-rent-2.xml`, …
- existing Blogs, Developers, and Ecosystem Partner sitemap URLs unchanged unless a shared chunking change is explicitly required later.

Each URL-set contains no more than 50,000 URLs and respects the XML sitemap byte limit defensively. Chunk names are deterministic and one-based. A logical type with URLs always uses its numbered public child form, including its first file; this prevents a fake monolithic link and lets the index and dashboard use one consistent representation. Empty dynamic types produce no child artifact or index entry.

The chunk builder measures the UTF-8 byte length of the complete uncompressed XML document after escaping. It flushes before either 50,000 URLs or 50 MiB (52,428,800 UTF-8 bytes), leaving room for the closing document. If one escaped URL entry cannot fit in an otherwise empty document, generation fails that logical source rather than publishing an invalid sitemap.

The generic `properties` sitemap is removed from generation metadata, the index, dashboard output, validation, cache/revalidation lookup, and its Next.js public route. It must not remain as a dead indexable URL.

At generation completion, cached artifacts belonging to a regenerated logical type but absent from its new chunk manifest are retired. Retired chunk paths, including `/sitemap-properties.xml`, return `404` with `X-Robots-Tag: noindex` rather than stale XML or a redirect. Chunk routes use an explicit generated-manifest lookup so an arbitrary ordinal cannot fall back to an unrelated cached file. The root index never references retired paths.

## Generation units and data flow

1. **Eligibility query layer**: provides a cursor-paginated, stable stream of minimal rows for a logical source. It uses a deterministic unique order by `id`; the property predicate includes public visibility plus a fixed `intent` per Buy/Rent query. Projects use their existing published/non-deleted predicate.
2. **Canonical URL layer**: converts a source row into its public URL and records a private exclusion reason when it cannot safely do so.
3. **Chunk builder**: accepts URLs incrementally, deduplicates canonical paths within the current logical source, flushes a validated XML child at the sitemap limit, and exposes chunk metadata (`type`, ordinal, URL count, public path, size).
4. **Index layer**: constructs XML solely from the actual generated child metadata. It cannot reference an anticipated or missing file.
5. **Delivery layer**: retains the current cache/delivery mechanism in this phase, but consumes only chunk metadata and XML artifacts. It must not own eligibility or URL construction.
6. **Dashboard/status layer**: consumes generated logical-source and child metadata rather than reconstructing links from a type string.

These units have explicit contracts:

- `SourcePage<T>`: `{ rows: T[]; nextCursor: string | null; scanned: number }`; source readers throw source-scoped errors instead of returning error-shaped empty pages. `pageSize` is a shared internal constant, initially 5,000.
- `CanonicalResult`: `{ kind: 'included'; url: SitemapUrl }` or `{ kind: 'excluded'; reason: 'missing-id' | 'invalid-intent' | 'invalid-canonical-path' | 'duplicate-canonical-url' }`. URL-builder exceptions are caught here, logged server-side, and classified as `invalid-canonical-path`.
- `ChunkArtifact`: `{ logicalType; ordinal; publicPath; xml; urlCount; byteSize; lastmod }`. The chunk builder alone owns ordinal assignment and XML-size validation.
- `SourceGenerationResult`: `{ logicalType; recordsScanned; included; excludedByReason; chunks: ChunkArtifact[]; durationMs }` or a source-scoped failure. It owns diagnostics; subsequent layers do not inspect raw rows.
- `GenerationResult`: successful source results, failed-source diagnostics, index artifact, total duration, and status. Cache delivery and dashboard formatting consume this result only.

The generator maintains bounded working memory: one database page and one in-progress sitemap chunk, rather than all qualifying rows. Cursor progression uses the last processed unique ID, avoiding offset drift as records change during generation. The current cache behavior is intentionally retained; the later reliability work may replace only the delivery/persistence implementation.

## Diagnostics and failure handling

Generation returns private/admin diagnostics per logical source: records scanned, included URLs, excluded records grouped by reason, chunk count, duration, and errors. Public XML endpoints continue to disclose only generic availability failures.

Source-query failure is not converted into a successful empty sitemap. The existing local-cache fallback semantics remain unchanged in this phase; the forthcoming reliability change will make artifact persistence and atomic publication durable. A failed query must not produce a new index entry for an empty generated Buy, Rent, or Projects source.

An empty successful source has zero chunks and an explicit `EMPTY` diagnostic state. If regeneration fails with a prior cached artifact, the dashboard shows `FAILED` or `PARTIAL` for the new run and labels the displayed prior chunk links as retained stale artifacts; it never reports the run as successful. With no prior artifact, the source is unavailable and has no public link.

Malformed, non-canonical, duplicate, or wrong-intent property URLs are excluded. URL-set and index XML are validated for absolute HTTPS location, XML escaping, expected root element/namespace, no duplicate locations, and maximum URL count before cache delivery.

## Dashboard behavior

The Sitemap Breakdown removes Properties entirely. Each logical sitemap type shows total URLs, chunk count, validity/status, generated duration/diagnostic summary, and links to every actual public child file. It must no longer derive links using `/sitemap-{type}.xml` for chunked types. Admin generation failure states must remain visible and cannot be rendered as a successful regeneration.

## Database performance

Inspect the existing Prisma indexes before adding a migration. Add only an index needed by the selected cursor predicate/order, likely a composite property visibility/intent/id index if no suitable existing index covers it. Projects receive the equivalent review for their published/non-deleted/id query. No full-table reads or offset pagination are permitted.

## Compatibility and rollout

- Preserve canonical page routes and their metadata URL builder.
- Preserve the root `/sitemap.xml` and its robots.txt reference.
- Preserve unrelated sitemap source filtering and public paths.
- Deploy any required additive database index migration before code relying on it.
- Trigger a controlled regeneration after deployment and verify the root index and every referenced Buy, Rent, and Projects chunk.
- The subsequent persistence/cache-reliability project may replace artifact storage and publication only; it should retain the units and public topology in this design.

## Verification

Tests must cover:

- public eligibility and SALE/RENT separation;
- canonical path parity with the public page route builder;
- invalid/unknown intent and invalid URL exclusion diagnostics;
- deduplication and no generic Properties sitemap;
- chunk boundaries at 49,999, 50,000, and 50,001 URLs;
- cursor sequencing and bounded page/chunk operation;
- dynamic index membership matching generated chunks exactly;
- project use of the same chunk engine;
- XML namespace, escaping, absolute HTTPS URLs, and response content type;
- dashboard use of real child links/counts;
- unchanged robots sitemap reference and unrelated sitemap behavior.

Run focused tests, Prisma validation/generation as applicable, lint for changed files, `git diff --check`, and a production build before delivery.
