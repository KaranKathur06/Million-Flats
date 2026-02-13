DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'AGENT_APPROVED'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'AGENT_APPROVED';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'AGENT_APPROVED_OVERRIDE'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'AGENT_APPROVED_OVERRIDE';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'ADMIN_AGENT_GO_LIVE'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_AGENT_GO_LIVE';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'ADMIN_AGENT_UNSUSPENDED'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_AGENT_UNSUSPENDED';
    END IF;
  END IF;
END $$;
