-- Add Project Listing Order Fields
-- Separate from Featured Project ordering (isFeatured, featuredOrder)

-- 1. Add listing priority fields to projects table
ALTER TABLE "projects" ADD COLUMN "listing_priority" INTEGER;
ALTER TABLE "projects" ADD COLUMN "is_pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "projects" ADD COLUMN "pin_priority" INTEGER;

-- 2. Create MarketPriority configuration table
CREATE TABLE "market_priorities" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "country_iso2" CHAR(2) NOT NULL UNIQUE,
  "priority" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create CityPriority configuration table
CREATE TABLE "city_priorities" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "country_iso2" CHAR(2) NOT NULL,
  "city_name" TEXT NOT NULL,
  "priority" INTEGER NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "city_priorities_country_iso2_city_name_key" UNIQUE("country_iso2", "city_name")
);

-- 4. Add indexes for efficient queries
CREATE INDEX "projects_listing_priority_idx" ON "projects"("listing_priority");
CREATE INDEX "projects_is_pinned_pin_priority_idx" ON "projects"("is_pinned", "pin_priority");
CREATE INDEX "projects_country_city_listing_idx" ON "projects"("country_iso2", "city", "listing_priority");

CREATE INDEX "market_priorities_priority_is_active_idx" ON "market_priorities"("priority", "is_active");
CREATE INDEX "city_priorities_country_priority_idx" ON "city_priorities"("country_iso2", "priority", "is_active");
