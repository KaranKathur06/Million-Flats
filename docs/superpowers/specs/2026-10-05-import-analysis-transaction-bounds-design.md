# Import Analysis Transaction Bounds

## Context and problem

Background import analysis calculates records in groups of 15, then persists all results for a group inside one Prisma interactive transaction. For each record, that transaction conditionally refreshes the attempt heartbeat, updates the record, deletes its open analysis issues, and creates replacement issues. These operations run sequentially. On large imports or a slower database, the transaction can exceed Prisma's default interactive-transaction timeout and expire before a later record update, surfacing `P2028` ("Transaction not found"). Results from the expired transaction roll back together, and the analysis attempt is marked failed.

## Goals and boundaries

- Bound the duration of each analysis persistence transaction independently of the number of records in an analysis group.
- Preserve atomicity among an individual record's heartbeat/ownership check, record result, and replacement analysis issues.
- Preserve attempt ownership enforcement and the existing failure/retry behavior.
- Keep analysis calculations parallelized in groups of 15.

This change does not alter analysis rules, issue shapes, schema, the stale-attempt threshold, retry UI, or commit behavior. It does not add a general transaction retry mechanism or globally increase Prisma transaction timeouts.

## Chosen approach

Continue to calculate each group of up to 15 records concurrently. After calculations complete, persist each result in its own interactive transaction rather than wrapping the entire group in one transaction. Each transaction conditionally refreshes the attempt heartbeat and processed count, writes the `ImportRecord` result, deletes that record's open analysis issues, and inserts its replacement issues. The ownership heartbeat and all writes for that record remain atomic.

Advance the local processed count only after that record's transaction commits. The next record's heartbeat records the number of rows already durably checkpointed. If ownership has been lost, the existing `ImportAnalysisOwnershipError` path aborts the analysis without allowing further writes. Other persistence errors continue to fail the attempt through the existing failure-recording path. Previously committed row checkpoints remain durable; a subsequent retry may safely reprocess the batch because the analysis issue replacement is idempotent for open issues.

## Trade-offs

There will be more transaction begin/commit operations than in the current group transaction. In exchange, each transaction performs work for only one record, so unrelated records cannot extend its lifetime. Increasing the timeout on the existing group transaction was considered but rejected: it still permits a large or slow group to expire, and a longer-lived transaction holds its database resources longer.

## Validation

- Update focused analysis tests to assert that each record is persisted in a separate transaction and that each transaction contains its own ownership heartbeat and issue replacement.
- Verify processed-count checkpoints advance only after successful record transactions.
- Verify ownership loss still aborts without releasing or overwriting another attempt's state.
- Verify a persistence failure fails the analysis while earlier record transactions remain committed.
- Run the focused analysis and analysis-lock tests, relevant lint/type validation, and Prisma schema validation if available.
