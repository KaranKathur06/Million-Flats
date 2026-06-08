DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditEntityType') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditEntityType' AND e.enumlabel = 'AGENT'
    ) THEN
      ALTER TYPE "AuditEntityType" ADD VALUE 'AGENT';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditEntityType' AND e.enumlabel = 'USER'
    ) THEN
      ALTER TYPE "AuditEntityType" ADD VALUE 'USER';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'ADMIN_AGENT_APPROVED'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_AGENT_APPROVED';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'ADMIN_AGENT_SUSPENDED'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_AGENT_SUSPENDED';
    END IF;
  END IF;
END $$;
