-- ============================================================
-- Developer Profile System Migration
-- Safe for production: uses IF NOT EXISTS guards throughout
-- ============================================================

-- ── 1. New Enums ─────────────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeveloperKycStatus') THEN
    CREATE TYPE "DeveloperKycStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'VERIFIED', 'REJECTED');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeveloperOnboardingStatus') THEN
    CREATE TYPE "DeveloperOnboardingStatus" AS ENUM (
      'REGISTERED', 'EMAIL_VERIFIED', 'PROFILE_INCOMPLETE', 'PROFILE_COMPLETED',
      'DOCUMENTS_UPLOADED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeveloperSubscriptionPlan') THEN
    CREATE TYPE "DeveloperSubscriptionPlan" AS ENUM ('FREE', 'PROFESSIONAL', 'ENTERPRISE');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeveloperDocumentType') THEN
    CREATE TYPE "DeveloperDocumentType" AS ENUM (
      'RERA_CERTIFICATE', 'GST_CERTIFICATE', 'PAN_CARD',
      'REGISTRATION_CERTIFICATE', 'AUTHORIZED_PERSON_ID', 'COMPANY_LOGO', 'BROCHURE', 'OTHER'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DeveloperNotificationType') THEN
    CREATE TYPE "DeveloperNotificationType" AS ENUM (
      'NEW_LEAD', 'PROJECT_APPROVED', 'PROJECT_REJECTED', 'BROCHURE_DOWNLOADED',
      'PROFILE_VERIFIED', 'PROJECT_FEATURED', 'ADMIN_MESSAGE', 'SUBSCRIPTION_EXPIRY',
      'APPLICATION_REJECTED', 'ACCOUNT_SUSPENDED', 'GENERAL'
    );
  END IF;
END $$;

-- ── 2. Extend LeadType enum (OID-based — avoids ::regtype parse errors) ────────
-- Using DECLARE + OID lookup so PostgreSQL never parses 'LeadType'::regtype
-- at statement compile time (which would fail if the type doesn't exist).

DO $$ DECLARE _oid oid; BEGIN
  SELECT oid INTO _oid FROM pg_type WHERE typname = 'LeadType';
  IF _oid IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _oid AND enumlabel = 'BROCHURE_REQUEST') THEN
      ALTER TYPE "LeadType" ADD VALUE 'BROCHURE_REQUEST';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _oid AND enumlabel = 'SITE_VISIT_REQUEST') THEN
      ALTER TYPE "LeadType" ADD VALUE 'SITE_VISIT_REQUEST';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _oid AND enumlabel = 'CALL_BACK') THEN
      ALTER TYPE "LeadType" ADD VALUE 'CALL_BACK';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = _oid AND enumlabel = 'THREE_D_TOUR_REQUEST') THEN
      ALTER TYPE "LeadType" ADD VALUE 'THREE_D_TOUR_REQUEST';
    END IF;
  END IF;
END $$;

-- ── 3. Extend `leads` table ────────────────────────────────────────────────────

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "developer_profile_id" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "lead_sub_type" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "crm_stage" TEXT DEFAULT 'NEW';

CREATE INDEX IF NOT EXISTS "leads_developer_profile_id_idx" ON "leads" ("developer_profile_id");
CREATE INDEX IF NOT EXISTS "leads_crm_stage_idx" ON "leads" ("crm_stage");

-- ── 4. Extend `projects` table ─────────────────────────────────────────────────

ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "owned_by_profile_id" TEXT;
CREATE INDEX IF NOT EXISTS "projects_owned_by_profile_id_idx" ON "projects" ("owned_by_profile_id");

