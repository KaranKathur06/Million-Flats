CREATE TYPE "HeroBannerScope" AS ENUM ('CITY', 'COUNTRY', 'GLOBAL');
CREATE TYPE "HeroBannerCategory" AS ENUM ('BUY', 'RENT', 'PROJECTS', 'GENERIC');
ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'HERO_BANNER';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_HERO_BANNER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_HERO_BANNER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_HERO_BANNER_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_HERO_BANNER_IMAGE_REMOVED';

CREATE TABLE "hero_banners" (
    "id" TEXT NOT NULL,
    "scope" "HeroBannerScope" NOT NULL,
    "scope_key" TEXT NOT NULL,
    "category" "HeroBannerCategory" NOT NULL,
    "city_id" TEXT,
    "country" "CountryCode",
    "headline" TEXT,
    "subheadline" TEXT,
    "desktop_image_key" TEXT,
    "desktop_image_url" TEXT,
    "desktop_image_alt" VARCHAR(300),
    "desktop_width" INTEGER,
    "desktop_height" INTEGER,
    "desktop_file_size" INTEGER,
    "desktop_mime_type" TEXT,
    "mobile_image_key" TEXT,
    "mobile_image_url" TEXT,
    "mobile_image_alt" VARCHAR(300),
    "mobile_width" INTEGER,
    "mobile_height" INTEGER,
    "mobile_file_size" INTEGER,
    "mobile_mime_type" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_by" TEXT,
    "updated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hero_banners_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "hero_banners_scope_consistency_check" CHECK (
      ("scope" = 'CITY' AND "city_id" IS NOT NULL AND "country" IS NULL AND "scope_key" = 'city:' || "city_id") OR
      ("scope" = 'COUNTRY' AND "city_id" IS NULL AND "country" IS NOT NULL AND "scope_key" = 'country:' || "country"::TEXT) OR
      ("scope" = 'GLOBAL' AND "city_id" IS NULL AND "country" IS NULL AND "scope_key" = 'global')
    ),
    CONSTRAINT "hero_banners_generic_city_only_check" CHECK ("category" <> 'GENERIC' OR "scope" = 'CITY')
);

CREATE UNIQUE INDEX "hero_banners_scope_key_category_key" ON "hero_banners"("scope_key", "category");
CREATE INDEX "hero_banners_resolution_idx" ON "hero_banners"("scope", "category", "is_active", "priority");
CREATE INDEX "hero_banners_city_category_idx" ON "hero_banners"("city_id", "category", "is_active");
CREATE INDEX "hero_banners_country_category_idx" ON "hero_banners"("country", "category", "is_active");

ALTER TABLE "hero_banners"
ADD CONSTRAINT "hero_banners_city_id_fkey"
FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "hero_banners" (
  "id", "scope", "scope_key", "category", "headline", "subheadline",
  "desktop_image_url", "desktop_image_alt", "is_active", "created_at", "updated_at"
) VALUES
  (
    'hero_default_buy', 'GLOBAL', 'global', 'BUY',
    'Discover Premium Properties',
    'Browse properties available for purchase across India and the UAE. Search by location, property type, configuration, budget and more.',
    '/HOMEPAGE.jpeg', 'Premium properties across India and the UAE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'hero_default_rent', 'GLOBAL', 'global', 'RENT',
    'Find Your Next Home',
    'Discover rental properties across India and the UAE. Search by location, property type, configuration, rent and lifestyle preferences.',
    '/HOMEPAGE.jpeg', 'Rental properties across India and the UAE', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  ),
  (
    'hero_default_projects', 'GLOBAL', 'global', 'PROJECTS',
    'Discover Premium Projects',
    'Browse exclusive off-plan developments from the UAE''s top developers. Golden Visa eligible properties, luxury towers, and waterfront residences.',
    NULL, 'Premium off-plan developments', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
  );