# Import History Review Navigation

## Context

The shared import history page at `/admin/bulk-import/history` re-exports the property history page. Each batch name currently links to its detail page, but there is no explicit review action and the whole row is not clickable. Recovery actions are shown only for eligible batches, leaving analyzing, actively committing, and completed batches without an obvious route to their detail/review page.

## Design

Add a visible, keyboard-focusable `Review batch` anchor link in the outcome/action column of every history row. It navigates to `/admin/bulk-import/[batchId]`, the existing compatibility route that re-exports the shared property/project batch detail page, and does not initiate a commit or recovery. Keep the existing filename link as a shortcut and leave the row itself non-clickable to avoid conflicting with the separate recovery action.

Continue/recover/finalize remains a distinct action and is shown only when the server reports the batch is eligible. The supported history entry points `/admin/bulk-import/history` and `/admin/properties/bulk-import/history` use the same component.

### Batch-state behavior

| Batch state | Review batch | Continue/recover action |
| --- | --- | --- |
| `UPLOADED`, `ANALYZING`, `MAPPING_REVIEW`, `NORMALIZING`, `VALIDATING`, `DUPLICATE_REVIEW` | Always shown | Not shown |
| `READY_FOR_REVIEW`, `READY_TO_COMMIT` | Always shown | Keep the existing regular commit action on batch detail; history recovery CTA is not required |
| `COMMITTING` with fresh heartbeat | Always shown | Not shown |
| `COMMITTING` with stale heartbeat and eligible recoverable work | Always shown | Keep the existing `Recover & continue` history action |
| `PARTIALLY_COMMITTED` or `FAILED` with eligible/retryable work | Always shown | Keep the existing continue/retry history action |
| `COMMITTED`, `CANCELLED`, or no recoverable work | Always shown | Not shown |

The history link must be a semantic `<Link>`/anchor, not a button that invokes mutation logic. It must remain visible at mobile and desktop breakpoints and must not be nested inside another interactive element.

## Validation

- Render or inspect a history fixture for every state row in the matrix, including a separate fresh and stale `COMMITTING` case; assert every row has exactly one `Review batch` link pointing to its own batch detail route.
- Assert review navigation only follows the detail route and does not call the commit endpoint or change batch status.
- Assert no recovery CTA for `UPLOADED`, `ANALYZING`, `MAPPING_REVIEW`, `NORMALIZING`, `VALIDATING`, `DUPLICATE_REVIEW`, fresh `COMMITTING`, `READY_FOR_REVIEW`, `READY_TO_COMMIT`, `COMMITTED`, `CANCELLED`, or any no-work batch. Assert recovery CTA for stale `COMMITTING` with eligible recoverable work and for `PARTIALLY_COMMITTED`/`FAILED` with eligible or retryable work.
- Verify `Review batch` is a semantic anchor reachable by keyboard tab navigation, remains visible at mobile and desktop breakpoints, and is not nested within an interactive element.
- Verify both `/admin/bulk-import/history` and `/admin/properties/bulk-import/history` resolve to the shared page and retain the same detail destination.
- Run focused lint and type diagnostics for the changed history component.
