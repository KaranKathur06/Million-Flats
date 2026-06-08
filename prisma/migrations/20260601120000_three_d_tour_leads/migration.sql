-- 3D Tour dedicated CRM pipeline: lead type, filter columns, indexes

ALTER TYPE "LeadType" ADD VALUE 'THREE_D_TOUR';

ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "user_id" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "property_type" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "property_name" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "property_size" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "budget_range" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "timeline" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "referral_code" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "referral_partner_id" TEXT;

CREATE INDEX IF NOT EXISTS "leads_property_type_idx" ON "leads"("property_type");
CREATE INDEX IF NOT EXISTS "leads_budget_range_idx" ON "leads"("budget_range");
CREATE INDEX IF NOT EXISTS "leads_referral_code_idx" ON "leads"("referral_code");
CREATE INDEX IF NOT EXISTS "leads_user_id_idx" ON "leads"("user_id");
