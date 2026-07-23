-- Startup-critical schema drift repair.
-- Forward-only, production-safe, and non-destructive.

-- email_verification_tokens.attempts is required by Prisma.
ALTER TABLE IF EXISTS email_verification_tokens
  ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'email_verification_tokens'
  ) THEN
    UPDATE email_verification_tokens
    SET attempts = 0
    WHERE attempts IS NULL;

    ALTER TABLE email_verification_tokens
      ALTER COLUMN attempts SET DEFAULT 0,
      ALTER COLUMN attempts SET NOT NULL;
  END IF;
END $$;

-- leads.developer_id exists in Prisma and is used by developer CRM/dashboard flows.
ALTER TABLE IF EXISTS leads
  ADD COLUMN IF NOT EXISTS developer_id TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'leads'
  ) THEN
    CREATE INDEX IF NOT EXISTS leads_developer_id_idx
      ON leads(developer_id);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'developers'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leads_developer_id_fkey'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_developer_id_fkey
      FOREIGN KEY (developer_id) REFERENCES developers(id)
      ON DELETE SET NULL ON UPDATE CASCADE
      NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'EcosystemPartner'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'ecosystem_partner_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leads_ecosystem_partner_id_fkey'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_ecosystem_partner_id_fkey
      FOREIGN KEY (ecosystem_partner_id) REFERENCES "EcosystemPartner"(id)
      ON DELETE SET NULL ON UPDATE CASCADE
      NOT VALID;
  END IF;
END $$;

-- Audit enum values used by admin/developer workflows.
DO $$
DECLARE
  enum_oid oid;
BEGIN
  SELECT oid INTO enum_oid FROM pg_type WHERE typname = 'AuditEntityType';
  IF enum_oid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = enum_oid AND enumlabel = 'DEVELOPER_PROFILE') THEN
    ALTER TYPE "AuditEntityType" ADD VALUE 'DEVELOPER_PROFILE';
  END IF;
END $$;

DO $$
DECLARE
  enum_oid oid;
  value text;
  enum_values text[] := ARRAY[
    'DEVELOPER_PROFILE_SUBMITTED',
    'ADMIN_DEVELOPER_APPROVED',
    'ADMIN_DEVELOPER_REJECTED',
    'ADMIN_DEVELOPER_VERIFIED',
    'ADMIN_DEVELOPER_SUSPENDED',
    'ADMIN_DEVELOPER_UNSUSPENDED',
    'ADMIN_DEVELOPER_FEATURED',
    'ADMIN_DEVELOPER_DOCUMENT_APPROVED',
    'ADMIN_DEVELOPER_DOCUMENT_REJECTED',
    'ADMIN_DEVELOPER_LINKED'
  ];
BEGIN
  SELECT oid INTO enum_oid FROM pg_type WHERE typname = 'AuditAction';
  IF enum_oid IS NOT NULL THEN
    FOREACH value IN ARRAY enum_values LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = enum_oid AND enumlabel = value) THEN
        EXECUTE format('ALTER TYPE "AuditAction" ADD VALUE %L', value);
      END IF;
    END LOOP;
  END IF;
END $$;

DO $$
DECLARE
  enum_oid oid;
BEGIN
  SELECT oid INTO enum_oid FROM pg_type WHERE typname = 'LeadType';
  IF enum_oid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = enum_oid AND enumlabel = 'DEVELOPER') THEN
    ALTER TYPE "LeadType" ADD VALUE 'DEVELOPER';
  END IF;
END $$;

