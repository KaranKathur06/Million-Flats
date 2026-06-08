-- Safety migration: align featured + inquiry tables/columns to existing TEXT id strategy

-- Agents: featured/performance fields
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "is_featured_manual" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "featured_score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "total_listings" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "total_leads" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "responded_leads" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "response_rate" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "country_iso2" CHAR(2);

CREATE INDEX IF NOT EXISTS "agents_country_iso2_featured_score_idx" ON "agents" ("country_iso2", "featured_score");

-- Countries table may not exist yet in some envs; create if missing
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

-- Optional FK for agents.country_iso2 -> countries.iso2
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

-- Analytics: featured agent click tracking
CREATE TABLE IF NOT EXISTS "featured_agent_clicks" (
  "id" TEXT PRIMARY KEY,
  "agent_id" TEXT NOT NULL,
  "country_iso2" CHAR(2),
  "clicked_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'featured_agent_clicks_agent_id_fkey'
  ) THEN
    ALTER TABLE "featured_agent_clicks"
      ADD CONSTRAINT "featured_agent_clicks_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'featured_agent_clicks_country_iso2_fkey'
  ) THEN
    ALTER TABLE "featured_agent_clicks"
      ADD CONSTRAINT "featured_agent_clicks_country_iso2_fkey" FOREIGN KEY ("country_iso2") REFERENCES "countries"("iso2")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "featured_agent_clicks_agent_id_idx" ON "featured_agent_clicks" ("agent_id");
CREATE INDEX IF NOT EXISTS "featured_agent_clicks_country_iso2_idx" ON "featured_agent_clicks" ("country_iso2");
CREATE INDEX IF NOT EXISTS "featured_agent_clicks_clicked_at_idx" ON "featured_agent_clicks" ("clicked_at");

-- Inquiry tracking
CREATE TABLE IF NOT EXISTS "inquiries" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL,
  "agent_id" TEXT NOT NULL,
  "user_id" TEXT,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "responded_at" TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inquiries_agent_id_fkey'
  ) THEN
    ALTER TABLE "inquiries"
      ADD CONSTRAINT "inquiries_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inquiries_property_id_fkey'
  ) THEN
    ALTER TABLE "inquiries"
      ADD CONSTRAINT "inquiries_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "manual_properties"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inquiries_user_id_fkey'
  ) THEN
    ALTER TABLE "inquiries"
      ADD CONSTRAINT "inquiries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "inquiries_agent_id_idx" ON "inquiries" ("agent_id");
CREATE INDEX IF NOT EXISTS "inquiries_property_id_idx" ON "inquiries" ("property_id");
CREATE INDEX IF NOT EXISTS "inquiries_user_id_idx" ON "inquiries" ("user_id");
CREATE INDEX IF NOT EXISTS "inquiries_status_idx" ON "inquiries" ("status");
CREATE INDEX IF NOT EXISTS "inquiries_created_at_idx" ON "inquiries" ("created_at");
