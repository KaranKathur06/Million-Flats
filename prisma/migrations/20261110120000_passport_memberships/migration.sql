CREATE TYPE "PassportMembershipCategory" AS ENUM (
  'PROPERTY_BUYERS',
  'TENANTS_AND_RENTAL_OWNERS',
  'REAL_ESTATE_AGENTS',
  'REAL_ESTATE_AGENCIES',
  'REAL_ESTATE_DEVELOPERS',
  'ECOSYSTEM_PARTNERS'
);

CREATE TYPE "PassportMembershipStatus" AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'CANCELLED',
  'EXPIRED'
);

CREATE TABLE "passport_memberships" (
  "id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "category" "PassportMembershipCategory" NOT NULL,
  "membership_number" TEXT NOT NULL,
  "status" "PassportMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "issue_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activated_at" TIMESTAMP(3),
  "payment_reference" TEXT,
  "qr_code_value" TEXT NOT NULL,
  "notes" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "passport_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "passport_memberships_user_id_key" ON "passport_memberships"("user_id");
CREATE UNIQUE INDEX "passport_memberships_membership_number_key" ON "passport_memberships"("membership_number");
CREATE INDEX "passport_memberships_status_category_idx" ON "passport_memberships"("status", "category");
CREATE INDEX "passport_memberships_issue_date_idx" ON "passport_memberships"("issue_date");

ALTER TABLE "passport_memberships"
  ADD CONSTRAINT "passport_memberships_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
