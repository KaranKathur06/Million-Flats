-- Create the optional AI Shield results table safely.
-- This keeps the feature deployable without breaking builds when the table is not yet present.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AIShieldStatus') THEN
    CREATE TYPE "AIShieldStatus" AS ENUM (
      'FAIR',
      'OVERPRICED',
      'UNDERPRICED',
      'SUSPICIOUS',
      'INSUFFICIENT_DATA'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AIShieldPropertyType') THEN
    CREATE TYPE "AIShieldPropertyType" AS ENUM (
      'MANUAL_PROPERTY',
      'PROJECT'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ai_shield_results" (
    "id" TEXT NOT NULL,
    "entity_type" "AIShieldPropertyType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "estimated_min" DOUBLE PRECISION NOT NULL,
    "estimated_max" DOUBLE PRECISION NOT NULL,
    "estimated_median" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence_reasons" JSONB,
    "asking_price" DOUBLE PRECISION,
    "deviation" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "AIShieldStatus" NOT NULL DEFAULT 'FAIR',
    "price_position" DOUBLE PRECISION,
    "comparables_count" INTEGER NOT NULL DEFAULT 0,
    "avg_price_per_sqft" DOUBLE PRECISION,
    "median_price" DOUBLE PRECISION,
    "demand_score" DOUBLE PRECISION,
    "listing_velocity" DOUBLE PRECISION,
    "avg_days_on_market" DOUBLE PRECISION,
    "estimated_rental_min" DOUBLE PRECISION,
    "estimated_rental_max" DOUBLE PRECISION,
    "rental_yield" DOUBLE PRECISION,
    "suggested_min_price" DOUBLE PRECISION,
    "suggested_max_price" DOUBLE PRECISION,
    "model_version" TEXT NOT NULL DEFAULT '1.0.0',
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ai_shield_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ai_shield_results_entity_type_entity_id_key" ON "ai_shield_results" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "ai_shield_results_entity_type_entity_id_idx" ON "ai_shield_results" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "ai_shield_results_status_idx" ON "ai_shield_results" ("status");
CREATE INDEX IF NOT EXISTS "ai_shield_results_expires_at_idx" ON "ai_shield_results" ("expires_at");
CREATE INDEX IF NOT EXISTS "ai_shield_results_computed_at_idx" ON "ai_shield_results" ("computed_at");
