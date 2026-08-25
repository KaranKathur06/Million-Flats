-- Add structured metadata without changing or deleting existing property media.
ALTER TABLE IF EXISTS "manual_property_media"
  ADD COLUMN IF NOT EXISTS "floor_plan_title" TEXT;
ALTER TABLE IF EXISTS "manual_property_media"
  ADD COLUMN IF NOT EXISTS "floor_plan_bedroom_count" INTEGER;

CREATE INDEX IF NOT EXISTS "manual_property_media_floor_plan_bedroom_count_idx"
  ON "manual_property_media"("property_id", "floor_plan_bedroom_count");
