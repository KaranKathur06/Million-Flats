# Buy and Rent Database Pool Pressure

## Goal

Restore reliable property and location loading on `/buy` and `/rent` when
database connections are saturated, and prevent the pages from presenting
stale counts or pagination beside a failed property request.

## Evidence

- The supplied buy and rent screenshots show failures in both the property
  feed and city options.
- The attached application logs repeatedly report Prisma `P2024` pool
  acquisition timeouts with a connection limit of five. The errors affect
  property reads and unrelated models, indicating shared database pressure
  rather than a route-only rendering defect.
- The locations handler reads canonical communities without a country filter
  and filters them in application code. It is uncached and queried from the
  browser on page load.
- The properties hook clears property cards on failure but leaves the previous
  `totalCount`, which can leave stale result totals and pagination visible.
- The supplied logs do not include a verified database connection budget or
  production process count. Raising per-process connections without those
  values could overload the database.

## Design

### Reduce browse endpoint database work

- Scope canonical community reads to the selected country and, when supplied,
  the selected city. Preserve the existing response shape and city/locality
  option behavior.
- Cache the low-churn location options for five minutes, keyed by normalized
  country and city. Keep request-specific parsing and validation outside the
  cache.
- Keep property filtering, pagination, sort order, and result count semantics
  unchanged. Do not introduce unbounded query retries or broaden the query
  result set.

### Make pool exhaustion explicit and recoverable

- Classify Prisma `P2024` errors in the properties and location API handlers
  as temporary service unavailability (`503`) with a short `Retry-After`
  header. Continue logging the server-side error; do not expose Prisma
  internals to clients.
- Ignore stale client responses when a newer properties request supersedes
  them.
- On a failed feed request, clear the result count so pagination cannot imply
  that results loaded successfully. Show the existing user-facing error and a
  manual retry action.
- Retain the location retry affordance. Do not automatically retry pool
  timeouts; client retry loops could increase load during saturation.

### Pool sizing and infrastructure

- Do not change Prisma's per-process connection limit, global pool timeout, or
  database infrastructure in this change.
- Revisit pool sizing or a managed connection pooler only after measuring the
  database's available connection budget and the number of application
  processes/workers.
- This code-level work reduces browse-path pressure but cannot guarantee that
  unrelated endpoints stop timing out if global database demand remains above
  capacity.

## Alternatives considered

1. **Client-only retry:** offers limited recovery but leaves the repeated
   database reads and shared-pool pressure unchanged.
2. **Scoped/cached location reads plus explicit feed recovery (recommended):**
   reduces avoidable browse traffic, preserves filtering behavior, and makes
   saturation visible without unsafe pool tuning.
3. **Increase Prisma pool limits or add a connection pooler immediately:**
   may address broader saturation, but safe configuration requires the
   database connection budget and production process count, which were not
   supplied.

## Validation and acceptance

- Location API tests verify country and optional city constraints, preserved
  response semantics, and cache-key separation between markets.
- Properties and location API tests verify that `P2024` responses return
  `503` and `Retry-After` without exposing database error details.
- Client tests verify stale requests do not replace newer results, failed
  requests clear the count, and manual retry remains available.
- Normal successful buy/rent queries retain filtering, sorting, pagination,
  and city options.
- Run focused tests and workspace diagnostics for changed files.
- Verify buy and rent pages no longer show stale counts or pagination after a
  failed feed request. Load behavior under production-level traffic and
  cross-endpoint pool capacity remain operational follow-up checks.

## Out of scope

- Changing PostgreSQL/RDS capacity, connection limits, PM2 worker counts, or
  adding PgBouncer/RDS Proxy.
- Broad optimization of unrelated project, ecosystem, or detail-page queries.
- Changing which properties are publicly visible or modifying buy/rent filter
  semantics.
