-- ============================================================
-- WhatsApp Authentication System Migration
-- Safe for production: all IF NOT EXISTS / OID-based guards
-- ============================================================

-- ── 1. WhatsAppSessionStatus enum ────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WhatsAppSessionStatus') THEN
    CREATE TYPE "WhatsAppSessionStatus" AS ENUM (
      'PENDING',
      'MESSAGE_RECEIVED',
      'OTP_SENT',
      'VERIFIED',
      'EXPIRED',
      'FAILED'
    );
  END IF;
END $$;

-- ── 2. whatsapp_auth_sessions table ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "whatsapp_auth_sessions" (
  "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "session_id"          TEXT NOT NULL,
  "phone"               TEXT NOT NULL,
  "status"              "WhatsAppSessionStatus" NOT NULL DEFAULT 'PENDING',
  "user_id"             TEXT,
  "device"              TEXT,
  "ip_address"          TEXT,
  "user_agent"          TEXT,
  "message_received_at" TIMESTAMPTZ,
  "otp_sent_at"         TIMESTAMPTZ,
  "verified_at"         TIMESTAMPTZ,
  "expires_at"          TIMESTAMPTZ NOT NULL,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "whatsapp_auth_sessions_pkey" PRIMARY KEY ("id")
);

-- Unique constraint on session_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_auth_sessions_session_id_key'
  ) THEN
    ALTER TABLE "whatsapp_auth_sessions"
      ADD CONSTRAINT "whatsapp_auth_sessions_session_id_key" UNIQUE ("session_id");
  END IF;
END $$;

-- FK to users (nullable – user may not exist yet at session creation)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_auth_sessions_user_id_fkey'
  ) THEN
    ALTER TABLE "whatsapp_auth_sessions"
      ADD CONSTRAINT "whatsapp_auth_sessions_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "whatsapp_auth_sessions_session_id_idx"
  ON "whatsapp_auth_sessions" ("session_id");

CREATE INDEX IF NOT EXISTS "whatsapp_auth_sessions_phone_idx"
  ON "whatsapp_auth_sessions" ("phone");

CREATE INDEX IF NOT EXISTS "whatsapp_auth_sessions_status_idx"
  ON "whatsapp_auth_sessions" ("status");

CREATE INDEX IF NOT EXISTS "whatsapp_auth_sessions_expires_at_idx"
  ON "whatsapp_auth_sessions" ("expires_at");

CREATE INDEX IF NOT EXISTS "whatsapp_auth_sessions_user_id_idx"
  ON "whatsapp_auth_sessions" ("user_id");

-- ── 3. whatsapp_otps table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "whatsapp_otps" (
  "id"          TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "session_id"  TEXT NOT NULL,
  "hashed_otp"  TEXT NOT NULL,
  "attempts"    INTEGER NOT NULL DEFAULT 0,
  "expires_at"  TIMESTAMPTZ NOT NULL,
  "used"        BOOLEAN NOT NULL DEFAULT false,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "whatsapp_otps_pkey" PRIMARY KEY ("id")
);

-- FK to whatsapp_auth_sessions.session_id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'whatsapp_otps_session_id_fkey'
  ) THEN
    ALTER TABLE "whatsapp_otps"
      ADD CONSTRAINT "whatsapp_otps_session_id_fkey"
      FOREIGN KEY ("session_id")
      REFERENCES "whatsapp_auth_sessions" ("session_id")
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "whatsapp_otps_session_id_idx"
  ON "whatsapp_otps" ("session_id");

CREATE INDEX IF NOT EXISTS "whatsapp_otps_expires_at_idx"
  ON "whatsapp_otps" ("expires_at");

CREATE INDEX IF NOT EXISTS "whatsapp_otps_used_idx"
  ON "whatsapp_otps" ("used");

-- ── 4. whatsapp_logs table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "whatsapp_logs" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "session_id"      TEXT,
  "phone"           TEXT NOT NULL,
  "log_type"        TEXT NOT NULL,
  "template"        TEXT,
  "message_id"      TEXT,
  "delivery_status" TEXT,
  "sent_at"         TIMESTAMPTZ,
  "error_code"      TEXT,
  "response"        JSONB,
  "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "whatsapp_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "whatsapp_logs_session_id_idx"
  ON "whatsapp_logs" ("session_id");

CREATE INDEX IF NOT EXISTS "whatsapp_logs_phone_idx"
  ON "whatsapp_logs" ("phone");

CREATE INDEX IF NOT EXISTS "whatsapp_logs_log_type_idx"
  ON "whatsapp_logs" ("log_type");

CREATE INDEX IF NOT EXISTS "whatsapp_logs_created_at_idx"
  ON "whatsapp_logs" ("created_at");

-- ── 5. User table extensions for WhatsApp auth ───────────────────────────────

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_verified"        BOOLEAN      NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "whatsapp_verified"     BOOLEAN      NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_whatsapp_login"   TIMESTAMPTZ;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "preferred_language"    TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "auth_provider"         TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_device"           TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_ip"               TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "profile_completion"    INTEGER      NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "welcome_whatsapp_sent" BOOLEAN      NOT NULL DEFAULT false;
