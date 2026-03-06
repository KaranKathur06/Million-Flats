-- CreateEnum IF NOT EXISTS for DocumentStatus
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'DocumentStatus') THEN
        CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
END $$;

-- AlterEnum
DO $$ 
BEGIN
  ALTER TYPE "AgentVerificationDocumentType" ADD VALUE 'PAN';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN
  ALTER TYPE "AgentVerificationDocumentType" ADD VALUE 'AADHAR';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN
  ALTER TYPE "AgentVerificationDocumentType" ADD VALUE 'PASSPORT';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN
  ALTER TYPE "AgentVerificationDocumentType" ADD VALUE 'RERA_CERTIFICATE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN
  ALTER TYPE "AgentVerificationDocumentType" ADD VALUE 'BROKER_LICENSE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN
  ALTER TYPE "AgentVerificationDocumentType" ADD VALUE 'GST_CERTIFICATE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN
  ALTER TYPE "AgentVerificationDocumentType" ADD VALUE 'ADDRESS_PROOF';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN
  ALTER TYPE "AgentVerificationDocumentType" ADD VALUE 'SELFIE_ID';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterEnum AgentVerificationStatus
DO $$ 
BEGIN
  ALTER TYPE "AgentVerificationStatus" ADD VALUE 'SUBMITTED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN
  ALTER TYPE "AgentVerificationStatus" ADD VALUE 'UNDER_REVIEW';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN
  ALTER TYPE "AgentVerificationStatus" ADD VALUE 'FLAGGED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- AlterEnum AuditAction
DO $$ 
BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_AGENT_UNDER_REVIEW';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_AGENT_REJECTED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_AGENT_FLAGGED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_DOCUMENT_APPROVED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ 
BEGIN
  ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_DOCUMENT_REJECTED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- AlterTable
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3) NULL,
ADD COLUMN IF NOT EXISTS "approved_by" TEXT NULL,
ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT NULL,
ADD COLUMN IF NOT EXISTS "risk_score" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "agent_documents" (
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
CREATE TABLE IF NOT EXISTS "agent_verification_progress" (
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

-- Indexes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'agent_documents_agent_id_idx') THEN
    CREATE INDEX "agent_documents_agent_id_idx" ON "agent_documents"("agent_id");
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'agent_documents_status_idx') THEN
    CREATE INDEX "agent_documents_status_idx" ON "agent_documents"("status");
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'agent_documents_document_type_idx') THEN
    CREATE INDEX "agent_documents_document_type_idx" ON "agent_documents"("document_type");
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'agent_verification_progress_agent_id_key') THEN
    CREATE UNIQUE INDEX "agent_verification_progress_agent_id_key" ON "agent_verification_progress"("agent_id");
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'agents_verification_status_idx') THEN
    CREATE INDEX "agents_verification_status_idx" ON "agents"("verification_status");
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'agents_risk_score_idx') THEN
    CREATE INDEX "agents_risk_score_idx" ON "agents"("risk_score");
  END IF;
END $$;

-- AddForeignKey (Ignoring existing keys is complex but we can try DROP then ADD)
ALTER TABLE "agent_documents" DROP CONSTRAINT IF EXISTS "agent_documents_agent_id_fkey";
ALTER TABLE "agent_documents" ADD CONSTRAINT "agent_documents_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_verification_progress" DROP CONSTRAINT IF EXISTS "agent_verification_progress_agent_id_fkey";
ALTER TABLE "agent_verification_progress" ADD CONSTRAINT "agent_verification_progress_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
