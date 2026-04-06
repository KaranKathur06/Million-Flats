-- Project lifecycle deletion columns
ALTER TABLE "projects"
  ADD COLUMN IF NOT EXISTS "is_deleted" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "deleted_by" TEXT,
  ADD COLUMN IF NOT EXISTS "archived_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "projects_is_deleted_idx" ON "projects"("is_deleted");
CREATE INDEX IF NOT EXISTS "projects_archived_at_idx" ON "projects"("archived_at");

-- Extend audit enums for project lifecycle
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'AuditEntityType' AND e.enumlabel = 'PROJECT') THEN
    ALTER TYPE "AuditEntityType" ADD VALUE 'PROJECT';
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'AuditAction' AND e.enumlabel = 'PROJECT_SOFT_DELETED') THEN
    ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_SOFT_DELETED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'AuditAction' AND e.enumlabel = 'PROJECT_RESTORED') THEN
    ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_RESTORED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'AuditAction' AND e.enumlabel = 'PROJECT_HARD_DELETED') THEN
    ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_HARD_DELETED';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = 'AuditAction' AND e.enumlabel = 'PROJECT_ARCHIVED') THEN
    ALTER TYPE "AuditAction" ADD VALUE 'PROJECT_ARCHIVED';
  END IF;
END$$;
