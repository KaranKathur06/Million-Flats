-- AlterEnum: Add SUSPENDED to EcosystemPartnerStatus
ALTER TYPE "EcosystemPartnerStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';

-- AlterEnum: Add new audit actions
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_ECOSYSTEM_PARTNER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_ECOSYSTEM_PARTNER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_ECOSYSTEM_PARTNER_STATUS_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_ECOSYSTEM_PARTNER_VERIFICATION_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_ECOSYSTEM_PARTNER_FEATURED_CHANGED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_ECOSYSTEM_PARTNER_MEDIA_UPLOADED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_ECOSYSTEM_PARTNER_MEDIA_REPLACED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ADMIN_ECOSYSTEM_PARTNER_MEDIA_DELETED';

-- CreateEnum: EcosystemPartnerMediaType
DO $$ BEGIN
  CREATE TYPE "EcosystemPartnerMediaType" AS ENUM ('LOGO', 'COVER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterTable: Add experienceDisplay to EcosystemPartner
ALTER TABLE "EcosystemPartner" ADD COLUMN IF NOT EXISTS "experienceDisplay" TEXT;

-- CreateTable: EcosystemPartnerMedia
CREATE TABLE IF NOT EXISTS "EcosystemPartnerMedia" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "type" "EcosystemPartnerMediaType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "altText" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EcosystemPartnerMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: partnerId index
CREATE INDEX IF NOT EXISTS "EcosystemPartnerMedia_partnerId_idx" ON "EcosystemPartnerMedia"("partnerId");

-- CreateIndex: unique constraint on partnerId + type
DO $$ BEGIN
  ALTER TABLE "EcosystemPartnerMedia" ADD CONSTRAINT "EcosystemPartnerMedia_partnerId_type_key" UNIQUE ("partnerId", "type");
EXCEPTION
  WHEN duplicate_table THEN null;
  WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey: EcosystemPartnerMedia -> EcosystemPartner
DO $$ BEGIN
  ALTER TABLE "EcosystemPartnerMedia" ADD CONSTRAINT "EcosystemPartnerMedia_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "EcosystemPartner"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
