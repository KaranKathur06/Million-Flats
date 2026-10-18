# Property Import Analysis Reliability

## Goal

Fix the production 5,000-record property import analysis failure shown as
`Transaction API error: Unable to start a transaction in the given time.`

## Existing context

The import pipeline stages records, analyzes them in bounded groups, and
supports retry/recovery through batch ownership IDs and persisted checkpoints.
The current analysis checkpoint executes multiple Prisma writes in an
interactive transaction. A PostgreSQL checkpoint implementation already
exists as a fallback branch in the analyzer. The schema already has the
composite index used to replace open analysis issues for one record.

## Design

- Make the ownership-gated, parameterized PostgreSQL checkpoint statement the
  production path; do not use the multi-call interactive transaction for each
  record.
- The statement must establish ownership by matching batch ID, `ANALYZING`
  state, and the active analysis attempt ID while locking the batch row.
- Only if ownership matches, update the matching record in that batch, replace
  only that record's open `ANALYSIS` issues, and atomically compute the next
  processed count from the locked persisted batch value plus one only when
  this record has not yet been checkpointed for the active attempt. The caller
  never supplies an absolute count. All dependent writes happen atomically in
  that statement.
- Add a nullable per-record analysis-checkpoint attempt marker. Set it to the
  active attempt ID in the same statement as the record/issues update. A
  record increments progress once per attempt; replaying the same attempt
  does not increment again. When a new analysis attempt is initialized,
  atomically reset that attempt's batch progress to zero and clear the
  per-record markers for records in the batch. A retry within the same attempt
  preserves markers and progress. Ownership checks prevent abandoned attempts
  from writing after a new attempt starts. This makes progress correct when
  records finish out of order or a response is ambiguous and the same
  checkpoint is retried. Never derive progress from a shared in-memory counter
  or set it to a possibly lower completion position.
- Return explicit ownership, record-match, and progress-update indicators.
  Missing records or lost ownership must gate all writes and surface explicit
  errors.
- Preserve bounded record calculation concurrency, current typed transient
  pool retry limits/delays, attempt ownership enforcement, and failure
  persistence. A retry reuses the same absolute progress count and replacement
  issue set; it must not duplicate issues or increment progress twice.
- Do not globally increase Prisma transaction timeouts or connection-pool
  limits.

## Error handling

Persisted checkpoints remain durable if later records fail. Exhausted retries,
record mismatch, ownership loss, and non-transient database errors remain
failures visible through existing admin recovery UI. Log batch/record context
without connection credentials.

## Acceptance and validation

- A 5,000-row batch completes analysis without the observed transaction-start
  timeout, or reports an explicit failure with already persisted progress
  intact.
- Stale or competing attempts cannot mutate records, issues, or progress.
- Replaying a checkpoint does not append duplicate open analysis issues or
  increment progress twice.
- Out-of-order checkpoints increase progress once per newly persisted record
  without regressing or prematurely counting an uncheckpointed record.
- Starting a new attempt resets only that batch's attempt-scoped progress and
  markers; retrying the active attempt preserves both.
- Missing-record and exhausted-retry cases never return success-shaped
  results.
- Add focused ownership, replay/idempotency, retry-count, and progress tests;
  run the import analysis/retry tests and applicable schema/type validation.

## Out of scope

No import queue redesign, change to property validation rules, or global
database tuning.
