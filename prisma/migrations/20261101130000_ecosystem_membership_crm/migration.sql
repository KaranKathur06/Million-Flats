ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'ECOSYSTEM_PARTNER_MEMBERSHIP';
ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'ECOSYSTEM_PARTNER_CHANGE_REQUEST';
ALTER TYPE "AuditEntityType" ADD VALUE IF NOT EXISTS 'ECOSYSTEM_CATEGORY';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ECOSYSTEM_PARTNER_MEMBER_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ECOSYSTEM_PARTNER_CHANGE_REVIEWED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_ECOSYSTEM_CATEGORY_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ECOSYSTEM_PARTNER_PROFILE_EDITED';

CREATE TYPE "EcosystemPartnerMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
CREATE TYPE "EcosystemPartnerMemberStatus" AS ENUM ('INVITED', 'ACTIVE', 'REVOKED');
CREATE TYPE "EcosystemPartnerChangeStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "ecosystem_partner_memberships" (
  "id" TEXT NOT NULL,
  "partnerId" TEXT NOT NULL,
  "user_id" TEXT,
  "invite_email" TEXT NOT NULL,
  "role" "EcosystemPartnerMemberRole" NOT NULL DEFAULT 'MEMBER',
  "status" "EcosystemPartnerMemberStatus" NOT NULL DEFAULT 'INVITED',
  "invitation_token_hash" TEXT,
  "invitation_expires_at" TIMESTAMP(3),
  "invited_by_user_id" TEXT,
  "accepted_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ecosystem_partner_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ecosystem_partner_change_requests" (
  "id" TEXT NOT NULL,
  "partner_id" TEXT NOT NULL,
  "submitted_by_user_id" TEXT NOT NULL,
  "requested_changes" JSONB NOT NULL,
  "status" "EcosystemPartnerChangeStatus" NOT NULL DEFAULT 'PENDING',
  "reviewed_by_user_id" TEXT,
  "review_reason" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ecosystem_partner_change_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ecosystem_partner_memberships_invitation_token_hash_key"
  ON "ecosystem_partner_memberships"("invitation_token_hash");
CREATE UNIQUE INDEX "ecosystem_partner_memberships_partner_id_user_id_key"
  ON "ecosystem_partner_memberships"("partnerId", "user_id");
CREATE UNIQUE INDEX "ecosystem_partner_memberships_partner_id_invite_email_key"
  ON "ecosystem_partner_memberships"("partnerId", "invite_email");
CREATE INDEX "ecosystem_partner_memberships_user_id_status_idx"
  ON "ecosystem_partner_memberships"("user_id", "status");
CREATE INDEX "ecosystem_partner_memberships_partner_id_status_role_idx"
  ON "ecosystem_partner_memberships"("partnerId", "status", "role");
CREATE INDEX "ecosystem_partner_memberships_status_invitation_expires_at_idx"
  ON "ecosystem_partner_memberships"("status", "invitation_expires_at");
CREATE INDEX "ecosystem_partner_change_requests_partner_id_status_created_at_idx"
  ON "ecosystem_partner_change_requests"("partner_id", "status", "created_at");
CREATE INDEX "ecosystem_partner_change_requests_submitted_by_user_id_idx"
  ON "ecosystem_partner_change_requests"("submitted_by_user_id");

ALTER TABLE "ecosystem_partner_memberships"
  ADD CONSTRAINT "ecosystem_partner_memberships_partnerId_fkey"
  FOREIGN KEY ("partnerId") REFERENCES "EcosystemPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ecosystem_partner_memberships"
  ADD CONSTRAINT "ecosystem_partner_memberships_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ecosystem_partner_memberships"
  ADD CONSTRAINT "ecosystem_partner_memberships_invited_by_user_id_fkey"
  FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ecosystem_partner_change_requests"
  ADD CONSTRAINT "ecosystem_partner_change_requests_partner_id_fkey"
  FOREIGN KEY ("partner_id") REFERENCES "EcosystemPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ecosystem_partner_change_requests"
  ADD CONSTRAINT "ecosystem_partner_change_requests_submitted_by_user_id_fkey"
  FOREIGN KEY ("submitted_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ecosystem_partner_change_requests"
  ADD CONSTRAINT "ecosystem_partner_change_requests_reviewed_by_user_id_fkey"
  FOREIGN KEY ("reviewed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leads"
  ADD COLUMN "request_key" TEXT,
  ADD COLUMN "request_payload_hash" TEXT,
  ADD COLUMN "consent_to_share" BOOLEAN,
  ADD COLUMN "consent_recorded_at" TIMESTAMP(3);
CREATE UNIQUE INDEX "leads_request_key_key" ON "leads"("request_key");

INSERT INTO "EcosystemCategory"
  ("id", "slug", "title", "description", "heroImage", "metaTitle", "metaDescription", "priorityOrder", "isActive", "createdAt", "updatedAt")
VALUES
  ('ecosystem-home-loans-finance', 'home-loans-finance', 'Home Loans & Finance', '', '', 'Home Loans & Finance | MillionFlats Ecosystem', '', 1, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ecosystem-legal-documentation', 'legal-documentation', 'Legal & Documentation', '', '', 'Legal & Documentation | MillionFlats Ecosystem', '', 2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ecosystem-property-insurance', 'property-insurance', 'Property Insurance', '', '', 'Property Insurance | MillionFlats Ecosystem', '', 3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ecosystem-interior-design-renovation', 'interior-design-renovation', 'Interior Design & Renovation', '', '', 'Interior Design & Renovation | MillionFlats Ecosystem', '', 4, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ecosystem-packers-movers', 'packers-movers', 'Packers & Movers', '', '', 'Packers & Movers | MillionFlats Ecosystem', '', 5, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ecosystem-property-management', 'property-management', 'Property Management', '', '', 'Property Management | MillionFlats Ecosystem', '', 6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ecosystem-vastu-feng-shui', 'vastu-feng-shui', 'Vastu / Feng Shui Consultants', '', '', 'Vastu / Feng Shui Consultants | MillionFlats Ecosystem', '', 7, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ecosystem-tiles-surface-finishing', 'tiles-surface-finishing', 'Tiles & Surface Finishing', '', '', 'Tiles & Surface Finishing | MillionFlats Ecosystem', '', 8, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ecosystem-hardware-architectural-fittings', 'hardware-architectural-fittings', 'Hardware & Architectural Fittings', '', '', 'Hardware & Architectural Fittings | MillionFlats Ecosystem', '', 9, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ecosystem-cement-structural', 'cement-structural', 'Cement & Structural', '', '', 'Cement & Structural | MillionFlats Ecosystem', '', 10, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ecosystem-smart-home-automation', 'smart-home-automation', 'Smart Home & Automation', '', '', 'Smart Home & Automation | MillionFlats Ecosystem', '', 11, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ecosystem-technology-partners', 'technology-partners', 'Technology Partners', '', '', 'Technology Partners | MillionFlats Ecosystem', '', 12, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;
