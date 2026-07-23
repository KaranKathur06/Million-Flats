-- Add missing role-specific fields for agents, developers, and agencies.

-- This migration is idempotent and safe to deploy against production.
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS agency_id TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS profile_image_key TEXT,
ADD COLUMN IF NOT EXISTS profile_image_updated_at TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'developer_profiles') THEN
    ALTER TABLE developer_profiles
    ADD COLUMN IF NOT EXISTS AI_developer_score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS AI_score_breakdown JSONB,
    ADD COLUMN IF NOT EXISTS AI_scored_at TIMESTAMP(3);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agency_profiles') THEN
    ALTER TABLE agency_profiles
    ADD COLUMN IF NOT EXISTS AI_agency_score INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS AI_score_breakdown JSONB,
    ADD COLUMN IF NOT EXISTS AI_scored_at TIMESTAMP(3);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'developers') THEN
    ALTER TABLE developers
    ADD COLUMN IF NOT EXISTS AI_score INTEGER DEFAULT 0;
  END IF;
END $$;
