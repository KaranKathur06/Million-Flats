DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LeadMagnetStatus') THEN
    IF EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'LeadMagnetStatus' AND e.enumlabel = 'draft'
    ) THEN
      ALTER TYPE "LeadMagnetStatus" RENAME VALUE 'draft' TO 'DRAFT';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'LeadMagnetStatus' AND e.enumlabel = 'uploaded'
    ) THEN
      ALTER TYPE "LeadMagnetStatus" RENAME VALUE 'uploaded' TO 'UPLOADED';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'LeadMagnetStatus' AND e.enumlabel = 'published'
    ) THEN
      ALTER TYPE "LeadMagnetStatus" RENAME VALUE 'published' TO 'PUBLISHED';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'LeadMagnetStatus' AND e.enumlabel = 'active'
    ) THEN
      ALTER TYPE "LeadMagnetStatus" RENAME VALUE 'active' TO 'ACTIVE';
    END IF;
  ELSE
    CREATE TYPE "LeadMagnetStatus" AS ENUM ('DRAFT', 'UPLOADED', 'PUBLISHED', 'ACTIVE');
  END IF;
END $$;

ALTER TABLE "lead_magnets"
  ADD COLUMN IF NOT EXISTS "status" "LeadMagnetStatus" NOT NULL DEFAULT 'DRAFT';

ALTER TABLE "lead_magnets"
  ALTER COLUMN "file_s3_key" DROP NOT NULL;

ALTER TABLE "lead_magnets"
  ALTER COLUMN "is_active" SET DEFAULT false;

ALTER TABLE "lead_magnets"
  ALTER COLUMN "popup_enabled" SET DEFAULT false;

UPDATE "lead_magnets"
SET "status" = CASE
  WHEN COALESCE("file_s3_key", '') = '' THEN 'DRAFT'::"LeadMagnetStatus"
  WHEN "is_active" = true THEN 'ACTIVE'::"LeadMagnetStatus"
  WHEN "popup_enabled" = true THEN 'PUBLISHED'::"LeadMagnetStatus"
  ELSE 'UPLOADED'::"LeadMagnetStatus"
END;

CREATE INDEX IF NOT EXISTS "lead_magnets_status_is_active_popup_enabled_sort_order_idx"
  ON "lead_magnets"("status", "is_active", "popup_enabled", "sort_order");
