-- Agent onboarding structured fields + verification status (backward compatible)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgentVerificationStatus') THEN
    CREATE TYPE "AgentVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

ALTER TABLE "agents"
  ADD COLUMN IF NOT EXISTS "license_authority" TEXT,
  ADD COLUMN IF NOT EXISTS "years_experience" INTEGER,
  ADD COLUMN IF NOT EXISTS "primary_market" TEXT,
  ADD COLUMN IF NOT EXISTS "specialization" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "linkedin_url" TEXT,
  ADD COLUMN IF NOT EXISTS "website_url" TEXT,
  ADD COLUMN IF NOT EXISTS "verification_status" "AgentVerificationStatus" NOT NULL DEFAULT 'PENDING';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'agents_license_number_key'
  ) THEN
    CREATE UNIQUE INDEX "agents_license_number_key" ON "agents" ("license_number");
  END IF;
END $$;
