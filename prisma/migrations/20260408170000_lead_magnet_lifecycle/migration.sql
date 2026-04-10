DO $$ BEGIN
  CREATE TYPE "LeadMagnetStatus" AS ENUM ('draft', 'uploaded', 'published', 'active');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "lead_magnets"
  ADD COLUMN IF NOT EXISTS "status" "LeadMagnetStatus" NOT NULL DEFAULT 'draft';

ALTER TABLE "lead_magnets"
  ALTER COLUMN "file_s3_key" DROP NOT NULL;

ALTER TABLE "lead_magnets"
  ALTER COLUMN "is_active" SET DEFAULT false;

UPDATE "lead_magnets"
SET "status" = CASE
  WHEN COALESCE("file_s3_key", '') = '' THEN 'draft'::"LeadMagnetStatus"
  WHEN "is_active" = true THEN 'active'::"LeadMagnetStatus"
  ELSE 'published'::"LeadMagnetStatus"
END;

CREATE INDEX IF NOT EXISTS "lead_magnets_status_is_active_popup_enabled_sort_order_idx"
  ON "lead_magnets"("status", "is_active", "popup_enabled", "sort_order");