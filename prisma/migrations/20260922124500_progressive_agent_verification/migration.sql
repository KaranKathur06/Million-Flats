ALTER TABLE "agents"
  ADD COLUMN IF NOT EXISTS "documents_required_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verification_reason" TEXT;