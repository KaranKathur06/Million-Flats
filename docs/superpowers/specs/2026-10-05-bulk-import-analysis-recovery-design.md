# Bulk Import Analysis Recovery

## Context and problem

The shared import analyzer starts `performBackgroundAnalysis` in the web process and returns `ANALYZING`. Its in-memory promise map prevents duplicate work only inside one running process. A retry that sees `ANALYZING` currently assumes work is still active and returns without checking whether the original process is alive. Analysis results are written record by record, while batch counters and final status are written only at the end. If the process exits during analysis, the batch can remain `ANALYZING` with partially updated records and open analysis issues. An admin then has no safe continuation action.

Closing the browser tab does not itself prove that server-side analysis stopped. The recovery decision must therefore be based on persisted server progress, not browser presence. The existing import detail page and progress endpoint are shared across import entity adapters; the recovery must retain that shared path and must not interfere with the attempt-owned commit recovery.

## Goals and boundaries

- Allow an admin to recover an analysis attempt after 10 minutes without persisted progress.
- Prevent concurrent workers from writing analysis results after another attempt takes ownership.
- Persist per-record analysis outcomes and replace that record's analysis issues atomically, so interrupted/repeated analysis does not duplicate issues or leave mismatched payload and issue state.
- Retain the selected property owner across recovery; re-analysis must not silently change canonical agent assignment.
- Show live analysis progress and clearly distinguish active analysis, stale analysis, and an analysis failure that can be retried.
- Preserve the existing analyzer adapters, normalization and validation behavior, commit workflow, authentication, and route aliases.

This does not add a durable external queue, change import mappings/validation semantics, redesign upload staging, or alter commit recovery.

## Chosen approach

Extend the existing shared analysis path with persisted attempt ownership and heartbeat fields, following the conditional-ownership principle used for commit attempts. The database is authoritative for both claiming and checking whether an attempt is stale; the 10-minute threshold measures inactivity since the last saved record, not total analysis duration.

The API will claim new work atomically from a valid pre-analysis state, or reclaim only an `ANALYZING` batch whose heartbeat (falling back to `startedAt` and then `updatedAt` for batches created before this change) is at least 10 minutes old. A row lock with `SKIP LOCKED` ensures only one attempt claims the batch. A local in-memory queue may remain as a same-process optimization, but it is not a correctness boundary.

Each attempt receives a server-generated ID. The selected `ownerAgentId` is persisted when analysis starts, and recovery uses that persisted value rather than relying on a still-open client request. For each source row, adapter calculations happen before persistence. The persistence transaction then conditionally updates the batch heartbeat and processed count only if the attempt still owns the `ANALYZING` batch; in that same transaction it updates the record's normalized/canonical payload, status, ownership policy, and confidence, removes that record's previous open `ANALYSIS` issues, and writes the current issues. If ownership was lost, the transaction is rolled back and the old attempt stops without changing newer analysis results.

Recovery reprocesses source rows from the beginning. This is intentionally safe and simple: per-record writes are deterministic replacements, so already processed rows can be recalculated without duplicate issues, while remaining rows eventually receive the current result. The progress counter measures rows completed in the current attempt. Final ready/warning/error counters are derived from the completed attempt's persisted outcomes, and only an owning attempt may set the terminal review/commit-ready status.

## State, errors, and retries

- An `ANALYZING` batch with recent heartbeat remains locked and is reported as active.
- A stale `ANALYZING` batch may be explicitly recovered by an admin. The atomic claim rejects attempts if another worker has refreshed progress or already claimed the batch.
- A failed attempt records an analysis-stage failure in the batch failure summary and releases ownership only when the attempt ID still matches. The detail page offers a direct **Retry analysis** action for this explicit analysis failure; it transitions through the existing retry state before starting a new analysis attempt.
- A displaced worker cannot overwrite a new owner’s data or set the batch to `FAILED`.
- API conflicts remain non-success responses. The client refreshes authoritative batch state and shows a clear active-attempt or not-stale message instead of claiming recovery succeeded.
- Existing `ANALYZING` rows without new metadata remain eligible for recovery only when a fallback persisted timestamp proves they have been inactive for the threshold. A missing timestamp is not sufficient evidence to take over.
- Adapter/version errors, database failures, and unexpected analysis errors remain visible in logs and the persisted analysis failure summary; they are not converted into success-shaped responses.

## Admin experience and data flow

The shared batch-detail page polls the lightweight progress endpoint while status is `ANALYZING`, rather than repeatedly loading every record and payload. The endpoint returns status, total records, current-attempt processed count, and analysis heartbeat. The detail view displays `Analyzing N of total`, refreshes the full batch once the status changes, and offers **Recover & analyze** only after the persisted heartbeat is stale. If an analysis attempt failed explicitly, it offers **Retry analysis**. Buttons are disabled while a request is pending; a page refresh continues to use server state.

The analyze API remains the entry point for initial, retry, and stale-recovery analysis. It validates ownership and status before starting work. The detail page remains shared by the existing admin route aliases. The batch-detail response may include analysis progress and failure metadata, but does not expose the internal attempt ID.

## Persistence and implementation units

- Add nullable `analysisAttemptId`, `analysisHeartbeatAt`, and `analysisOwnerAgentId` fields plus a default-zero `analysisProcessedCount` to `ImportBatch`. Keep commit-attempt fields independent.
- Add an atomic analysis-attempt claim/ownership helper using database time and the same stale guard in a migration-backed implementation.
- Update the analyzer to checkpoint each row transactionally, replace that row's open analysis issues, conditionally heartbeat progress, and finalize only if still owner.
- Update the progress API response with lightweight analysis progress and stale-recovery availability.
- Update the detail page with progress polling, stale recovery and analysis-failure retry states.
- Add focused tests for atomic fresh/stale claims, lost ownership preventing writes/finalization, duplicate-free row issue replacement, progress persistence, selected owner retention, stale and active UI behavior, and retryable analysis failures.

## Verification and acceptance criteria

1. Initial analysis preserves current adapter output and reaches the same ready/review status and counts as before.
2. Progress and heartbeat advance as rows are persisted, and a fully completed analysis clears attempt ownership.
3. A recent active attempt cannot be recovered; a heartbeat at least 10 minutes old can be atomically reclaimed, with concurrent claimants yielding one owner.
4. A displaced attempt cannot update records, issues, counters, or terminal status.
5. Reprocessing a row replaces its open analysis issues and payload instead of duplicating issues.
6. Recovery after interruption preserves the persisted selected owner and reaches the expected final analysis state.
7. Analysis exceptions are distinguishable from commit failures and expose a retry action without allowing a false commit continuation.
8. The detail page polls only lightweight progress while analysis is active, displays progress, and refreshes complete records when analysis ends.
9. Existing aliases, adapter behavior, commit retry behavior, and authorization continue to work.
10. Focused analysis/state-machine/progress tests and applicable type/build validation pass.
