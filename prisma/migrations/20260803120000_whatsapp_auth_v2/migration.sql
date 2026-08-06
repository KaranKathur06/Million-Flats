-- ============================================================
-- WhatsApp Authentication V2 Migration
-- Adds the complete V2 auth architecture:
--   - 3 enums: AuthMode, OtpStatus, AuthProviderType
--   - 3 tables: whatsapp_otp_requests, auth_settings, login_audits
--   - 5 user columns: phone_hash, phone_encrypted, phone_verified_at,
--     primary_auth_provider, whatsapp_opt_in
--
-- All operations are idempotent with IF NOT EXISTS / DO $$ guards.
-- V1 objects (whatsapp_auth_sessions, whatsapp_otps, whatsapp_logs,
-- WhatsAppSessionStatus) are intentionally preserved — cleanup is
-- deferred to a future migration after V2 is stable.
-- ============================================================

-- ── 1. Enums ─────────────────────────────────────────────────────────────────

-- 1a. AuthMode enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuthMode') THEN
    CREATE TYPE "AuthMode" AS ENUM (
      'EMAIL_ONLY',
      'WHATSAPP_ONLY',
      'EMAIL_AND_WHATSAPP',
      'DISABLED'
    );
  END IF;
END $$;

-- 1b. OtpStatus enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OtpStatus') THEN
    CREATE TYPE "OtpStatus" AS ENUM (
      'PENDING',
      'VERIFIED',
      'EXPIRED',
      'BLOCKED'
    );
  END IF;
END $$;

-- 1c. AuthProviderType enum
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuthProviderType') THEN
    CREATE TYPE "AuthProviderType" AS ENUM (
      'EMAIL',
      'WHATSAPP',
      'GOOGLE',
      'APPLE'
    );
  END IF;
END $$;

-- ── 2. whatsapp_otp_requests table ───────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "whatsapp_otp_requests" (
  "id"              TEXT NOT NULL,
  "phone_hash"      TEXT NOT NULL,
  "phone_encrypted" TEXT NOT NULL,
  "otp_hash"        TEXT NOT NULL,
  "status"          "OtpStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at"      TIMESTAMP(3) NOT NULL,
  "attempts"        INTEGER NOT NULL DEFAULT 0,
  "max_attempts"    INTEGER NOT NULL DEFAULT 5,
  "ip_address"      TEXT,
  "user_agent"      TEXT,
  "device_id"       TEXT,
  "country"         TEXT,
  "city"            TEXT,
  "provider"        TEXT NOT NULL DEFAULT 'AISENSY',
  "message_id"      TEXT,
  "sent_at"         TIMESTAMP(3),
  "verified_at"     TIMESTAMP(3),
  "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "whatsapp_otp_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "whatsapp_otp_requests_phone_hash_idx"
  ON "whatsapp_otp_requests" ("phone_hash");

CREATE INDEX IF NOT EXISTS "whatsapp_otp_requests_status_idx"
  ON "whatsapp_otp_requests" ("status");

CREATE INDEX IF NOT EXISTS "whatsapp_otp_requests_expires_at_idx"
  ON "whatsapp_otp_requests" ("expires_at");

CREATE INDEX IF NOT EXISTS "whatsapp_otp_requests_created_at_idx"
  ON "whatsapp_otp_requests" ("created_at");

-- ── 3. auth_settings table ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "auth_settings" (
  "id"                        TEXT NOT NULL,
  "active_mode"               "AuthMode" NOT NULL DEFAULT 'WHATSAPP_ONLY',
  "allow_email"               BOOLEAN NOT NULL DEFAULT true,
  "allow_whatsapp"            BOOLEAN NOT NULL DEFAULT true,
  "allow_google"              BOOLEAN NOT NULL DEFAULT false,
  "allow_apple"               BOOLEAN NOT NULL DEFAULT false,
  "allow_passkeys"            BOOLEAN NOT NULL DEFAULT false,
  "allow_registration"        BOOLEAN NOT NULL DEFAULT true,
  "allow_forgot_password"     BOOLEAN NOT NULL DEFAULT true,
  "require_email_verification" BOOLEAN NOT NULL DEFAULT true,
  "allow_multiple_sessions"   BOOLEAN NOT NULL DEFAULT true,
  "require_mfa"               BOOLEAN NOT NULL DEFAULT false,
  "maintenance_message"       TEXT,
  "updated_at"                TIMESTAMP(3) NOT NULL,
  "updated_by_user_id"        TEXT,

  CONSTRAINT "auth_settings_pkey" PRIMARY KEY ("id")
);

-- ── 4. login_audits table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "login_audits" (
  "id"          TEXT NOT NULL,
  "user_id"     TEXT,
  "phone_hash"  TEXT,
  "email"       TEXT,
  "provider"    "AuthProviderType" NOT NULL,
  "success"     BOOLEAN NOT NULL,
  "fail_reason" TEXT,
  "ip_address"  TEXT,
  "user_agent"  TEXT,
  "country"     TEXT,
  "city"        TEXT,
  "device_id"   TEXT,
  "session_id"  TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "login_audits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "login_audits_user_id_idx"
  ON "login_audits" ("user_id");

CREATE INDEX IF NOT EXISTS "login_audits_phone_hash_idx"
  ON "login_audits" ("phone_hash");

CREATE INDEX IF NOT EXISTS "login_audits_provider_idx"
  ON "login_audits" ("provider");

CREATE INDEX IF NOT EXISTS "login_audits_success_idx"
  ON "login_audits" ("success");

CREATE INDEX IF NOT EXISTS "login_audits_created_at_idx"
  ON "login_audits" ("created_at");

-- ── 5. User table extensions for WhatsApp Auth V2 ────────────────────────────

-- 5a. phone_hash — SHA-256 hash of E.164 phone for indexed lookup
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_hash" TEXT;

-- 5b. phone_encrypted — AES-256-GCM encrypted E.164 phone
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_encrypted" TEXT;

-- 5c. phone_verified_at — timestamp of last phone verification
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_verified_at" TIMESTAMP(3);

-- 5d. primary_auth_provider — which auth method the user primarily uses
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'primary_auth_provider'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "primary_auth_provider" "AuthProviderType";
  END IF;
END $$;

-- 5e. whatsapp_opt_in — whether user has opted in to WhatsApp communications
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsapp_opt_in" BOOLEAN NOT NULL DEFAULT false;

-- ── 6. Unique constraint on users.phone_hash ─────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_phone_hash_key'
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_phone_hash_key" UNIQUE ("phone_hash");
  END IF;
END $$;
