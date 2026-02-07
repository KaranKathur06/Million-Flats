-- AlterTable
ALTER TABLE "manual_property_media" ADD COLUMN "s3_key" TEXT;
ALTER TABLE "manual_property_media" ADD COLUMN "mime_type" TEXT;
ALTER TABLE "manual_property_media" ADD COLUMN "size_bytes" INTEGER;
