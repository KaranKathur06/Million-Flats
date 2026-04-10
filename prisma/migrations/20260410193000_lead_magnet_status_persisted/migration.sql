DO $$
BEGIN
  CREATE TYPE "LeadMagnetStatus" AS ENUM ('DRAFT', 'UPLOADED', 'PUBLISHED', 'ACTIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "lead_magnets"
ADD COLUMN IF NOT EXISTS "status" "LeadMagnetStatus";

UPDATE "lead_magnets"
SET "status" = CASE
  WHEN COALESCE(NULLIF("file_s3_key", ''), NULL) IS NULL THEN 'DRAFT'::"LeadMagnetStatus"
  WHEN "is_active" = true THEN 'ACTIVE'::"LeadMagnetStatus"
  WHEN "popup_enabled" = true THEN 'PUBLISHED'::"LeadMagnetStatus"
  ELSE 'UPLOADED'::"LeadMagnetStatus"
END
WHERE "status" IS NULL;

ALTER TABLE "lead_magnets"
ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"LeadMagnetStatus";

ALTER TABLE "lead_magnets"
ALTER COLUMN "status" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "lead_magnets_status_idx" ON "lead_magnets"("status");
