-- Agent reputation / verification / scoring domain tables (agentId-only)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE "AgentProfileStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'VERIFIED', 'LIVE', 'SUSPENDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AgentPropertyType" AS ENUM ('RESIDENTIAL', 'LUXURY', 'COMMERCIAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AgentServiceType" AS ENUM ('BUY', 'SELL', 'RENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AgentVerificationDocumentType" AS ENUM ('LICENSE', 'ID');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "AgentVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "profile_status" "AgentProfileStatus" NOT NULL DEFAULT 'DRAFT';

CREATE TABLE IF NOT EXISTS "agent_service_areas" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "agent_id" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "locality" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "agent_service_areas_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "agent_service_areas_agent_id_idx" ON "agent_service_areas" ("agent_id");
CREATE INDEX IF NOT EXISTS "agent_service_areas_city_idx" ON "agent_service_areas" ("city");
CREATE UNIQUE INDEX IF NOT EXISTS "agent_service_areas_agent_city_locality_uniq" ON "agent_service_areas" ("agent_id", "city", "locality");

CREATE TABLE IF NOT EXISTS "agent_specializations" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "agent_id" TEXT NOT NULL,
  "property_type" "AgentPropertyType" NOT NULL,
  "service_type" "AgentServiceType" NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "agent_specializations_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "agent_specializations_agent_id_idx" ON "agent_specializations" ("agent_id");
CREATE INDEX IF NOT EXISTS "agent_specializations_property_type_idx" ON "agent_specializations" ("property_type");
CREATE INDEX IF NOT EXISTS "agent_specializations_service_type_idx" ON "agent_specializations" ("service_type");
CREATE UNIQUE INDEX IF NOT EXISTS "agent_specializations_agent_property_service_uniq" ON "agent_specializations" ("agent_id", "property_type", "service_type");

CREATE TABLE IF NOT EXISTS "agent_metrics" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "agent_id" TEXT NOT NULL,
  "deals_closed" INTEGER NOT NULL DEFAULT 0,
  "avg_time_to_close_days" INTEGER,
  "sale_to_list_ratio" DOUBLE PRECISION,
  "response_rate" DOUBLE PRECISION,
  "repeat_client_rate" DOUBLE PRECISION,
  "verixpro_score" INTEGER NOT NULL DEFAULT 0,
  "last_calculated_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "agent_metrics_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "agent_metrics_agent_id_uniq" ON "agent_metrics" ("agent_id");
CREATE INDEX IF NOT EXISTS "agent_metrics_verixpro_score_idx" ON "agent_metrics" ("verixpro_score");

CREATE TABLE IF NOT EXISTS "agent_badges" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "agent_id" TEXT NOT NULL,
  "badge_key" TEXT NOT NULL,
  "earned_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "revoked_at" TIMESTAMP(3),
  CONSTRAINT "agent_badges_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "agent_badges_agent_id_idx" ON "agent_badges" ("agent_id");
CREATE INDEX IF NOT EXISTS "agent_badges_badge_key_idx" ON "agent_badges" ("badge_key");
CREATE UNIQUE INDEX IF NOT EXISTS "agent_badges_agent_badge_key_uniq" ON "agent_badges" ("agent_id", "badge_key");

CREATE TABLE IF NOT EXISTS "agent_verifications" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "agent_id" TEXT NOT NULL,
  "document_type" "AgentVerificationDocumentType" NOT NULL,
  "document_url" TEXT NOT NULL,
  "status" "AgentVerificationStatus" NOT NULL DEFAULT 'PENDING',
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "agent_verifications_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "agent_verifications_agent_id_idx" ON "agent_verifications" ("agent_id");
CREATE INDEX IF NOT EXISTS "agent_verifications_status_idx" ON "agent_verifications" ("status");
CREATE INDEX IF NOT EXISTS "agent_verifications_document_type_idx" ON "agent_verifications" ("document_type");

CREATE TABLE IF NOT EXISTS "agent_reviews" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "agent_id" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "verified_deal_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "agent_reviews_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "agent_reviews_agent_id_idx" ON "agent_reviews" ("agent_id");
CREATE INDEX IF NOT EXISTS "agent_reviews_rating_idx" ON "agent_reviews" ("rating");
