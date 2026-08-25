-- Retire Interior from gallery taxonomies. Existing rows are preserved as Other.
ALTER TYPE "ManualPropertyMediaCategory" RENAME TO "ManualPropertyMediaCategory_old";
CREATE TYPE "ManualPropertyMediaCategory" AS ENUM ('COVER', 'EXTERIOR', 'LIVING_ROOM', 'BEDROOM', 'KITCHEN', 'BATHROOM', 'VIEW', 'FLOOR_PLANS', 'AMENITIES', 'OTHER', 'BROCHURE', 'VIDEO');
ALTER TABLE "manual_property_media"
  ALTER COLUMN "category" TYPE "ManualPropertyMediaCategory"
  USING (CASE WHEN "category"::text = 'INTERIOR' THEN 'OTHER' ELSE "category"::text END)::"ManualPropertyMediaCategory";
DROP TYPE "ManualPropertyMediaCategory_old";

ALTER TYPE "ProjectImageCategory" RENAME TO "ProjectImageCategory_old";
CREATE TYPE "ProjectImageCategory" AS ENUM ('hero', 'exterior', 'amenities', 'lifestyle', 'floor_plan', 'other');
ALTER TABLE "project_media"
  ALTER COLUMN "category" TYPE "ProjectImageCategory"
  USING (CASE WHEN "category"::text = 'interior' THEN 'other' ELSE "category"::text END)::"ProjectImageCategory";
DROP TYPE "ProjectImageCategory_old";
