CREATE TYPE "StorageCleanupStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED');

CREATE TABLE "storage_cleanup_jobs" (
  "id" TEXT NOT NULL,
  "storage_items" JSONB NOT NULL,
  "status" "StorageCleanupStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "locked_until" TIMESTAMP(3),
  "last_error" TEXT,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "storage_cleanup_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "storage_cleanup_jobs_status_available_at_idx"
  ON "storage_cleanup_jobs"("status", "available_at");