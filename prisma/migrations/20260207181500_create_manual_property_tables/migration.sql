-- Create missing manual listing tables (safe to run on partially-initialized DBs)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
  CREATE TYPE "Role" AS ENUM ('USER', 'AGENT', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "CountryCode" AS ENUM ('UAE', 'India');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "PropertySourceType" AS ENUM ('REELLY', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ManualPropertyStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ManualPropertyMediaCategory" AS ENUM ('COVER', 'EXTERIOR', 'INTERIOR', 'FLOOR_PLANS', 'AMENITIES', 'BROCHURE', 'VIDEO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ManualPropertyIntent" AS ENUM ('SALE', 'RENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ManualPropertyConstructionStatus" AS ENUM ('READY', 'OFF_PLAN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE "ManualModerationAction" AS ENUM ('APPROVE', 'REJECT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "manual_properties" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "agent_id" TEXT NOT NULL,
  "source_type" "PropertySourceType" NOT NULL DEFAULT 'MANUAL',
  "status" "ManualPropertyStatus" NOT NULL DEFAULT 'DRAFT',

  "title" TEXT,
  "property_type" TEXT,
  "intent" "ManualPropertyIntent",
  "price" DOUBLE PRECISION,
  "currency" TEXT NOT NULL DEFAULT 'AED',
  "construction_status" "ManualPropertyConstructionStatus",
  "short_description" TEXT,

  "bedrooms" INTEGER NOT NULL DEFAULT 0,
  "bathrooms" INTEGER NOT NULL DEFAULT 0,
  "square_feet" DOUBLE PRECISION NOT NULL DEFAULT 0,

  "country" "CountryCode" NOT NULL DEFAULT 'UAE',
  "city" TEXT,
  "community" TEXT,
  "address" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,

  "developer_name" TEXT,

  "amenities" JSONB,
  "custom_amenities" JSONB,

  "payment_plan_text" TEXT,
  "emi_note" TEXT,

  "authorized_to_market" BOOLEAN NOT NULL DEFAULT false,
  "exclusive_deal" BOOLEAN NOT NULL DEFAULT false,
  "owner_contact_on_file" BOOLEAN NOT NULL DEFAULT false,

  "duplicate_score" INTEGER,
  "duplicate_matched_project_id" TEXT,
  "duplicate_override_confirmed" BOOLEAN NOT NULL DEFAULT false,

  "rejection_reason" TEXT,
  "tour_3d_url" TEXT,
  "submitted_at" TIMESTAMP(3),

  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

  CONSTRAINT "manual_properties_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "manual_properties_agent_id_idx" ON "manual_properties" ("agent_id");
CREATE INDEX IF NOT EXISTS "manual_properties_status_idx" ON "manual_properties" ("status");
CREATE INDEX IF NOT EXISTS "manual_properties_source_type_idx" ON "manual_properties" ("source_type");
CREATE INDEX IF NOT EXISTS "manual_properties_country_city_idx" ON "manual_properties" ("country", "city");

CREATE TABLE IF NOT EXISTS "manual_property_media" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "property_id" TEXT NOT NULL,
  "category" "ManualPropertyMediaCategory" NOT NULL,
  "url" TEXT NOT NULL,
  "s3_key" TEXT,
  "mime_type" TEXT,
  "size_bytes" INTEGER,
  "alt_text" TEXT,
  "position" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

  CONSTRAINT "manual_property_media_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "manual_properties"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "manual_property_media_property_id_idx" ON "manual_property_media" ("property_id");
CREATE INDEX IF NOT EXISTS "manual_property_media_category_idx" ON "manual_property_media" ("category");

CREATE TABLE IF NOT EXISTS "manual_property_moderation_logs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "property_id" TEXT NOT NULL,
  "admin_id" TEXT NOT NULL,
  "action" "ManualModerationAction" NOT NULL,
  "reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

  CONSTRAINT "manual_property_moderation_logs_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "manual_properties"("id") ON DELETE CASCADE,
  CONSTRAINT "manual_property_moderation_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "manual_property_moderation_logs_property_id_idx" ON "manual_property_moderation_logs" ("property_id");
CREATE INDEX IF NOT EXISTS "manual_property_moderation_logs_admin_id_idx" ON "manual_property_moderation_logs" ("admin_id");
CREATE INDEX IF NOT EXISTS "manual_property_moderation_logs_action_idx" ON "manual_property_moderation_logs" ("action");

CREATE TABLE IF NOT EXISTS "manual_duplicate_override_logs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "property_id" TEXT NOT NULL,
  "agent_id" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "matched_project_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),

  CONSTRAINT "manual_duplicate_override_logs_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "manual_properties"("id") ON DELETE CASCADE,
  CONSTRAINT "manual_duplicate_override_logs_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "manual_duplicate_override_logs_property_id_idx" ON "manual_duplicate_override_logs" ("property_id");
CREATE INDEX IF NOT EXISTS "manual_duplicate_override_logs_agent_id_idx" ON "manual_duplicate_override_logs" ("agent_id");
