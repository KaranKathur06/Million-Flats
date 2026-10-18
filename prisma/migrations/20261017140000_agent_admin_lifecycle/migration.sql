ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "security_state_version" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "agents"
  ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archived_by" TEXT,
  ADD COLUMN IF NOT EXISTS "archive_prior_user_status" "UserStatus",
  ADD COLUMN IF NOT EXISTS "archive_prior_approved" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "archive_security_version" INTEGER;

ALTER TABLE "manual_properties"
  ADD COLUMN IF NOT EXISTS "archived_by_agent_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archived_by_agent_actor_id" TEXT;

CREATE INDEX IF NOT EXISTS "agents_archived_at_idx" ON "agents"("archived_at");
CREATE INDEX IF NOT EXISTS "manual_properties_archived_by_agent_at_idx"
  ON "manual_properties"("archived_by_agent_at");
