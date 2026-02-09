DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'ADMIN_AGENT_DELETED'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_AGENT_DELETED';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'ADMIN_AGENT_PROFILESTATUS_OVERRIDDEN'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_AGENT_PROFILESTATUS_OVERRIDDEN';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'ADMIN_USER_BANNED'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_USER_BANNED';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'ADMIN_USER_DELETED'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_USER_DELETED';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'ADMIN_USER_ROLE_CHANGED'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_USER_ROLE_CHANGED';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'ADMIN_USER_EMAIL_VERIFIED'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_USER_EMAIL_VERIFIED';
    END IF;
  END IF;
END $$;

ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "ip_address" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "before_state" JSONB;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "after_state" JSONB;
