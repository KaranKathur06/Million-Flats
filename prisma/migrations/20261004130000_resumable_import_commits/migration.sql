ALTER TABLE "import_batches"
  ADD COLUMN "commit_attempt_id" VARCHAR(64),
  ADD COLUMN "commit_heartbeat_at" TIMESTAMP(3);

ALTER TABLE "import_records"
  ADD COLUMN "commit_failure_reason" TEXT;

UPDATE "import_records" AS record
SET "commit_action" = 'COMMIT_FAILED',
    "commit_failure_reason" = COALESCE(
      failed."failure_reason",
      'A previous commit attempt failed. Retry to capture an updated result.'
    )
FROM (
  SELECT
    request."batch_id",
    result.value->>'recordId' AS "record_id",
    MAX(result.value->>'reason') AS "failure_reason"
  FROM "import_request_idempotency" AS request
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(request."response"->'results') = 'array' THEN request."response"->'results'
      ELSE '[]'::jsonb
    END
  ) AS result(value)
  WHERE result.value->>'status' = 'failed'
  GROUP BY request."batch_id", result.value->>'recordId'
) AS failed
WHERE record."batch_id" = failed."batch_id"
  AND record."id" = failed."record_id"
  AND record."status" = 'ERROR';
