ALTER TABLE "manual_properties"
  ADD COLUMN IF NOT EXISTS "source_provider" TEXT,
  ADD COLUMN IF NOT EXISTS "source_url" TEXT,
  ADD COLUMN IF NOT EXISTS "source_listing_id" TEXT;

CREATE INDEX IF NOT EXISTS "manual_properties_source_provider_source_listing_id_idx"
  ON "manual_properties" ("source_provider", "source_listing_id");
CREATE INDEX IF NOT EXISTS "manual_properties_source_url_idx"
  ON "manual_properties" ("source_url");
