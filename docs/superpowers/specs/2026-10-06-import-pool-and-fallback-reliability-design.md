# Import Pool and Fallback Reliability

## Context and problem

Production import analysis is failing with Prisma `P2024`: a query waits 10 seconds for a connection and the process-local Prisma pool is capped at five connections. The current analyzer calculates up to 15 records concurrently. For each record it may run database-backed relation resolution; property ownership resolution can run several sequential lookups, while multiple records and batches may be active in the same Node/PM2 worker. These lookups compete with ordinary application requests for the same Prisma pool. The atomic checkpoint itself is one raw SQL statement now, but it still needs to acquire a pool connection and can fail with `P2024`.

Some ownership-resolution lookups catch database errors and turn them into warnings. That can make a transient connection failure look like an ordinary data-quality result instead of a failed analysis that can be retried.

The production log also reports that `/images/default-property.jpg` is not a valid image. The file does not exist in `public`; the repository already contains a valid `public/image-placeholder.svg`.

## Goals and boundaries

- Reduce analysis-driven connection contention without changing the database's deployment-specific connection limit.
- Bound concurrent database-backed relation resolution across simultaneous imports in one Node process.
- Retry short-lived Prisma pool-acquisition failures a small, fixed number of times.
- Preserve explicit failure semantics for database connectivity problems rather than converting them into validation warnings.
- Replace all references to the missing default property JPG with a valid local placeholder asset.

This change does not raise `connection_limit`, add a database queue, alter the analysis schema, change relation-matching business rules, or redesign the app's general database access. The image change only corrects the missing fallback path; it does not redesign listing imagery.

## Approaches considered

1. **Raise the connection limit and pool timeout.** This can reduce pool waits quickly, but each PM2 worker owns a separate pool. Without the production worker count and database connection budget, raising this setting risks overloading PostgreSQL and does not reduce the import's query burst.
2. **Bound import query concurrency and retry transient pool waits (chosen).** A process-wide relation-resolution limiter protects the shared Prisma pool from an import burst while retaining the current analysis flow. Small bounded retries absorb a brief pool queue. This is targeted and does not rely on unknown production capacity.
3. **Move analysis into a dedicated durable worker/queue.** This gives stronger workload isolation and configurable worker capacity, but adds infrastructure and is not required to prevent the current per-process connection burst.

## Design

### Import database concurrency

Add a small process-local asynchronous limiter with a maximum of two active adapter `resolveRelations` calls at a time. The limiter is shared by all analysis batches in that Node process, rather than instantiated per batch, and always releases its slot after success or failure. Keep the current 15-record CPU calculation group; its database-backed relation calls queue behind the shared limiter. Two concurrent relation resolutions cap analysis-owned query work below the five-connection pool limit and leave room for normal application requests. Each PM2 worker applies the same local cap to its own Prisma pool.

### Transient database errors

Add a deterministic classifier for Prisma known request errors: retryable connection-pool acquisition is exactly code `P2024`. Do not infer retryability from arbitrary message text. Prisma initialization errors (`PrismaClientInitializationError`, including connection refused/server unavailable) are infrastructure failures that ownership-resolution catches must rethrow to fail the attempt, but they are not automatically retried because their duration is not predictably transient. All other Prisma codes and non-Prisma exceptions retain their existing behavior unless explicitly identified as infrastructure failures by a typed Prisma error class; never classify validation, ownership, missing-record, or arbitrary SQL errors as retryable. This makes retry eligibility code-based and testable, and prevents pool exhaustion from becoming a successful relation warning.

Wrap adapter relation resolution and the atomic record checkpoint with a bounded retry helper for `P2024` only: one initial attempt followed by at most two retries. After the initial attempt fails with `P2024`, wait exactly 250 ms before the first retry. If that retry also fails with `P2024`, wait exactly 750 ms before the second retry. These delays are measured from each preceding failed attempt, with no jitter. If the third attempt fails, surface its underlying Prisma error. Do not retry ownership loss, missing-record results, validation failures, Prisma initialization/connectivity failures, Prisma engine panics, or arbitrary SQL errors.

Each checkpoint retry resubmits the complete atomic SQL statement with the same attempt ID and absolute progress value. In that statement, the attempt-scoped ownership CTE selects the one `import_batches` row matching both batch ID and current attempt ID and acquires a PostgreSQL row-level `FOR UPDATE` lock. The data-modifying CTEs depend on the locked ownership row; record mutation and issue replacement execute within the same PostgreSQL statement/implicit transaction while the batch-row lock is held, and the lock is released only when that statement commits or rolls back. The statement must not perform any record or issue mutation if ownership did not match. The entire per-record operation remains one atomic PostgreSQL statement, so failure cannot commit only part of the checkpoint. The issue replacement key is the exact tuple `(batch_id, record_id, stage='ANALYSIS', resolution_state='OPEN')`; each replay deletes the current open set for that key and inserts the same computed replacement rows, rather than appending to the old set. The progress write assigns the same absolute count and is gated on successful ownership, record match, and issue insert CTE completion. Consequently, a replay after an ambiguous response cannot increment progress twice, append duplicate open issues, or write under a different attempt. After retries are exhausted, propagate the error to the existing analysis failure persistence path.

Do not modify `DATABASE_URL` or globally change Prisma's pool limit/timeouts in code. Production pool sizing remains an operator decision based on database capacity and PM2 process count.

### Image fallback

Replace every application reference to `/images/default-property.jpg` with `/image-placeholder.svg`, including `next/image` error handlers and API-provided default cover-image values. Keep the placeholder local so Next.js image optimization and direct browser use resolve a real static file. Do not change other listing-image behavior.

## Error handling and observability

Log a concise warning for each bounded `P2024` retry with batch/record context and attempt number, without logging connection strings or credentials. If the final retry fails, persist and return the underlying Prisma error through existing failure handling. Do not convert connectivity failures to warnings or success-shaped outcomes. Existing admin retry/recovery behavior remains the mechanism for a failed batch.

The Prisma engine message `no entry found for key` may represent a separate query-engine panic; this design does not claim to diagnose that phrase without the complete unencoded panic context. The pool and fallback-image issues above are directly evidenced by the supplied production log and repository asset inventory. Preserve full server-side errors so a remaining engine panic can be diagnosed independently.

## Validation

- Unit-test the process-wide limiter under overlapping batches and verify the configured maximum is never exceeded, including release after rejection.
- Unit-test retry count, the exact 250/750 ms backoff schedule, P2024-only retry classification, and preservation of the absolute checkpoint parameters.
- Unit-test that P2024 and typed Prisma initialization/connectivity errors escaping ownership-resolution catches remain errors rather than warnings, while unrelated lookup/validation errors are not retried.
- Verify all runtime consumers are updated: direct `next/image` sources, image error handlers, API serialization/default cover-image values, and other runtime string references contain no `/images/default-property.jpg`; verify `public/image-placeholder.svg` exists.
- Verify replaying the checkpoint with the same attempt ID and absolute progress replaces the same open issue key and never increments progress or bypasses ownership.
- Run focused import tests, related lint/type validation, and a production build.
