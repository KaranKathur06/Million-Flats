CREATE TYPE "ImportEntityType" AS ENUM ('PROPERTY');
CREATE TYPE "ImportOperation" AS ENUM ('CREATE', 'UPDATE', 'UPSERT');
CREATE TYPE "ImportMode" AS ENUM ('STRICT', 'PARTIAL');
CREATE TYPE "ImportBatchStatus" AS ENUM (
  'UPLOADED', 'ANALYZING', 'READY_FOR_REVIEW', 'MAPPING_REVIEW',
  'NORMALIZING', 'VALIDATING', 'DUPLICATE_REVIEW', 'READY_TO_COMMIT',
  'COMMITTING', 'COMMITTED', 'PARTIALLY_COMMITTED', 'FAILED', 'RETRYING', 'CANCELLED'
);
CREATE TYPE "ImportRecordStatus" AS ENUM (
  'DISCOVERED', 'NORMALIZED', 'READY', 'WARNING', 'ERROR',
  'DUPLICATE_REVIEW', 'STAGED', 'COMMITTED', 'SKIPPED'
);
CREATE TYPE "ImportIssueSeverity" AS ENUM ('WARNING', 'ERROR');
CREATE TYPE "ImportIssueResolutionState" AS ENUM ('OPEN', 'RESOLVED', 'IGNORED');
CREATE TYPE "ImportMappingStatus" AS ENUM ('ACCEPTED', 'REVIEW', 'IGNORED');

CREATE TABLE "import_batches" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "entity_type" "ImportEntityType" NOT NULL,
  "operation" "ImportOperation" NOT NULL,
  "mode" "ImportMode" NOT NULL,
  "status" "ImportBatchStatus" NOT NULL DEFAULT 'UPLOADED',
  "original_file_name" TEXT NOT NULL,
  "format" TEXT NOT NULL,
  "mime_type" TEXT NOT NULL,
  "byte_size" INTEGER NOT NULL,
  "checksum" VARCHAR(128) NOT NULL,
  "source_provider" TEXT,
  "source_profile_key" TEXT,
  "adapter_version" INTEGER NOT NULL,
  "mapping_version" INTEGER NOT NULL DEFAULT 1,
  "uploaded_by_user_id" TEXT NOT NULL,
  "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "started_at" TIMESTAMP(3),
  "completed_at" TIMESTAMP(3),
  "cancelled_at" TIMESTAMP(3),
  "cancelled_by_user_id" TEXT,
  "total_records" INTEGER NOT NULL DEFAULT 0,
  "ready_count" INTEGER NOT NULL DEFAULT 0,
  "warning_count" INTEGER NOT NULL DEFAULT 0,
  "error_count" INTEGER NOT NULL DEFAULT 0,
  "duplicate_count" INTEGER NOT NULL DEFAULT 0,
  "created_count" INTEGER NOT NULL DEFAULT 0,
  "updated_count" INTEGER NOT NULL DEFAULT 0,
  "skipped_count" INTEGER NOT NULL DEFAULT 0,
  "failed_count" INTEGER NOT NULL DEFAULT 0,
  "failure_summary" JSONB,
  "source_file_reference" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "import_records" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "batch_id" TEXT NOT NULL,
  "source_record_id" TEXT NOT NULL,
  "source_row" INTEGER,
  "source_path" TEXT,
  "raw_payload" JSONB,
  "raw_payload_reference" TEXT,
  "normalized_payload" JSONB,
  "canonical_payload" JSONB,
  "mapping_version" INTEGER NOT NULL DEFAULT 1,
  "overall_confidence" DOUBLE PRECISION,
  "status" "ImportRecordStatus" NOT NULL DEFAULT 'DISCOVERED',
  "target_entity_type" "ImportEntityType",
  "target_entity_id" TEXT,
  "manual_property_id" TEXT,
  "source_provider" TEXT,
  "source_url" TEXT,
  "source_listing_id" TEXT,
  "ownership_policy" TEXT,
  "duplicate_class" TEXT,
  "duplicate_metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "import_records_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "import_records_manual_property_id_fkey" FOREIGN KEY ("manual_property_id") REFERENCES "manual_properties"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "import_records_batch_source_record_key" UNIQUE ("batch_id", "source_record_id")
);

CREATE TABLE "import_mappings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "batch_id" TEXT NOT NULL,
  "source_path" TEXT NOT NULL,
  "canonical_field" TEXT NOT NULL,
  "status" "ImportMappingStatus" NOT NULL DEFAULT 'REVIEW',
  "confidence" DOUBLE PRECISION,
  "transform_version" TEXT,
  "mapping_version" INTEGER NOT NULL DEFAULT 1,
  "snapshot" JSONB,
  "reviewed_by_user_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_mappings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "import_mappings_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "import_issues" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "batch_id" TEXT NOT NULL,
  "record_id" TEXT,
  "stage" TEXT NOT NULL,
  "severity" "ImportIssueSeverity" NOT NULL,
  "code" TEXT NOT NULL,
  "source_path" TEXT,
  "message" TEXT NOT NULL,
  "suggested_action" TEXT,
  "resolution_state" "ImportIssueResolutionState" NOT NULL DEFAULT 'OPEN',
  "resolved_by_user_id" TEXT,
  "resolved_at" TIMESTAMP(3),
  "resolution_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_issues_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "import_issues_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "import_issues_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "import_records"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "import_source_profiles" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "source_key" TEXT NOT NULL,
  "entity_type" "ImportEntityType" NOT NULL,
  "version" INTEGER NOT NULL,
  "mapping" JSONB NOT NULL,
  "normalization" JSONB,
  "relation_rules" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_source_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "import_source_profiles_source_entity_version_key" UNIQUE ("source_key", "entity_type", "version")
);

CREATE TABLE "import_request_idempotency" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "batch_id" TEXT NOT NULL,
  "idempotency_key" TEXT NOT NULL,
  "response" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_request_idempotency_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "import_request_idempotency_batch_key" UNIQUE ("batch_id", "idempotency_key"),
  CONSTRAINT "import_request_idempotency_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "import_batches_status_created_at_idx" ON "import_batches" ("status", "created_at");
CREATE INDEX "import_batches_entity_type_source_provider_idx" ON "import_batches" ("entity_type", "source_provider");
CREATE INDEX "import_batches_uploaded_by_user_id_idx" ON "import_batches" ("uploaded_by_user_id");
CREATE INDEX "import_records_batch_id_status_idx" ON "import_records" ("batch_id", "status");
CREATE INDEX "import_records_target_entity_type_target_entity_id_idx" ON "import_records" ("target_entity_type", "target_entity_id");
CREATE INDEX "import_records_manual_property_id_idx" ON "import_records" ("manual_property_id");
CREATE INDEX "import_records_source_provider_source_listing_id_idx" ON "import_records" ("source_provider", "source_listing_id");
CREATE INDEX "import_mappings_batch_id_mapping_version_idx" ON "import_mappings" ("batch_id", "mapping_version");
CREATE INDEX "import_mappings_batch_id_status_idx" ON "import_mappings" ("batch_id", "status");
CREATE INDEX "import_issues_batch_id_severity_resolution_state_idx" ON "import_issues" ("batch_id", "severity", "resolution_state");
CREATE INDEX "import_issues_record_id_idx" ON "import_issues" ("record_id");
CREATE INDEX "import_source_profiles_source_key_entity_type_is_active_idx" ON "import_source_profiles" ("source_key", "entity_type", "is_active");
CREATE INDEX "import_request_idempotency_created_at_idx" ON "import_request_idempotency" ("created_at");
