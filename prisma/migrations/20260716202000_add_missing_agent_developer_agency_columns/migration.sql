-- Add missing role-specific fields for agents, developers, and agencies.

ALTER TABLE agents
ADD COLUMN IF NOT EXISTS agency_id TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
ADD COLUMN IF NOT EXISTS profile_image_url TEXT,
ADD COLUMN IF NOT EXISTS profile_image_key TEXT,
ADD COLUMN IF NOT EXISTS profile_image_updated_at TIMESTAMP(3);

ALTER TABLE developer_profiles
ADD COLUMN IF NOT EXISTS AI_developer_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS AI_score_breakdown JSONB,
ADD COLUMN IF NOT EXISTS AI_scored_at TIMESTAMP(3);

ALTER TABLE agency_profiles
ADD COLUMN IF NOT EXISTS AI_agency_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS AI_score_breakdown JSONB,
ADD COLUMN IF NOT EXISTS AI_scored_at TIMESTAMP(3);

ALTER TABLE developers
ADD COLUMN IF NOT EXISTS AI_score INTEGER DEFAULT 0;
