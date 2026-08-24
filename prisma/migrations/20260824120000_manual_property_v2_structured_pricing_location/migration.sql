ALTER TABLE IF EXISTS "manual_properties"
  ADD COLUMN IF NOT EXISTS "negotiable" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "booking_amount" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "maintenance_charges" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "other_charges" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "annual_rent" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "security_deposit" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "agency_fee" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "utilities_included" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "available_from" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lease_duration_months" INTEGER,
  ADD COLUMN IF NOT EXISTS "payment_frequency" TEXT,
  ADD COLUMN IF NOT EXISTS "preferred_tenant_type" TEXT,
  ADD COLUMN IF NOT EXISTS "pet_friendly" BOOLEAN,
  ADD COLUMN IF NOT EXISTS "location_precision" TEXT,
  ADD COLUMN IF NOT EXISTS "public_location_visible" BOOLEAN;

ALTER TABLE IF EXISTS "manual_properties"
  ADD COLUMN IF NOT EXISTS "category" TEXT,
  ADD COLUMN IF NOT EXISTS "carpet_area" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "plot_area" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "balcony_count" INTEGER,
  ADD COLUMN IF NOT EXISTS "parking_spaces" INTEGER,
  ADD COLUMN IF NOT EXISTS "property_age_years" INTEGER,
  ADD COLUMN IF NOT EXISTS "floor_number" INTEGER,
  ADD COLUMN IF NOT EXISTS "total_floors" INTEGER,
  ADD COLUMN IF NOT EXISTS "facing" TEXT,
  ADD COLUMN IF NOT EXISTS "view" TEXT,
  ADD COLUMN IF NOT EXISTS "furnishing_status" TEXT,
  ADD COLUMN IF NOT EXISTS "property_condition" TEXT,
  ADD COLUMN IF NOT EXISTS "possession_date" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "region" TEXT,
  ADD COLUMN IF NOT EXISTS "locality" TEXT;

CREATE TABLE IF NOT EXISTS "manual_property_verification_documents" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "property_id" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "storage_key" TEXT NOT NULL,
  "url" TEXT,
  "mime_type" TEXT,
  "size_bytes" INTEGER,
  "upload_status" TEXT NOT NULL DEFAULT 'UPLOADED',
  "verification_status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
  "uploaded_by" TEXT NOT NULL,
  "reviewed_by" TEXT,
  "review_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "manual_property_verification_documents_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "manual_properties"("id") ON DELETE CASCADE,
  CONSTRAINT "manual_property_verification_documents_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "manual_property_verification_documents_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "manual_property_verification_documents_property_id_idx" ON "manual_property_verification_documents" ("property_id");
CREATE INDEX IF NOT EXISTS "manual_property_verification_documents_verification_status_idx" ON "manual_property_verification_documents" ("verification_status");