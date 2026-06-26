-- ============================================================
-- Agency Role System Migration
-- Mirrors the DeveloperProfile architecture
-- Safe for production: all IF NOT EXISTS / OID-based guards
-- ============================================================

-- ── 1. Add AGENCY to Role enum (OID-based guard) ──────────────────────────────

DO $$ DECLARE _oid oid; BEGIN
  SELECT oid INTO _oid FROM pg_type WHERE typname = 'Role';
  IF _oid IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _oid AND enumlabel = 'AGENCY') THEN
      ALTER TYPE "Role" ADD VALUE 'AGENCY';
    END IF;
  END IF;
END $$;

-- ── 2. New Enums ──────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgencyOnboardingStatus') THEN
    CREATE TYPE "AgencyOnboardingStatus" AS ENUM (
      'REGISTERED', 'EMAIL_VERIFIED', 'PROFILE_INCOMPLETE', 'PROFILE_COMPLETED',
      'DOCUMENTS_UPLOADED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgencyKycStatus') THEN
    CREATE TYPE "AgencyKycStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgencySubscriptionPlan') THEN
    CREATE TYPE "AgencySubscriptionPlan" AS ENUM ('FREE', 'PROFESSIONAL', 'ENTERPRISE');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgencyDocumentType') THEN
    CREATE TYPE "AgencyDocumentType" AS ENUM (
      'TRADE_LICENSE', 'RERA_CERTIFICATE', 'VAT_CERTIFICATE',
      'GST_CERTIFICATE', 'PAN_CARD', 'AGENCY_LOGO', 'COMPANY_BROCHURE', 'OTHER'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgencySize') THEN
    CREATE TYPE "AgencySize" AS ENUM ('MICRO', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgencyNotificationType') THEN
    CREATE TYPE "AgencyNotificationType" AS ENUM (
      'NEW_LEAD', 'LISTING_APPROVED', 'LISTING_REJECTED', 'PROFILE_VERIFIED',
      'PROFILE_FEATURED', 'ADMIN_MESSAGE', 'SUBSCRIPTION_EXPIRY',
      'APPLICATION_REJECTED', 'ACCOUNT_SUSPENDED', 'GENERAL'
    );
  END IF;
END $$;

-- ── 3. Create `agency_profiles` table ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agency_profiles" (
  "id"                       TEXT NOT NULL,
  "user_id"                  TEXT NOT NULL,
  "linked_agency_id"         TEXT,

  -- Identity
  "agency_name"              TEXT,
  "slug"                     TEXT,
  "description"              TEXT,
  "short_description"        TEXT,
  "logo"                     TEXT,
  "logo_s3_key"              TEXT,
  "banner"                   TEXT,
  "banner_s3_key"            TEXT,
  "website"                  TEXT,

  -- Legal
  "license_number"           TEXT,
  "rera_number"              TEXT,
  "vat_number"               TEXT,
  "gst_number"               TEXT,
  "pan_number"               TEXT,

  -- Business
  "agency_size"              "AgencySize",
  "year_established"         INTEGER,
  "total_agents"             INTEGER,
  "specializations"          TEXT[] NOT NULL DEFAULT '{}',
  "languages"                TEXT[] NOT NULL DEFAULT '{}',
  "operating_areas"          TEXT[] NOT NULL DEFAULT '{}',
  "countries_served"         TEXT[] NOT NULL DEFAULT '{}',

  -- Location
  "headquarters"             TEXT,
  "country"                  TEXT,
  "state"                    TEXT,
  "city"                     TEXT,
  "address"                  TEXT,

  -- Contact
  "phone"                    TEXT,
  "phone_country_code"       TEXT,
  "email"                    TEXT,

  -- Social
  "instagram_url"            TEXT,
  "linkedin_url"             TEXT,
  "facebook_url"             TEXT,
  "youtube_url"              TEXT,
  "twitter_url"              TEXT,
  "whatsapp"                 TEXT,
  "telegram"                 TEXT,

  -- Status
  "onboarding_status"        "AgencyOnboardingStatus" NOT NULL DEFAULT 'REGISTERED',
  "kyc_status"               "AgencyKycStatus" NOT NULL DEFAULT 'PENDING',
  "is_verified"              BOOLEAN NOT NULL DEFAULT false,
  "is_featured"              BOOLEAN NOT NULL DEFAULT false,
  "featured_rank"            INTEGER,

  -- Profile Completion
  "profile_completion"       INTEGER NOT NULL DEFAULT 0,
  "completion_identity"      INTEGER NOT NULL DEFAULT 0,
  "completion_legal"         INTEGER NOT NULL DEFAULT 0,
  "completion_business"      INTEGER NOT NULL DEFAULT 0,
  "completion_media"         INTEGER NOT NULL DEFAULT 0,
  "completion_social"        INTEGER NOT NULL DEFAULT 0,

  -- Subscription
  "subscription_plan"        "AgencySubscriptionPlan" NOT NULL DEFAULT 'FREE',
  "subscription_expires_at"  TIMESTAMP(3),

  -- Analytics
  "total_leads_received"     INTEGER NOT NULL DEFAULT 0,
  "total_listings"           INTEGER NOT NULL DEFAULT 0,
  "total_closed_deals"       INTEGER NOT NULL DEFAULT 0,

  -- VerixAgency
  "verix_agency_score"       INTEGER,
  "verix_score_breakdown"    JSONB,
  "verix_scored_at"          TIMESTAMP(3),

  -- Admin
  "approved_by"              TEXT,
  "approved_at"              TIMESTAMP(3),
  "verified_at"              TIMESTAMP(3),
  "rejection_reason"         TEXT,
  "suspended_at"             TIMESTAMP(3),
  "suspended_by"             TEXT,
  "admin_notes"              TEXT,
  "admin_match_suggestions"  JSONB,

  "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "agency_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "agency_profiles_user_id_key"            ON "agency_profiles" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "agency_profiles_slug_key"               ON "agency_profiles" ("slug");
CREATE INDEX        IF NOT EXISTS "agency_profiles_onboarding_status_idx"  ON "agency_profiles" ("onboarding_status");
CREATE INDEX        IF NOT EXISTS "agency_profiles_kyc_status_idx"         ON "agency_profiles" ("kyc_status");
CREATE INDEX        IF NOT EXISTS "agency_profiles_is_verified_idx"        ON "agency_profiles" ("is_verified");
CREATE INDEX        IF NOT EXISTS "agency_profiles_featured_rank_idx"      ON "agency_profiles" ("is_featured", "featured_rank");
CREATE INDEX        IF NOT EXISTS "agency_profiles_completion_idx"         ON "agency_profiles" ("profile_completion");
CREATE INDEX        IF NOT EXISTS "agency_profiles_linked_agency_idx"      ON "agency_profiles" ("linked_agency_id");
CREATE INDEX        IF NOT EXISTS "agency_profiles_subscription_idx"       ON "agency_profiles" ("subscription_plan");

-- FK: user_id → users.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agency_profiles_user_id_fkey') THEN
    ALTER TABLE "agency_profiles"
      ADD CONSTRAINT "agency_profiles_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- FK: linked_agency_id → agencies.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agency_profiles_linked_agency_id_fkey') THEN
    ALTER TABLE "agency_profiles"
      ADD CONSTRAINT "agency_profiles_linked_agency_id_fkey"
      FOREIGN KEY ("linked_agency_id") REFERENCES "agencies"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 4. Create `agency_documents` table ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agency_documents" (
  "id"                    TEXT NOT NULL,
  "agency_profile_id"     TEXT NOT NULL,
  "document_type"         "AgencyDocumentType" NOT NULL,
  "file_url"              TEXT NOT NULL,
  "s3_key"                TEXT,
  "file_name"             TEXT,
  "mime_type"             TEXT,
  "size_bytes"            INTEGER,
  -- TEXT with CHECK — avoids DocumentStatus enum dependency
  "verification_status"   TEXT NOT NULL DEFAULT 'PENDING'
                            CHECK ("verification_status" IN ('PENDING','UNDER_REVIEW','VERIFIED','REJECTED')),
  "reviewed_by"           TEXT,
  "reviewed_at"           TIMESTAMP(3),
  "rejection_reason"      TEXT,
  "uploaded_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "agency_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "agency_documents_profile_type_key"          ON "agency_documents" ("agency_profile_id", "document_type");
CREATE INDEX        IF NOT EXISTS "agency_documents_agency_profile_id_idx"     ON "agency_documents" ("agency_profile_id");
CREATE INDEX        IF NOT EXISTS "agency_documents_verification_status_idx"   ON "agency_documents" ("verification_status");
CREATE INDEX        IF NOT EXISTS "agency_documents_document_type_idx"         ON "agency_documents" ("document_type");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agency_documents_agency_profile_id_fkey') THEN
    ALTER TABLE "agency_documents"
      ADD CONSTRAINT "agency_documents_agency_profile_id_fkey"
      FOREIGN KEY ("agency_profile_id") REFERENCES "agency_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 5. Create `agency_notifications` table ────────────────────────────────────

CREATE TABLE IF NOT EXISTS "agency_notifications" (
  "id"                    TEXT NOT NULL,
  "agency_profile_id"     TEXT NOT NULL,
  "type"                  "AgencyNotificationType" NOT NULL,
  "title"                 TEXT NOT NULL,
  "message"               TEXT NOT NULL,
  "is_read"               BOOLEAN NOT NULL DEFAULT false,
  "metadata"              JSONB,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "agency_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "agency_notifications_profile_read_idx"    ON "agency_notifications" ("agency_profile_id", "is_read");
CREATE INDEX IF NOT EXISTS "agency_notifications_profile_created_idx" ON "agency_notifications" ("agency_profile_id", "created_at");
CREATE INDEX IF NOT EXISTS "agency_notifications_type_idx"            ON "agency_notifications" ("type");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'agency_notifications_agency_profile_id_fkey') THEN
    ALTER TABLE "agency_notifications"
      ADD CONSTRAINT "agency_notifications_agency_profile_id_fkey"
      FOREIGN KEY ("agency_profile_id") REFERENCES "agency_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
