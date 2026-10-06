# Import Pool and Fallback Reliability Implementation Plan

## 1. Add process-wide relation-resolution limiter

- Add a small typed async limiter in `lib/imports/core` with a maximum concurrency of two.
- Ensure waiting callers queue fairly and each acquired slot is released in `finally`, including rejection paths.
- Use one module-level limiter from analysis so parallel batches in one worker share the same cap.
- Keep CPU normalization/mapping concurrency at the current batch size of 15.
- Add unit tests for the concurrency ceiling, queued work, and slot release following a rejected operation.

## 2. Classify and retry pool acquisition failures

- Add a narrow Prisma error classifier: `P2024` is retryable; Prisma initialization errors are infrastructure failures that must be rethrown from relation-resolution catches but are not retried.
- Implement one bounded helper: initial attempt plus two retries; wait 250 ms after the first `P2024`, then 750 ms after the second; no jitter.
- Use the retry helper around adapter relation resolution and the one-statement atomic checkpoint only.
- Keep the same attempt ID, record result, and absolute processed-count value across checkpoint retries.
- Do not retry ownership loss, missing records, validation failures, initialization errors, engine panics, or arbitrary SQL errors.
- In `lib/imports/relations/ownership-resolution.ts`, rethrow typed infrastructure errors from existing catches while preserving warning semantics for unrelated lookup failures.
- Add focused tests for retry classification/count/delays, relation error propagation, checkpoint parameter stability, and failed retry surfacing.

## 3. Replace nonexistent image fallback references

- Search runtime app, components, and API sources for `/images/default-property.jpg`.
- Replace each fallback/default/error-handler reference with `/image-placeholder.svg`, preserving all other image selection and display behavior.
- Add a validation assertion/test or a targeted repository check that finds no stale runtime references and confirms `public/image-placeholder.svg` exists.

## 4. Validate integration

- Run focused limiter, relation-resolution, and import-analysis unit tests.
- Run ESLint on modified TypeScript files and the repository's TypeScript diagnostics for touched files.
- Run Prisma schema validation (no schema or migration changes are planned).
- Run the production build and inspect whether any reported database errors are only caused by the known unavailable local database.
- Review `git diff --check` and confirm the pre-existing untracked sitemap implementation plan remains untouched.
