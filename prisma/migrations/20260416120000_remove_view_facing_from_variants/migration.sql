-- DropColumn: Remove deprecated 'facing' and 'view' from project_unit_variants
-- These fields are no longer used in the UI, API, or admin panel.
-- Uses IF EXISTS to safely handle cases where columns were already removed.

ALTER TABLE "project_unit_variants" DROP COLUMN IF EXISTS "facing";
ALTER TABLE "project_unit_variants" DROP COLUMN IF EXISTS "view";
