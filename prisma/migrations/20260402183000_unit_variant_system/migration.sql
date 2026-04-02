-- Unit availability enum
DO $$ BEGIN
  CREATE TYPE "unit_availability_status" AS ENUM ('available', 'sold_out');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Unit media enum
DO $$ BEGIN
  CREATE TYPE "unit_media_type" AS ENUM ('interior', 'video', '3d');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "project_unit_types"
  ADD COLUMN IF NOT EXISTS "bedrooms" INTEGER,
  ADD COLUMN IF NOT EXISTS "bathrooms" INTEGER,
  ADD COLUMN IF NOT EXISTS "sort_order" INTEGER;

CREATE TABLE IF NOT EXISTS "project_unit_variants" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "unit_type_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "size" INTEGER,
  "price" DOUBLE PRECISION,
  "price_per_sqft" DOUBLE PRECISION,
  "facing" TEXT,
  "view" TEXT,
  "availability_status" "unit_availability_status" NOT NULL DEFAULT 'available',
  "available_units_count" INTEGER,
  "price_on_request" BOOLEAN NOT NULL DEFAULT false,
  "sort_order" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_unit_variants_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "project_unit_variants"
    ADD CONSTRAINT "project_unit_variants_project_id_fkey"
    FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "project_unit_variants"
    ADD CONSTRAINT "project_unit_variants_unit_type_id_fkey"
    FOREIGN KEY ("unit_type_id") REFERENCES "project_unit_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "project_unit_variants_project_id_idx" ON "project_unit_variants"("project_id");
CREATE INDEX IF NOT EXISTS "project_unit_variants_unit_type_id_idx" ON "project_unit_variants"("unit_type_id");
CREATE INDEX IF NOT EXISTS "project_unit_variants_availability_status_idx" ON "project_unit_variants"("availability_status");

ALTER TABLE "project_floor_plans"
  ADD COLUMN IF NOT EXISTS "unit_variant_id" TEXT;

DO $$ BEGIN
  ALTER TABLE "project_floor_plans"
    ADD CONSTRAINT "project_floor_plans_unit_variant_id_fkey"
    FOREIGN KEY ("unit_variant_id") REFERENCES "project_unit_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "project_floor_plans_unit_variant_id_idx" ON "project_floor_plans"("unit_variant_id");

CREATE TABLE IF NOT EXISTS "unit_media" (
  "id" TEXT NOT NULL,
  "unit_variant_id" TEXT NOT NULL,
  "type" "unit_media_type" NOT NULL,
  "url" TEXT NOT NULL,
  "title" TEXT,
  "sort_order" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "unit_media_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "unit_media"
    ADD CONSTRAINT "unit_media_unit_variant_id_fkey"
    FOREIGN KEY ("unit_variant_id") REFERENCES "project_unit_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "unit_media_unit_variant_id_idx" ON "unit_media"("unit_variant_id");

-- Backfill one default variant per unit type if missing
INSERT INTO "project_unit_variants" (
  "id", "project_id", "unit_type_id", "title", "size", "price", "availability_status", "available_units_count", "price_on_request", "sort_order"
)
SELECT
  gen_random_uuid()::text,
  ut."project_id",
  ut."id",
  COALESCE(NULLIF(ut."unit_type", ''), 'Variant A'),
  ut."size_from",
  ut."price_from",
  'available'::"unit_availability_status",
  NULL,
  CASE WHEN ut."price_from" IS NULL THEN true ELSE false END,
  0
FROM "project_unit_types" ut
WHERE NOT EXISTS (
  SELECT 1 FROM "project_unit_variants" uv WHERE uv."unit_type_id" = ut."id"
);

-- Link existing floor plans to a matching/default variant
WITH match_variant AS (
  SELECT fp."id" AS fp_id, uv."id" AS uv_id
  FROM "project_floor_plans" fp
  JOIN "project_unit_types" ut ON ut."project_id" = fp."project_id" AND lower(ut."unit_type") = lower(fp."unit_type")
  JOIN "project_unit_variants" uv ON uv."unit_type_id" = ut."id"
)
UPDATE "project_floor_plans" fp
SET "unit_variant_id" = mv."uv_id"
FROM match_variant mv
WHERE fp."id" = mv.fp_id
  AND fp."unit_variant_id" IS NULL;
