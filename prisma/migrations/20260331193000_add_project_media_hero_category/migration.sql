ALTER TYPE "ProjectImageCategory" ADD VALUE IF NOT EXISTS 'hero';

UPDATE "project_media"
SET "category" = 'hero'::"ProjectImageCategory"
WHERE LOWER(COALESCE("media_type", '')) = 'hero'
  AND "category" IS NULL;
