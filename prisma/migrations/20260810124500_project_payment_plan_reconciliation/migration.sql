-- Project payment plan reconciliation.
--
-- This migration is intentionally additive and idempotent.
-- It creates the missing enum and payment plan table if they do not exist,
-- and it adds any missing required columns, indexes, and foreign key.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProjectPaymentPlanItemType') THEN
    CREATE TYPE "ProjectPaymentPlanItemType" AS ENUM (
      'BASE_PRICE',
      'FEE'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "project_payment_plans" (
  "id" TEXT NOT NULL,
  "project_id" TEXT NOT NULL,
  "item_type" "ProjectPaymentPlanItemType" NOT NULL DEFAULT 'BASE_PRICE',
  "label" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'AED',
  "milestone" TEXT,
  "sort_order" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "project_payment_plans_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "project_payment_plans"
  ADD COLUMN IF NOT EXISTS "item_type" "ProjectPaymentPlanItemType" NOT NULL DEFAULT 'BASE_PRICE',
  ADD COLUMN IF NOT EXISTS "label" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "currency" TEXT NOT NULL DEFAULT 'AED',
  ADD COLUMN IF NOT EXISTS "milestone" TEXT,
  ADD COLUMN IF NOT EXISTS "sort_order" INTEGER,
  ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'project_payment_plans'::regclass
      AND contype = 'f'
      AND conname = 'project_payment_plans_project_id_fkey'
  ) THEN
    ALTER TABLE "project_payment_plans"
      ADD CONSTRAINT "project_payment_plans_project_id_fkey"
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "project_payment_plans_project_id_idx" ON "project_payment_plans" ("project_id");
