ALTER TABLE "import_batches"
  ADD COLUMN "analysis_attempt_id" VARCHAR(64),
  ADD COLUMN "analysis_heartbeat_at" TIMESTAMP(3),
  ADD COLUMN "analysis_processed_count" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "analysis_owner_agent_id" TEXT;
