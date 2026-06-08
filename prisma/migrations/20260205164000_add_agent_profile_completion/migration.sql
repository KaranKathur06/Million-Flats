-- AlterTable
ALTER TABLE "agents" ADD COLUMN "profile_completion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "agents" ADD COLUMN "profile_completion_updated_at" TIMESTAMP(3);
