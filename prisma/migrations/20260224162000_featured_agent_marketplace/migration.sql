-- Add marketplace-grade featured ranking fields to agents
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "is_featured_manual" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "featured_score" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "total_listings" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "total_leads" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "response_rate" DOUBLE PRECISION NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "agents_country_iso2_featured_score_idx" ON "agents" ("country_iso2", "featured_score");

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
