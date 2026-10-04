# Import History Review Navigation

## Context

The shared import history page at `/admin/bulk-import/history` re-exports the property history page. Each batch name currently links to its detail page, but there is no explicit review action and the whole row is not clickable. Recovery actions are shown only for eligible batches, leaving analyzing, actively committing, and completed batches without an obvious route to their detail/review page.

## Design

Add a visible `Review batch` link for every history row. It navigates to the existing shared batch detail route and does not initiate a commit or recovery. Keep the existing filename link as a useful shortcut and leave the row itself non-clickable to avoid conflicting with the separate recovery action.

Continue/recover/finalize remains a distinct action and is shown only when the server reports the batch is eligible. Analyzing, active committing, and terminal completed batches therefore remain reviewable without exposing an invalid resume control. Both history URL aliases use the same component and must lead to the same batch review route.

## Validation

- Verify the shared history page renders an explicit detail link for each row regardless of status.
- Verify that review navigation does not issue a commit request.
- Retain the existing conditional recovery CTA behavior and route aliases.
- Run focused lint/type checks for the modified page.
