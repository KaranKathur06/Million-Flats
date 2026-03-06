-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('USER', 'AGENT', 'MODERATOR', 'VERIFIER', 'ADMIN', 'SUPERADMIN');
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "Role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'USER';
COMMIT;

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AgentVerificationDocumentType" ADD VALUE 'PAN';
ALTER TYPE "AgentVerificationDocumentType" ADD VALUE 'AADHAR';
ALTER TYPE "AgentVerificationDocumentType" ADD VALUE 'PASSPORT';
ALTER TYPE "AgentVerificationDocumentType" ADD VALUE 'RERA_CERTIFICATE';
ALTER TYPE "AgentVerificationDocumentType" ADD VALUE 'BROKER_LICENSE';
ALTER TYPE "AgentVerificationDocumentType" ADD VALUE 'GST_CERTIFICATE';
ALTER TYPE "AgentVerificationDocumentType" ADD VALUE 'ADDRESS_PROOF';
ALTER TYPE "AgentVerificationDocumentType" ADD VALUE 'SELFIE_ID';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AgentVerificationStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "AgentVerificationStatus" ADD VALUE 'UNDER_REVIEW';
ALTER TYPE "AgentVerificationStatus" ADD VALUE 'FLAGGED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_AGENT_UNDER_REVIEW';
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_AGENT_REJECTED';
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_AGENT_FLAGGED';
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_DOCUMENT_APPROVED';
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_DOCUMENT_REJECTED';

-- AlterTable
ALTER TABLE "agents" ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "risk_score" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "agent_documents" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "document_type" "AgentVerificationDocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_verification_progress" (
    "id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "identity_completed" BOOLEAN NOT NULL DEFAULT false,
    "documents_uploaded" BOOLEAN NOT NULL DEFAULT false,
    "business_info_completed" BOOLEAN NOT NULL DEFAULT false,
    "profile_completed" BOOLEAN NOT NULL DEFAULT false,
    "completion_percentage" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_verification_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_documents_agent_id_idx" ON "agent_documents"("agent_id");

-- CreateIndex
CREATE INDEX "agent_documents_status_idx" ON "agent_documents"("status");

-- CreateIndex
CREATE INDEX "agent_documents_document_type_idx" ON "agent_documents"("document_type");

-- CreateIndex
CREATE UNIQUE INDEX "agent_verification_progress_agent_id_key" ON "agent_verification_progress"("agent_id");

-- CreateIndex
CREATE INDEX "agents_verification_status_idx" ON "agents"("verification_status");

-- CreateIndex
CREATE INDEX "agents_risk_score_idx" ON "agents"("risk_score");

-- AddForeignKey
ALTER TABLE "agent_documents" ADD CONSTRAINT "agent_documents_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_verification_progress" ADD CONSTRAINT "agent_verification_progress_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

