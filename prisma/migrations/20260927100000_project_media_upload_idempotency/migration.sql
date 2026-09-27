ALTER TABLE "project_media"
  ADD COLUMN "upload_id" TEXT,
  ADD COLUMN "file_name" TEXT,
  ADD COLUMN "mime_type" TEXT,
  ADD COLUMN "file_size" INTEGER;

CREATE UNIQUE INDEX "project_media_project_id_upload_id_key"
  ON "project_media"("project_id", "upload_id");

ALTER TABLE "project_floor_plans"
  ADD COLUMN "file_name" TEXT;