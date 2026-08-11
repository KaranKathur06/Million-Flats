-- Drop stale ProjectPaymentPlanItemType enum that exists in the database
-- but not in the Prisma schema, causing deserialization errors on read.

-- Step 1: Drop any column on project_payment_plans that uses the enum
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'project_payment_plans'
      AND column_name = 'item_type'
  ) THEN
    ALTER TABLE project_payment_plans DROP COLUMN item_type;
  END IF;
END $$;

-- Step 2: Drop the orphaned enum type itself
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectPaymentPlanItemType') THEN
    DROP TYPE "ProjectPaymentPlanItemType";
  END IF;
END $$;
