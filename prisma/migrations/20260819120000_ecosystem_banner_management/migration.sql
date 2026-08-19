CREATE TYPE "EcosystemBannerStatus" AS ENUM ('ACTIVE', 'PROCESSING', 'FAILED', 'ARCHIVED');

CREATE TABLE "EcosystemBanner" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "altText" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" "EcosystemBannerStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcosystemBanner_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EcosystemBanner_storageKey_key" ON "EcosystemBanner"("storageKey");
CREATE INDEX "EcosystemBanner_categoryId_status_idx" ON "EcosystemBanner"("categoryId", "status");
CREATE INDEX "EcosystemBanner_updatedAt_idx" ON "EcosystemBanner"("updatedAt");
CREATE UNIQUE INDEX "EcosystemBanner_one_active_per_category_key"
  ON "EcosystemBanner"("categoryId") WHERE "status" = 'ACTIVE';

ALTER TABLE "EcosystemBanner"
  ADD CONSTRAINT "EcosystemBanner_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "EcosystemCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "EcosystemBanner" (
  "id", "categoryId", "imageUrl", "storageKey", "altText", "mimeType", "fileSize", "status", "version", "createdAt", "updatedAt"
)
SELECT
  'legacy-' || "id",
  "id",
  "heroImage",
  "heroImage",
  "title" || ' ecosystem partner banner',
  CASE
    WHEN lower("heroImage") LIKE '%.png' THEN 'image/png'
    WHEN lower("heroImage") LIKE '%.webp' THEN 'image/webp'
    WHEN lower("heroImage") LIKE '%.avif' THEN 'image/avif'
    ELSE 'image/jpeg'
  END,
  0,
  'ACTIVE',
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "EcosystemCategory"
WHERE trim("heroImage") <> '';