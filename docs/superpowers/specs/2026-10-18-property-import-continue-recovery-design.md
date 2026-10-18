# Property Import Continue and Recovery

## Goal

Make interrupted 5,000-row property imports recoverable and accurately
represented in the import history and review screens. A continuation must not
repeat successfully committed properties.

## Existing behavior

- Analysis writes each record through an ownership-gated atomic SQL checkpoint
  and retries typed Prisma pool-acquisition failures (`P2024`).
- Commit processes eligible records sequentially, using one interactive
  Prisma transaction for each record.
- A transaction-start failure can escape the per-record failure handler if
  the follow-up transaction that records the error also fails. The outer
  handler releases the commit lock as `FAILED` without recording a commit
  failure stage or reconciling batch outcome counters.
- The history API groups persisted record states to calculate remaining work,
  but displays the batch's stored outcome counters. The detail UI also uses
  stored batch counters for some outcome metrics and treats an `ANALYSIS`
  failure summary as the authoritative recovery stage.
- Commit retries already select only eligible `READY`, `WARNING`, `STAGED`,
  and retryable `ERROR` records; `COMMITTED` records are excluded.

## Design

### Transaction acquisition and record commits

- Keep the current synchronous commit architecture and sequential processing.
- Add narrowly bounded retries only for identifiable connection or transaction
  acquisition failures. Retain the existing `P2024` classification and
  recognize Prisma `P2028` only when its message is the exact transaction
  acquisition timeout, `Unable to start a transaction in the given time`.
  Do not retry other `P2028` errors, transaction callback failures, ownership
  loss, validation errors, or arbitrary database errors.
- Allow one initial attempt plus at most two retries for either classified
  acquisition failure. Wait 250 ms before the first retry and 750 ms before
  the second; use no jitter. Each retry starts a fresh transaction. Do not
  widen Prisma's transaction `maxWait` or `timeout`.
- Retry the complete per-record transaction before treating that row as
  failed. Keep creation/update and the row's `COMMITTED` state in the same
  transaction so a row cannot be reported committed without its entity, or
  vice versa.
- If retries are exhausted, preserve the row-level failure reason when the
  database is available. If recording that failure also fails, propagate the
  error to the batch-level recovery path rather than returning a
  success-shaped result.

### Stage-aware batch recovery

- Persist `failureSummary.stage = 'COMMIT'` for failures escaping the commit
  attempt. Preserve the original sanitized server error message and include
  batch/record context in logs without logging imported PII or credentials.
- Do not let a previous analysis summary be presented as the current commit
  failure. Clear the summary when a new successful stage begins or completes.
- On an interrupted commit, reconcile aggregate outcomes from persisted
  `ImportRecord` states and `commitAction` values when the database is
  available. If reconciliation itself cannot complete, surface the failure
  and do not claim the counters were reconciled.
- Persisted record state is authoritative for outcome counts:
  - `COMMITTED` plus `commitAction` `created`, `updated`, or `skipped`
    contributes to that corresponding count.
  - `ERROR` plus `commitAction = 'COMMIT_FAILED'` contributes to failed.
  - `READY`, `WARNING`, and `STAGED` are eligible remaining rows and do not
    contribute to failed.
  - Other status/action combinations do not count as successful outcomes or
    retryable failures; preserve them as an explicit inconsistent-state error
    for diagnosis rather than silently reclassifying the row.
- Derive the batch outcome after a commit attempt from those row groups:
  `COMMITTED` only when every row is committed; otherwise use
  `PARTIALLY_COMMITTED` when at least one row is committed and work remains,
  or `FAILED` when none is committed and work remains. Never overwrite a
  committed row while reconciling.
- If inconsistent rows exist, set/keep the batch `FAILED` with a `COMMIT`
  failure summary that identifies the inconsistency and disable automatic
  continue/finalize actions until the row state is corrected. If valid eligible
  rows remain but no retryable failure exists, likewise do not report
  completion; show the explicit no-eligible-work state.
- Derive history and detail outcome counts from persisted records, not only
  batch counters, so partial progress remains visible after a process or
  database interruption.
- Show recovery actions that match the persisted stage and row states:
  retry analysis only for analysis failures; continue/recover commit only
  when eligible or retryable commit rows remain. Already committed rows are
  never re-attempted. A `COMMITTING` attempt is stale only when its
  `commitHeartbeatAt`, `startedAt`, or `updatedAt` fallback is older than the
  existing `IMPORT_COMMIT_STALE_AFTER_MINUTES` threshold (currently ten
  minutes); before then the UI reports active progress and disables recovery.
  After threshold, both history and detail UI offer commit recovery. If
  reconciliation fails but the commit lock can be released, persist a `FAILED`
  batch with stage `COMMIT` while retaining the existing counters; subsequent
  history/detail requests derive counts from row states when the database is
  available. If the lock cannot be released, retain `COMMITTING` and allow
  only the existing stale-commit recovery after the threshold. In either case,
  do not expose continue/finalize actions when persisted row states are
  inconsistent.

### Error handling

- Keep the existing atomic analysis checkpoint, analysis ownership rules,
  analysis pool retry limits, commit ownership lock, and idempotent per-record
  writes.
- Do not increase global Prisma pool limits or transaction timeouts.
- A retry-exhausted or non-retryable failure remains explicit in the API and
  UI; no error may be converted into a warning or a successful import result.

## Alternatives considered

1. **Stage-aware recovery and bounded acquisition retries (recommended):**
   correct the failure boundary and persisted presentation without adding
   infrastructure.
2. **Move import processing to a durable worker queue:** stronger workload
   isolation, but introduces new infrastructure beyond the demonstrated
   failure.
3. **Increase pool or transaction timeouts globally:** may mask contention and
   can overload the database across application workers.

## Validation and acceptance

- Reproduce a transaction-acquisition timeout and verify only the narrowly
  classified error is retried exactly twice after the initial attempt, with
  250 ms and 750 ms waits; other transaction errors fail immediately.
- Verify a row is committed once and only once across retries, and previously
  committed rows are not invoked on continuation.
- Simulate interruption after a subset of rows is committed; history and
  detail screens show outcomes computed from persisted row states.
- Test inconsistent row status/action pairs and verify they remain visible as
  explicit errors rather than being counted as committed or retryable, and
  that automatic continuation/finalization is disabled until corrected.
- Verify failed commits persist an explicit `COMMIT` stage and expose a
  continue action rather than an analysis retry.
- Verify exhausted retries and failure to persist/reconcile outcomes remain
  explicit, distinguish active commits from stale commits at the configured
  threshold, and do not claim success. When reconciliation fails but lock
  release succeeds, verify the `COMMIT` failure is recoverable from later
  persisted row states; when lock release fails, verify recovery waits for the
  stale threshold.
- Run focused import commit, analysis recovery, history, and detail tests,
  then relevant TypeScript diagnostics.

## Out of scope

No import queue redesign, global pool/timeout changes, property validation
changes, or unrelated image fallback work.
