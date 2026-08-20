-- Restore the nullable unit-type relation expected by Prisma's ProjectFloorPlan model.
ALTER TABLE IF EXISTS "project_floor_plans"
  ADD COLUMN IF NOT EXISTS "unit_type_id" TEXT;

-- Preserve existing floor plans while reconnecting labels to their project unit types.
UPDATE "project_floor_plans" AS fp
SET "unit_type_id" = ut."id"
FROM "project_unit_types" AS ut
WHERE fp."unit_type_id" IS NULL
  AND ut."project_id" = fp."project_id"
  AND LOWER(TRIM(ut."unit_type")) = LOWER(TRIM(fp."unit_type"));

DO $$ BEGIN
  ALTER TABLE "project_floor_plans"
    ADD CONSTRAINT "project_floor_plans_unit_type_id_fkey"
    FOREIGN KEY ("unit_type_id") REFERENCES "project_unit_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "project_floor_plans_unit_type_id_idx"
  ON "project_floor_plans"("unit_type_id");
