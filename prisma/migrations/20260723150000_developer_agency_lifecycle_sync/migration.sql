-- Developer/agency lifecycle synchronization support.
-- Forward-only, idempotent, and safe for production data.

ALTER TABLE IF EXISTS developer_profiles
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITHOUT TIME ZONE,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

CREATE INDEX IF NOT EXISTS developer_profiles_verified_at_idx
  ON developer_profiles(verified_at);

DO $$
DECLARE
  enum_oid oid;
BEGIN
  SELECT oid INTO enum_oid FROM pg_type WHERE typname = 'AuditEntityType';
  IF enum_oid IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM pg_enum WHERE enumtypid = enum_oid AND enumlabel = 'AGENCY_PROFILE'
  ) THEN
    ALTER TYPE "AuditEntityType" ADD VALUE 'AGENCY_PROFILE';
  END IF;
END $$;

DO $$
DECLARE
  enum_oid oid;
  value text;
  enum_values text[] := ARRAY[
    'AGENCY_PROFILE_SUBMITTED',
    'ADMIN_AGENCY_APPROVED',
    'ADMIN_AGENCY_REJECTED',
    'ADMIN_AGENCY_VERIFIED',
    'ADMIN_AGENCY_SUSPENDED',
    'ADMIN_AGENCY_UNSUSPENDED',
    'ADMIN_AGENCY_FEATURED',
    'ADMIN_AGENCY_LINKED'
  ];
BEGIN
  SELECT oid INTO enum_oid FROM pg_type WHERE typname = 'AuditAction';
  IF enum_oid IS NOT NULL THEN
    FOREACH value IN ARRAY enum_values LOOP
      IF NOT EXISTS (
        SELECT 1 FROM pg_enum WHERE enumtypid = enum_oid AND enumlabel = value
      ) THEN
        EXECUTE format('ALTER TYPE "AuditAction" ADD VALUE %L', value);
      END IF;
    END LOOP;
  END IF;
END $$;

