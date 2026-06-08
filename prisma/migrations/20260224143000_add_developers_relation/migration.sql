-- Add developers table and developer_id relation for manual_properties (backward compatible)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "developers" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "country" "CountryCode" NOT NULL DEFAULT 'UAE',
  "is_featured" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'developers_country_is_featured_idx'
  ) THEN
    CREATE INDEX "developers_country_is_featured_idx" ON "developers" ("country", "is_featured");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'developers_name_key'
  ) THEN
    CREATE UNIQUE INDEX "developers_name_key" ON "developers" ("name");
  END IF;
END $$;

ALTER TABLE "manual_properties"
  ADD COLUMN IF NOT EXISTS "developer_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'manual_properties_developer_id_idx'
  ) THEN
    CREATE INDEX "manual_properties_developer_id_idx" ON "manual_properties" ("developer_id");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'manual_properties_developer_id_fkey'
  ) THEN
    ALTER TABLE "manual_properties"
      ADD CONSTRAINT "manual_properties_developer_id_fkey"
      FOREIGN KEY ("developer_id")
      REFERENCES "developers"("id")
      ON DELETE SET NULL;
  END IF;
END $$;
