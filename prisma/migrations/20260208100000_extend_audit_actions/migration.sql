DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'ADMIN_ARCHIVED'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_ARCHIVED';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'ADMIN_RESTORED'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_RESTORED';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'ADMIN_CLONED_TO_DRAFT'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_CLONED_TO_DRAFT';
    END IF;
  END IF;
END $$;
