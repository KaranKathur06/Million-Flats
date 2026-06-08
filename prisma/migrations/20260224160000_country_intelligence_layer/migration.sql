-- Create normalized countries table
CREATE TABLE IF NOT EXISTS "countries" (
  "iso2" CHAR(2) PRIMARY KEY,
  "iso3" CHAR(3) NOT NULL,
  "name" TEXT NOT NULL,
  "dial_code" TEXT NOT NULL,
  "region" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "countries_is_active_idx" ON "countries" ("is_active");
CREATE INDEX IF NOT EXISTS "countries_region_idx" ON "countries" ("region");

-- Users: normalized phone + geo
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_country_iso2" CHAR(2);
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_national_number" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "country_iso2" CHAR(2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_country_iso2_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_country_iso2_fkey" FOREIGN KEY ("country_iso2") REFERENCES "countries"("iso2")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_phone_country_iso2_fkey'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_phone_country_iso2_fkey" FOREIGN KEY ("phone_country_iso2") REFERENCES "countries"("iso2")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "users_country_iso2_idx" ON "users" ("country_iso2");
CREATE INDEX IF NOT EXISTS "users_phone_country_iso2_idx" ON "users" ("phone_country_iso2");

-- Agents: geo reference (keep legacy enum country)
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "country_iso2" CHAR(2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agents_country_iso2_fkey'
  ) THEN
    ALTER TABLE "agents"
      ADD CONSTRAINT "agents_country_iso2_fkey" FOREIGN KEY ("country_iso2") REFERENCES "countries"("iso2")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "agents_country_iso2_is_featured_idx" ON "agents" ("country_iso2", "is_featured");

-- Agencies
ALTER TABLE "agencies" ADD COLUMN IF NOT EXISTS "country_iso2" CHAR(2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'agencies_country_iso2_fkey'
  ) THEN
    ALTER TABLE "agencies"
      ADD CONSTRAINT "agencies_country_iso2_fkey" FOREIGN KEY ("country_iso2") REFERENCES "countries"("iso2")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "agencies_country_iso2_is_featured_idx" ON "agencies" ("country_iso2", "is_featured");

-- Developers
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "country_iso2" CHAR(2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'developers_country_iso2_fkey'
  ) THEN
    ALTER TABLE "developers"
      ADD CONSTRAINT "developers_country_iso2_fkey" FOREIGN KEY ("country_iso2") REFERENCES "countries"("iso2")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "developers_country_iso2_is_featured_idx" ON "developers" ("country_iso2", "is_featured");

-- Manual properties
ALTER TABLE "manual_properties" ADD COLUMN IF NOT EXISTS "country_iso2" CHAR(2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'manual_properties_country_iso2_fkey'
  ) THEN
    ALTER TABLE "manual_properties"
      ADD CONSTRAINT "manual_properties_country_iso2_fkey" FOREIGN KEY ("country_iso2") REFERENCES "countries"("iso2")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "manual_properties_country_iso2_city_idx" ON "manual_properties" ("country_iso2", "city");
