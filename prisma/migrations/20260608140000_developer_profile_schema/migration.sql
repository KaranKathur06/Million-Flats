-- Developer profile columns + child tables (achievements, FAQs, gallery)
-- Safe to run on production: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeveloperStatus') THEN
    CREATE TYPE "DeveloperStatus" AS ENUM ('ACTIVE', 'INACTIVE');
  END IF;
END $$;

ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "logo" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "banner" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "short_description" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "founded_year" INTEGER;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "headquarters" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "facebook_url" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "instagram_url" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "linkedin_url" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "youtube_url" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "customer_rating" DOUBLE PRECISION;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "projects_delivered" INTEGER;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "countries_present" INTEGER;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "verix_score" INTEGER;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "meta_title" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "meta_description" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "meta_keywords" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "og_image" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "canonical_url" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "developer_brochure_url" TEXT;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "featured_rank" INTEGER;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "developers" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'developers' AND column_name = 'status'
  ) THEN
    ALTER TABLE "developers" ADD COLUMN "status" "DeveloperStatus" NOT NULL DEFAULT 'ACTIVE';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "developers_slug_key" ON "developers" ("slug");
CREATE INDEX IF NOT EXISTS "developers_status_idx" ON "developers" ("status");
CREATE INDEX IF NOT EXISTS "developers_is_deleted_idx" ON "developers" ("is_deleted");

CREATE TABLE IF NOT EXISTS "developer_achievements" (
  "id" TEXT NOT NULL,
  "developer_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "image_url" TEXT,
  "award_date" TIMESTAMP(3),
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "developer_achievements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "developer_faqs" (
  "id" TEXT NOT NULL,
  "developer_id" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "answer" TEXT NOT NULL,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "developer_faqs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "developer_gallery" (
  "id" TEXT NOT NULL,
  "developer_id" TEXT NOT NULL,
  "image_url" TEXT NOT NULL,
  "caption" TEXT,
  "category" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "developer_gallery_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "developer_achievements_developer_id_idx" ON "developer_achievements" ("developer_id");
CREATE INDEX IF NOT EXISTS "developer_faqs_developer_id_idx" ON "developer_faqs" ("developer_id");
CREATE INDEX IF NOT EXISTS "developer_gallery_developer_id_idx" ON "developer_gallery" ("developer_id");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'developer_achievements_developer_id_fkey') THEN
    ALTER TABLE "developer_achievements"
      ADD CONSTRAINT "developer_achievements_developer_id_fkey"
      FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'developer_faqs_developer_id_fkey') THEN
    ALTER TABLE "developer_faqs"
      ADD CONSTRAINT "developer_faqs_developer_id_fkey"
      FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'developer_gallery_developer_id_fkey') THEN
    ALTER TABLE "developer_gallery"
      ADD CONSTRAINT "developer_gallery_developer_id_fkey"
      FOREIGN KEY ("developer_id") REFERENCES "developers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill slugs from names where missing (lowercase, hyphenated)
UPDATE "developers"
SET "slug" = lower(regexp_replace(trim("name"), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE "slug" IS NULL OR trim("slug") = '';

UPDATE "developers" SET "status" = 'ACTIVE' WHERE "status" IS NULL;
UPDATE "developers" SET "is_deleted" = false WHERE "is_deleted" IS NULL;
