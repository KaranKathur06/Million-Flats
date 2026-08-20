-- Restore the optional MIME metadata expected by Prisma's ProjectFloorPlan model.
ALTER TABLE IF EXISTS "project_floor_plans"
  ADD COLUMN IF NOT EXISTS "mime_type" TEXT;