# Import Analysis Transaction Bounds

## Context and problem

Background import analysis calculates records in groups of 15 and checkpoints results one record at a time. Even after bounding transactions to a single record and retrying `P2028`, production still reports the transaction as expired while running `importIssue.deleteMany()`. The checkpoint currently makes several sequential Prisma calls inside an interactive transaction: ownership heartbeat, record update, issue deletion, and replacement issue creation. This leaves a transaction-client lifetime between calls and the issue lookup lacks an index covering its full filter.

## Goals and boundaries

- Remove the multi-call Prisma interactive transaction from each analysis checkpoint.
- Make ownership validation, the record result, and replacement issues atomic.
- Index the issue replacement filter.
- Preserve atomicity among an individual record's heartbeat/ownership check, record result, and replacement analysis issues.
- Preserve attempt ownership enforcement and the existing failure/retry behavior.
- Keep analysis calculations parallelized in groups of 15.

This change does not alter analysis rules, issue shapes, the stale-attempt threshold, retry UI, or commit behavior. It adds only the database index migration needed for the issue selector; it does not change the data model or globally increase Prisma transaction timeouts.

## Chosen approach

Continue to calculate each group of up to 15 records concurrently. For each result, execute one parameterized PostgreSQL data-modifying CTE statement through Prisma's raw query API. Explicitly order the dependencies: (1) an ownership CTE conditionally updates the batch heartbeat for the current attempt, acquiring the batch row lock; (2) a record CTE updates the matching batch/record only when the ownership CTE returned a row; (3) an issue-delete CTE deletes that record's open `ANALYSIS` issues only when the record CTE returned a row; (4) an issue-insert CTE inserts replacement issue rows after the delete CTE completes; and (5) a final progress CTE sets the absolute processed count only when ownership and record match are confirmed and after the issue-insert CTE has been consumed. The final CTE must depend on the issue CTE through an aggregate/subquery so it is still evaluated when there are zero replacement issues. Return explicit ownership and record-match indicators for distinct ownership-loss and missing-record handling. A failed ownership condition or a missing record gates all issue writes and the final progress update.

Add a composite index on `import_issues(batch_id, record_id, stage, resolution_state)` for the delete CTE predicate `batch_id = ? AND record_id = ? AND stage = 'ANALYSIS' AND resolution_state = 'OPEN'`. The column order follows the equality-filtered columns and supports the complete lookup.

For each result, compute its target processed count once from the last locally committed count. Retry a `P2028` at most twice by issuing the complete statement again, reusing the same absolute count. A missing-record result is an explicit error: it performs no record mutation, issue deletion/insertion, or progress update, and it is not treated as a successful checkpoint. If a prior statement committed but its result was ambiguous, repeating the same statement rechecks ownership, replaces (rather than duplicates) only that record's open analysis issue set with the same replacement set, and writes the same absolute progress value; it cannot increment progress or add a second copy of those issues. Advance local processed count only after a successful statement result. Every retry rechecks attempt ownership before any row or issue writes; ownership loss is not retried. Exhausted retries and other errors continue through the existing failure-recording path. Already checkpointed records remain durable.

## Trade-offs

The checkpoint becomes PostgreSQL-specific, consistent with the repository's configured PostgreSQL datasource and existing use of raw SQL for conditional attempt ownership. A data-modifying CTE must explicitly link its `RETURNING` results so ordering is deterministic: record update depends on the ownership CTE, issue deletion depends on the record update, and issue insertion depends on completion of the delete CTE. The entire checkpoint is one statement and therefore atomic without an interactive Prisma transaction spanning multiple client calls. The composite index adds storage and migration work but targets the exact issue lookup that production reports.

## Validation

- Test the generated checkpoint statement's ownership gate, record update, issue deletion and insertion, and absolute progress value.
- Verify ownership loss gates all record and issue writes and is surfaced as the existing ownership error.
- Verify a missing record and a failed query do not produce success-shaped results.
- Verify `P2028` retries the statement no more than twice, reuses the same progress count, and does not advance local progress before a successful result.
- Verify the composite index exists in the Prisma schema/migration and run Prisma schema validation.
- Run the focused analysis and analysis-lock tests plus relevant lint/type validation.
