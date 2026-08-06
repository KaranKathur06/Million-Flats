DO $$ BEGIN
  -- Create enum PrimaryIdentity if not exists
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PrimaryIdentity') THEN
    CREATE TYPE "PrimaryIdentity" AS ENUM ('EMAIL', 'PHONE');
  END IF;
END $$;

DO $$ BEGIN
  -- Ensure users.identity_provider column exists (uses existing enum AuthProviderType)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='identity_provider'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "identity_provider" "AuthProviderType";
  END IF;
END $$;

DO $$ BEGIN
  -- Ensure users.primary_identity column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='users' AND column_name='primary_identity'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "primary_identity" "PrimaryIdentity";
  END IF;
END $$;

-- Optional: keep legacy "phone" column for backward compat. No data migration performed here.
-- After running this migration, run application-level migration to populate new fields from existing data as needed.