-- ── 5. Create `developer_profiles` table ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS "developer_profiles" (
  "id"                       TEXT NOT NULL,
  "user_id"                  TEXT NOT NULL,
  "linked_developer_id"      TEXT,

  -- Company Basics
  "company_name"             TEXT,
  "slug"                     TEXT,
  "description"              TEXT,
  "short_description"        TEXT,
  "logo"                     TEXT,
  "logo_s3_key"              TEXT,
  "banner"                   TEXT,
  "banner_s3_key"            TEXT,
  "website"                  TEXT,
  "founded_year"             INTEGER,
  "headquarters"             TEXT,
  "countries_served"         TEXT[] NOT NULL DEFAULT '{}',
  "total_employees"          INTEGER,
  "years_experience"         INTEGER,

  -- Legal
  "rera_number"              TEXT,
  "gst_number"               TEXT,
  "pan_number"               TEXT,

  -- Business
  "project_types_focus"      TEXT[] NOT NULL DEFAULT '{}',
  "cities_served"            TEXT[] NOT NULL DEFAULT '{}',

  -- Social
  "instagram_url"            TEXT,
  "linkedin_url"             TEXT,
  "facebook_url"             TEXT,
  "youtube_url"              TEXT,
  "twitter_url"              TEXT,
  "whatsapp"                 TEXT,
  "telegram"                 TEXT,

  -- Phone
  "phone"                    TEXT,
  "phone_country_code"       TEXT,

  -- Status & KYC
  "onboarding_status"        "DeveloperOnboardingStatus" NOT NULL DEFAULT 'REGISTERED',
  "kyc_status"               "DeveloperKycStatus" NOT NULL DEFAULT 'PENDING',
  "is_verified"              BOOLEAN NOT NULL DEFAULT false,
  "is_featured"              BOOLEAN NOT NULL DEFAULT false,
  "featured_rank"            INTEGER,

  -- Profile Completion
  "profile_completion"       INTEGER NOT NULL DEFAULT 0,
  "completion_company"       INTEGER NOT NULL DEFAULT 0,
  "completion_verification"  INTEGER NOT NULL DEFAULT 0,
  "completion_business"      INTEGER NOT NULL DEFAULT 0,
  "completion_media"         INTEGER NOT NULL DEFAULT 0,
  "completion_social"        INTEGER NOT NULL DEFAULT 0,
  "completion_projects"      INTEGER NOT NULL DEFAULT 0,

  -- Subscription
  "subscription_plan"        "DeveloperSubscriptionPlan" NOT NULL DEFAULT 'FREE',
  "subscription_expires_at"  TIMESTAMP(3),

  -- Analytics
  "total_leads_received"     INTEGER NOT NULL DEFAULT 0,
  "total_project_views"      INTEGER NOT NULL DEFAULT 0,
  "total_projects_published" INTEGER NOT NULL DEFAULT 0,

  -- Admin
  "approved_by"              TEXT,
  "approved_at"              TIMESTAMP(3),
  "verified_at"              TIMESTAMP(3),
  "rejection_reason"         TEXT,
  "suspended_at"             TIMESTAMP(3),
  "suspended_by"             TEXT,
  "admin_notes"              TEXT,
  "admin_match_suggestions"  JSONB,

  -- Verix
  "verix_developer_score"    INTEGER,
  "verix_score_breakdown"    JSONB,
  "verix_scored_at"          TIMESTAMP(3),

  "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "developer_profiles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "developer_profiles_user_id_key"           ON "developer_profiles" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "developer_profiles_slug_key"              ON "developer_profiles" ("slug");
CREATE INDEX        IF NOT EXISTS "developer_profiles_onboarding_status_idx" ON "developer_profiles" ("onboarding_status");
CREATE INDEX        IF NOT EXISTS "developer_profiles_kyc_status_idx"        ON "developer_profiles" ("kyc_status");
CREATE INDEX        IF NOT EXISTS "developer_profiles_is_verified_idx"       ON "developer_profiles" ("is_verified");
CREATE INDEX        IF NOT EXISTS "developer_profiles_featured_rank_idx"     ON "developer_profiles" ("is_featured", "featured_rank");
CREATE INDEX        IF NOT EXISTS "developer_profiles_completion_idx"        ON "developer_profiles" ("profile_completion");
CREATE INDEX        IF NOT EXISTS "developer_profiles_linked_dev_idx"        ON "developer_profiles" ("linked_developer_id");
CREATE INDEX        IF NOT EXISTS "developer_profiles_subscription_idx"      ON "developer_profiles" ("subscription_plan");

-- FK: user_id → users.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'developer_profiles_user_id_fkey') THEN
    ALTER TABLE "developer_profiles"
      ADD CONSTRAINT "developer_profiles_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- FK: linked_developer_id → developers.id
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'developer_profiles_linked_developer_id_fkey') THEN
    ALTER TABLE "developer_profiles"
      ADD CONSTRAINT "developer_profiles_linked_developer_id_fkey"
      FOREIGN KEY ("linked_developer_id") REFERENCES "developers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 6. Create `developer_documents` table ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS "developer_documents" (
  "id"                    TEXT NOT NULL,
  "developer_profile_id"  TEXT NOT NULL,
  "document_type"         "DeveloperDocumentType" NOT NULL,
  "file_url"              TEXT NOT NULL,
  "s3_key"                TEXT,
  "file_name"             TEXT,
  "mime_type"             TEXT,
  "size_bytes"            INTEGER,
  -- verification_status stored as TEXT with CHECK (avoids DocumentStatus enum dependency)
  "verification_status"   TEXT NOT NULL DEFAULT 'PENDING'
                            CHECK ("verification_status" IN ('PENDING','UNDER_REVIEW','VERIFIED','REJECTED')),
  "reviewed_by"           TEXT,
  "reviewed_at"           TIMESTAMP(3),
  "rejection_reason"      TEXT,
  "uploaded_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "developer_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "developer_documents_profile_type_key"        ON "developer_documents" ("developer_profile_id", "document_type");
