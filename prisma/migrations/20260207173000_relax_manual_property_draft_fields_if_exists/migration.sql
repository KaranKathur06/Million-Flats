-- Relax manual_properties columns so drafts can be saved with partial data
-- Guarded with IF EXISTS for environments where the table may not yet be present.
-- (Submit endpoint enforces strict validation)

ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "title" DROP NOT NULL;
ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "property_type" DROP NOT NULL;
ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "intent" DROP NOT NULL;
ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "price" DROP NOT NULL;
ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "construction_status" DROP NOT NULL;
ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "short_description" DROP NOT NULL;

ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "city" DROP NOT NULL;
ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "community" DROP NOT NULL;
ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "address" DROP NOT NULL;
ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "latitude" DROP NOT NULL;
ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "longitude" DROP NOT NULL;

ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "developer_name" DROP NOT NULL;
ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "amenities" DROP NOT NULL;
ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "custom_amenities" DROP NOT NULL;
ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "payment_plan_text" DROP NOT NULL;
ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "emi_note" DROP NOT NULL;
ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "tour_3d_url" DROP NOT NULL;

ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "rejection_reason" DROP NOT NULL;
ALTER TABLE IF EXISTS "manual_properties" ALTER COLUMN "submitted_at" DROP NOT NULL;
