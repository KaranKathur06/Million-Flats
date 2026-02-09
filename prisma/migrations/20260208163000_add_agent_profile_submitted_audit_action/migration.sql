DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'AGENT_PROFILE_SUBMITTED'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'AGENT_PROFILE_SUBMITTED';
    END IF;
  END IF;
END $$;
