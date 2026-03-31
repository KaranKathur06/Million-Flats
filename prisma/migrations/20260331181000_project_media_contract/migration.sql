DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectImageCategory') THEN
    CREATE TYPE "ProjectImageCategory" AS ENUM ('interior', 'exterior', 'amenities', 'lifestyle');
  END IF;
END$$;

ALTER TABLE "project_media"
  ADD COLUMN IF NOT EXISTS "label" TEXT,
  ADD COLUMN IF NOT EXISTS "category" "ProjectImageCategory";

