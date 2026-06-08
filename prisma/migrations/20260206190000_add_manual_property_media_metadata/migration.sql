-- AlterTable
ALTER TABLE IF EXISTS "manual_property_media" ADD COLUMN IF NOT EXISTS "s3_key" TEXT;
ALTER TABLE IF EXISTS "manual_property_media" ADD COLUMN IF NOT EXISTS "mime_type" TEXT;
ALTER TABLE IF EXISTS "manual_property_media" ADD COLUMN IF NOT EXISTS "size_bytes" INTEGER;
