DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus') THEN
    CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED');
  END IF;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'ADMIN_AGENT_BANNED'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_AGENT_BANNED';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'AuditAction' AND e.enumlabel = 'ADMIN_AGENT_ROLE_REVOKED'
    ) THEN
      ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_AGENT_ROLE_REVOKED';
    END IF;
  END IF;
END $$;
