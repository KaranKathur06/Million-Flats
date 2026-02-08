-- ManualProperty lifecycle extensions: archive + clone + resume metadata

-- 1) Enum update: add ARCHIVED to ManualPropertyStatus
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'ManualPropertyStatus' AND e.enumlabel = 'ARCHIVED'
  ) THEN
    ALTER TYPE "ManualPropertyStatus" ADD VALUE 'ARCHIVED';
  END IF;
END $$;

-- 2) ManualProperty columns
ALTER TABLE "manual_properties"
  ADD COLUMN IF NOT EXISTS "last_completed_step" TEXT,
  ADD COLUMN IF NOT EXISTS "cloned_from_id" TEXT,
  ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archived_by" TEXT;

-- If a previous failed attempt created cloned_from_id as UUID, coerce it to TEXT to match manual_properties.id.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'manual_properties'
      AND column_name = 'cloned_from_id'
      AND udt_name = 'uuid'
  ) THEN
    ALTER TABLE "manual_properties"
      ALTER COLUMN "cloned_from_id" TYPE TEXT USING "cloned_from_id"::TEXT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'manual_properties_cloned_from_id_fkey'
  ) THEN
    ALTER TABLE "manual_properties"
      ADD CONSTRAINT "manual_properties_cloned_from_id_fkey"
      FOREIGN KEY ("cloned_from_id") REFERENCES "manual_properties"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "manual_properties_cloned_from_id_idx" ON "manual_properties"("cloned_from_id");

-- 3) Audit logs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditEntityType') THEN
    CREATE TYPE "AuditEntityType" AS ENUM ('MANUAL_PROPERTY');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN
    CREATE TYPE "AuditAction" AS ENUM (
      'DRAFT_DELETED',
      'PUBLISHED_ARCHIVED',
      'PUBLISHED_CLONED_TO_DRAFT',
      'ADMIN_APPROVED',
      'ADMIN_REJECTED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "entity_type" "AuditEntityType" NOT NULL,
  "entity_id" TEXT NOT NULL,
  "action" "AuditAction" NOT NULL,
  "performed_by_user_id" UUID,
  "meta" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'audit_logs_performed_by_user_id_fkey'
  ) THEN
    ALTER TABLE "audit_logs"
      ADD CONSTRAINT "audit_logs_performed_by_user_id_fkey"
      FOREIGN KEY ("performed_by_user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "audit_logs_entity_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs"("action");
CREATE INDEX IF NOT EXISTS "audit_logs_performed_by_idx" ON "audit_logs"("performed_by_user_id");
