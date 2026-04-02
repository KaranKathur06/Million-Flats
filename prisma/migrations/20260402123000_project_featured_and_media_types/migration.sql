ALTER TYPE "ProjectImageCategory" ADD VALUE IF NOT EXISTS 'gallery';
ALTER TYPE "ProjectImageCategory" ADD VALUE IF NOT EXISTS 'floor_plan';

ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "overview" TEXT,
  ADD COLUMN IF NOT EXISTS "brochure_url" TEXT,
  ADD COLUMN IF NOT EXISTS "video_url" TEXT,
  ADD COLUMN IF NOT EXISTS "virtual_tour_url" TEXT,
  ADD COLUMN IF NOT EXISTS "possession_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "payment_plan" JSONB,
  ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "featured_order" INTEGER;

CREATE INDEX IF NOT EXISTS "projects_is_featured_featured_order_idx" ON "projects" ("is_featured", "featured_order");

UPDATE "project_media"
SET "category" = 'gallery'::"ProjectImageCategory"
WHERE LOWER(COALESCE("media_type", '')) IN ('gallery', 'featured')
  AND "category" IS NULL;

UPDATE "project_media"
SET "category" = 'floor_plan'::"ProjectImageCategory"
WHERE LOWER(COALESCE("media_type", '')) IN ('floor_plan', 'floor-plan', 'floorplan')
  AND "category" IS NULL;
