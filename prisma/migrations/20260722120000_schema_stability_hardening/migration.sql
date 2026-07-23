-- Compatibility hardening for production deployments.
-- This migration ensures the core verification and AI score columns exist without failing when the DB is already ahead.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_documents' AND column_name = 'rejection_reason') THEN
    ALTER TABLE agent_documents ALTER COLUMN rejection_reason TYPE TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'agent_verifications' AND column_name = 'rejection_reason') THEN
    ALTER TABLE agent_verifications ALTER COLUMN rejection_reason TYPE TEXT;
  END IF;
END $$;

ALTER TABLE IF EXISTS agent_documents ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE IF EXISTS agent_verifications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE IF EXISTS developer_profiles ADD COLUMN IF NOT EXISTS AI_developer_score INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS developer_profiles ADD COLUMN IF NOT EXISTS AI_score_breakdown JSONB;
ALTER TABLE IF EXISTS developer_profiles ADD COLUMN IF NOT EXISTS AI_scored_at TIMESTAMP(3);
ALTER TABLE IF EXISTS agency_profiles ADD COLUMN IF NOT EXISTS AI_agency_score INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS agency_profiles ADD COLUMN IF NOT EXISTS AI_score_breakdown JSONB;
ALTER TABLE IF EXISTS agency_profiles ADD COLUMN IF NOT EXISTS AI_scored_at TIMESTAMP(3);