CREATE INDEX        IF NOT EXISTS "developer_documents_profile_id_idx"          ON "developer_documents" ("developer_profile_id");
CREATE INDEX        IF NOT EXISTS "developer_documents_verification_status_idx" ON "developer_documents" ("verification_status");
CREATE INDEX        IF NOT EXISTS "developer_documents_type_idx"                ON "developer_documents" ("document_type");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'developer_documents_developer_profile_id_fkey') THEN
    ALTER TABLE "developer_documents"
      ADD CONSTRAINT "developer_documents_developer_profile_id_fkey"
      FOREIGN KEY ("developer_profile_id") REFERENCES "developer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 7. Create `developer_notifications` table ─────────────────────────────────

CREATE TABLE IF NOT EXISTS "developer_notifications" (
  "id"                    TEXT NOT NULL,
  "developer_profile_id"  TEXT NOT NULL,
  "type"                  "DeveloperNotificationType" NOT NULL,
  "title"                 TEXT NOT NULL,
  "message"               TEXT NOT NULL,
  "is_read"               BOOLEAN NOT NULL DEFAULT false,
  "metadata"              JSONB,
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "developer_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "developer_notifications_profile_read_idx"    ON "developer_notifications" ("developer_profile_id", "is_read");
CREATE INDEX IF NOT EXISTS "developer_notifications_profile_created_idx" ON "developer_notifications" ("developer_profile_id", "created_at");
CREATE INDEX IF NOT EXISTS "developer_notifications_type_idx"            ON "developer_notifications" ("type");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'developer_notifications_developer_profile_id_fkey') THEN
    ALTER TABLE "developer_notifications"
      ADD CONSTRAINT "developer_notifications_developer_profile_id_fkey"
      FOREIGN KEY ("developer_profile_id") REFERENCES "developer_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 8. FK: leads.developer_profile_id → developer_profiles.id ────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_developer_profile_id_fkey') THEN
    ALTER TABLE "leads"
      ADD CONSTRAINT "leads_developer_profile_id_fkey"
      FOREIGN KEY ("developer_profile_id") REFERENCES "developer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ── 9. FK: projects.owned_by_profile_id → developer_profiles.id ──────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'projects_owned_by_profile_id_fkey') THEN
    ALTER TABLE "projects"
      ADD CONSTRAINT "projects_owned_by_profile_id_fkey"
      FOREIGN KEY ("owned_by_profile_id") REFERENCES "developer_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