-- Meeting booking enums were present in Prisma but absent in production.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MeetingCategory') THEN
    CREATE TYPE "MeetingCategory" AS ENUM (
      'AGENT_REGISTRATION',
      'AGENCY_REGISTRATION',
      'DEVELOPER_REGISTRATION',
      'PROPERTY_BUYER',
      'PROPERTY_SELLER',
      'ADVERTISEMENT',
      'ECOSYSTEM_PARTNERS',
      'THREE_D_TOUR'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MeetingMode') THEN
    CREATE TYPE "MeetingMode" AS ENUM (
      'GOOGLE_MEET',
      'ZOOM',
      'MICROSOFT_TEAMS',
      'PHONE_CALL',
      'OFFICE_VISIT'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BookingStatus') THEN
    CREATE TYPE "BookingStatus" AS ENUM (
      'PENDING',
      'CONFIRMED',
      'COMPLETED',
      'CANCELLED'
    );
  END IF;
END $$;

-- AI/market enums are required by Prisma models and future repair migrations.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AIShieldStatus') THEN
    CREATE TYPE "AIShieldStatus" AS ENUM (
      'FAIR',
      'OVERPRICED',
      'UNDERPRICED',
      'SUSPICIOUS',
      'INSUFFICIENT_DATA'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AIShieldPropertyType') THEN
    CREATE TYPE "AIShieldPropertyType" AS ENUM (
      'MANUAL_PROPERTY',
      'PROJECT'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AIModuleType') THEN
    CREATE TYPE "AIModuleType" AS ENUM (
      'SHIELD',
      'INDEX',
      'VIEW',
      'TITLE',
      'PRO',
      'MARKET',
      'RISK',
      'RECOMMEND'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InfrastructureType') THEN
    CREATE TYPE "InfrastructureType" AS ENUM (
      'METRO_LINE',
      'BRT_CORRIDOR',
      'HIGHWAY',
      'EXPRESSWAY',
      'AIRPORT',
      'PORT',
      'HOSPITAL',
      'SCHOOL',
      'UNIVERSITY',
      'SEZ',
      'IT_HUB',
      'SMART_CITY',
      'MALL',
      'BUSINESS_DISTRICT',
      'PARK'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InfrastructureStatus') THEN
    CREATE TYPE "InfrastructureStatus" AS ENUM (
      'ANNOUNCED',
      'APPROVED',
      'LAND_ACQUIRED',
      'UNDER_CONSTRUCTION',
      'COMPLETED',
      'CANCELLED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketHeat') THEN
    CREATE TYPE "MarketHeat" AS ENUM (
      'VERY_HOT',
      'HOT',
      'WARM',
      'NEUTRAL',
      'COOL',
      'COLD',
      'VERY_COLD'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvestmentGrade') THEN
    CREATE TYPE "InvestmentGrade" AS ENUM (
      'A_PLUS',
      'A',
      'B_PLUS',
      'B',
      'C_PLUS',
      'C',
      'D'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LegalRiskClassification') THEN
    CREATE TYPE "LegalRiskClassification" AS ENUM (
      'CLEAR',
      'MINOR_ISSUES',
      'CAUTION',
      'HIGH_RISK',
      'BLOCKED'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'KnowledgeEdgeType') THEN
    CREATE TYPE "KnowledgeEdgeType" AS ENUM (
      'PROPERTY_NEAR_METRO',
      'PROPERTY_NEAR_SCHOOL',
      'PROPERTY_NEAR_HOSPITAL',
      'PROPERTY_NEAR_MALL',
      'PROPERTY_NEAR_AIRPORT',
      'PROPERTY_NEAR_IT_HUB',
      'PROPERTY_NEAR_HIGHWAY',
      'PROPERTY_DEVELOPED_BY',
      'PROPERTY_LISTED_BY',
      'PROPERTY_IN_PROJECT',
      'DEVELOPER_HAS_LITIGATION',
      'AGENT_CLOSED_IN_AREA',
      'AREA_NEAR_INFRA'
    );
  END IF;
END $$;

-- Legacy migrations created lowercase enum labels; add canonical Prisma labels
-- without removing historical values.
DO $$
DECLARE
  enum_oid oid;
  value text;
  enum_values text[] := ARRAY['HERO', 'GALLERY', 'INTERIOR', 'EXTERIOR', 'AMENITIES', 'LIFESTYLE', 'FLOOR_PLAN'];
BEGIN
  SELECT oid INTO enum_oid FROM pg_type WHERE typname = 'ProjectImageCategory';
  IF enum_oid IS NOT NULL THEN
    FOREACH value IN ARRAY enum_values LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = enum_oid AND enumlabel = value) THEN
        EXECUTE format('ALTER TYPE "ProjectImageCategory" ADD VALUE %L', value);
      END IF;
    END LOOP;
  END IF;
END $$;

DO $$
DECLARE
  enum_oid oid;
  value text;
  enum_values text[] := ARRAY['AVAILABLE', 'SOLD_OUT'];
BEGIN
  SELECT oid INTO enum_oid FROM pg_type WHERE typname = 'UnitAvailabilityStatus';
  IF enum_oid IS NOT NULL THEN
    FOREACH value IN ARRAY enum_values LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = enum_oid AND enumlabel = value) THEN
        EXECUTE format('ALTER TYPE "UnitAvailabilityStatus" ADD VALUE %L', value);
      END IF;
    END LOOP;
  END IF;
END $$;

DO $$
DECLARE
  enum_oid oid;
  value text;
  enum_values text[] := ARRAY['INTERIOR', 'VIDEO', 'THREE_D'];
BEGIN
  SELECT oid INTO enum_oid FROM pg_type WHERE typname = 'UnitMediaType';
  IF enum_oid IS NOT NULL THEN
    FOREACH value IN ARRAY enum_values LOOP
      IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumtypid = enum_oid AND enumlabel = value) THEN
        EXECUTE format('ALTER TYPE "UnitMediaType" ADD VALUE %L', value);
      END IF;
    END LOOP;
  END IF;
END $$;
