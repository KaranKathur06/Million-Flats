-- Migration: 20261010120000_team_directory
-- Adds TeamAccess and TeamMember models for the private team directory feature.
-- This migration is additive only - no existing tables or columns are modified.

-- CreateEnum: TeamMemberStatus
CREATE TYPE "TeamMemberStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- AlterEnum: AuditEntityType — add TEAM_MEMBER and TEAM_ACCESS
ALTER TYPE "AuditEntityType" ADD VALUE 'TEAM_MEMBER';
ALTER TYPE "AuditEntityType" ADD VALUE 'TEAM_ACCESS';

-- AlterEnum: AuditAction — add team audit actions
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_ACCESS_GRANTED';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_ACCESS_REVOKED';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_MEMBER_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_MEMBER_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_MEMBER_ACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_MEMBER_DEACTIVATED';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_MEMBER_DELETED';
ALTER TYPE "AuditAction" ADD VALUE 'TEAM_MEMBER_REORDERED';

-- CreateTable: team_access
-- Explicit per-user authorization to view and manage the /team directory.
CREATE TABLE "team_access" (
    "id"               TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id"          TEXT         NOT NULL,
    "is_team_admin"    BOOLEAN      NOT NULL DEFAULT false,
    "is_revoked"       BOOLEAN      NOT NULL DEFAULT false,
    "granted_by_user_id" TEXT,
    "revoked_at"       TIMESTAMP(3),
    "revoked_note"     TEXT,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_access_pkey" PRIMARY KEY ("id")
);

-- CreateTable: team_members
-- Team member display profile. Separate from team_access so profiles can be
-- drafted without affecting authorization, and access can exist without a profile.
CREATE TABLE "team_members" (
    "id"            TEXT              NOT NULL DEFAULT gen_random_uuid()::text,
    "user_id"       TEXT,
    "display_name"  TEXT              NOT NULL,
    "designation"   TEXT,
    "bio"           TEXT,
    "image_url"     TEXT,
    "linkedin_url"  TEXT,
    "location"      TEXT,
    "display_order" INTEGER           NOT NULL DEFAULT 0,
    "status"        "TeamMemberStatus" NOT NULL DEFAULT 'DRAFT',
    "created_at"    TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"    TIMESTAMP(3)      NOT NULL,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: unique constraints
CREATE UNIQUE INDEX "team_access_user_id_key"   ON "team_access"("user_id");
CREATE UNIQUE INDEX "team_members_user_id_key"  ON "team_members"("user_id");

-- CreateIndex: performance indexes
CREATE INDEX "team_access_user_id_is_revoked_idx"  ON "team_access"("user_id", "is_revoked");
CREATE INDEX "team_access_is_revoked_idx"           ON "team_access"("is_revoked");
CREATE INDEX "team_access_is_team_admin_idx"        ON "team_access"("is_team_admin");
CREATE INDEX "team_members_status_display_order_idx" ON "team_members"("status", "display_order");
CREATE INDEX "team_members_user_id_idx"             ON "team_members"("user_id");

-- AddForeignKey: team_access.user_id → users.id (CASCADE on delete)
ALTER TABLE "team_access" ADD CONSTRAINT "team_access_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: team_access.granted_by_user_id → users.id (SET NULL on delete)
ALTER TABLE "team_access" ADD CONSTRAINT "team_access_granted_by_user_id_fkey"
    FOREIGN KEY ("granted_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: team_members.user_id → users.id (SET NULL on delete)
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
