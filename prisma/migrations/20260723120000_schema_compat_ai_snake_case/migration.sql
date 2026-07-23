-- Forward-only schema compatibility repair for AI naming and developer document status.
-- Historical migrations are immutable; this migration bridges older mixed-case columns
-- to the canonical snake_case columns expected by Prisma.

ALTER TABLE IF EXISTS agent_subscriptions
  ADD COLUMN IF NOT EXISTS ai_access_level INTEGER;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agent_subscriptions'
      AND column_name = 'AI_access_level'
  ) THEN
    UPDATE agent_subscriptions
    SET ai_access_level = "AI_access_level"
    WHERE ai_access_level IS NULL
      AND "AI_access_level" IS NOT NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS developers
  ADD COLUMN IF NOT EXISTS ai_score INTEGER DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'developers'
      AND column_name = 'AI_score'
  ) THEN
    UPDATE developers
    SET ai_score = "AI_score"
    WHERE ai_score IS NULL
      AND "AI_score" IS NOT NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS agent_metrics
  ADD COLUMN IF NOT EXISTS ai_pro_score INTEGER DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agent_metrics'
      AND column_name = 'AIpro_score'
  ) THEN
    UPDATE agent_metrics
    SET ai_pro_score = "AIpro_score"
    WHERE "AIpro_score" IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'agent_metrics'
  ) THEN
    UPDATE agent_metrics SET ai_pro_score = 0 WHERE ai_pro_score IS NULL;
    ALTER TABLE agent_metrics
      ALTER COLUMN ai_pro_score SET DEFAULT 0,
      ALTER COLUMN ai_pro_score SET NOT NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS developer_profiles
  ADD COLUMN IF NOT EXISTS ai_developer_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_score_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS ai_scored_at TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'developer_profiles'
      AND column_name = 'AI_developer_score'
  ) THEN
    UPDATE developer_profiles
    SET ai_developer_score = "AI_developer_score"
    WHERE ai_developer_score IS NULL
      AND "AI_developer_score" IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'developer_profiles'
      AND column_name = 'AI_score_breakdown'
  ) THEN
    UPDATE developer_profiles
    SET ai_score_breakdown = "AI_score_breakdown"
    WHERE ai_score_breakdown IS NULL
      AND "AI_score_breakdown" IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'developer_profiles'
      AND column_name = 'AI_scored_at'
  ) THEN
    UPDATE developer_profiles
    SET ai_scored_at = "AI_scored_at"
    WHERE ai_scored_at IS NULL
      AND "AI_scored_at" IS NOT NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS agency_profiles
  ADD COLUMN IF NOT EXISTS ai_agency_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ai_score_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS ai_scored_at TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agency_profiles'
      AND column_name = 'AI_agency_score'
  ) THEN
    UPDATE agency_profiles
    SET ai_agency_score = "AI_agency_score"
    WHERE ai_agency_score IS NULL
      AND "AI_agency_score" IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agency_profiles'
      AND column_name = 'AI_score_breakdown'
  ) THEN
    UPDATE agency_profiles
    SET ai_score_breakdown = "AI_score_breakdown"
    WHERE ai_score_breakdown IS NULL
      AND "AI_score_breakdown" IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agency_profiles'
      AND column_name = 'AI_scored_at'
  ) THEN
    UPDATE agency_profiles
    SET ai_scored_at = "AI_scored_at"
    WHERE ai_scored_at IS NULL
      AND "AI_scored_at" IS NOT NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS developer_documents
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'developer_documents'
  ) THEN
    UPDATE developer_documents
    SET verification_status = 'PENDING'
    WHERE verification_status IS NULL;

    UPDATE developer_documents
    SET uploaded_at = COALESCE(created_at, CURRENT_TIMESTAMP)
    WHERE uploaded_at IS NULL;

    ALTER TABLE developer_documents
      ALTER COLUMN verification_status SET DEFAULT 'PENDING',
      ALTER COLUMN verification_status SET NOT NULL,
      ALTER COLUMN uploaded_at SET DEFAULT CURRENT_TIMESTAMP,
      ALTER COLUMN uploaded_at SET NOT NULL;

    CREATE INDEX IF NOT EXISTS developer_documents_verification_status_idx
      ON developer_documents (verification_status);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'agent_metrics'
  ) THEN
    CREATE INDEX IF NOT EXISTS agent_metrics_ai_pro_score_idx
      ON agent_metrics (ai_pro_score);
  END IF;
END $$;
