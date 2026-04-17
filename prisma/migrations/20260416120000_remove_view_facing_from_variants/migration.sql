-- DropColumn: Remove deprecated 'facing' and 'view' from project_unit_variants
-- These fields are no longer used in the UI, API, or admin panel.
-- Data is preserved in a backup table for safety before dropping.

-- Phase 1: Backup existing data (run this FIRST, verify it worked)
CREATE TABLE IF NOT EXISTS _backup_variant_facing_view AS
SELECT id, facing, view
FROM project_unit_variants
WHERE facing IS NOT NULL OR view IS NOT NULL;

-- Phase 2: Drop the columns
ALTER TABLE "project_unit_variants" DROP COLUMN IF EXISTS "facing";
ALTER TABLE "project_unit_variants" DROP COLUMN IF EXISTS "view";
