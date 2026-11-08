CREATE TYPE "VideoReelModerationStatus" AS ENUM (
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'REJECTED',
  'ARCHIVED'
);

CREATE TYPE "VideoCampaignStatus" AS ENUM (
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED_AWAITING_PAYMENT',
  'SCHEDULED',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'REJECTED',
  'CANCELLED'
);

CREATE TYPE "VideoCampaignOrderStatus" AS ENUM (
  'CREATING',
  'CREATED',
  'CAPTURED',
  'FAILED',
  'REFUNDED'
);

CREATE TYPE "VideoCampaignEventType" AS ENUM (
  'IMPRESSION',
  'START',
  'QUALIFIED_VIEW',
  'COMPLETE',
  'CLICK',
  'ENGAGEMENT'
);

ALTER TABLE "payment_webhooks"
ADD COLUMN "video_campaign_order_id" TEXT;

CREATE TABLE "video_reels" (
  "id" TEXT NOT NULL,
  "owner_user_id" TEXT NOT NULL,
  "project_id" TEXT,
  "title" VARCHAR(120) NOT NULL,
  "caption" VARCHAR(2000),
  "media_object_key" TEXT NOT NULL,
  "poster_object_key" TEXT,
  "media_mime_type" VARCHAR(80) NOT NULL,
  "media_size_bytes" INTEGER NOT NULL,
  "duration_ms" INTEGER NOT NULL,
  "media_verified_at" TIMESTAMP(3),
  "media_deleted_at" TIMESTAMP(3),
  "moderation_status" "VideoReelModerationStatus" NOT NULL DEFAULT 'DRAFT',
  "reviewer_user_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "rejection_reason" VARCHAR(500),
  "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "video_reels_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "video_reels_media_size_bytes_check" CHECK ("media_size_bytes" > 0),
  CONSTRAINT "video_reels_duration_ms_check" CHECK ("duration_ms" > 0 AND "duration_ms" <= 60000),
  CONSTRAINT "video_reels_media_mime_type_check" CHECK ("media_mime_type" IN ('video/mp4', 'video/webm'))
);

CREATE TABLE "video_campaign_packages" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "duration_days" INTEGER NOT NULL,
  "allocation_bps" INTEGER NOT NULL,
  "amount" INTEGER NOT NULL,
  "tax_rate_bps" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'INR',
  "daily_impression_cap" INTEGER,
  "total_impression_cap" INTEGER,
  "frequency_cap" INTEGER NOT NULL DEFAULT 1,
  "version" INTEGER NOT NULL DEFAULT 1,
  "is_active" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "video_campaign_packages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "video_campaign_packages_duration_days_check" CHECK ("duration_days" > 0),
  CONSTRAINT "video_campaign_packages_allocation_bps_check" CHECK ("allocation_bps" > 0 AND "allocation_bps" <= 10000),
  CONSTRAINT "video_campaign_packages_amount_check" CHECK ("amount" >= 0),
  CONSTRAINT "video_campaign_packages_tax_rate_bps_check" CHECK ("tax_rate_bps" >= 0 AND "tax_rate_bps" <= 10000),
  CONSTRAINT "video_campaign_packages_caps_check" CHECK (("daily_impression_cap" IS NULL OR "daily_impression_cap" > 0) AND ("total_impression_cap" IS NULL OR "total_impression_cap" > 0)),
  CONSTRAINT "video_campaign_packages_frequency_cap_check" CHECK ("frequency_cap" > 0),
  CONSTRAINT "video_campaign_packages_version_check" CHECK ("version" > 0)
);

CREATE TABLE "video_campaigns" (
  "id" TEXT NOT NULL,
  "owner_user_id" TEXT NOT NULL,
  "created_by_user_id" TEXT,
  "reel_id" TEXT NOT NULL,
  "package_id" TEXT,
  "package_snapshot" JSONB,
  "status" "VideoCampaignStatus" NOT NULL DEFAULT 'DRAFT',
  "requested_start_at" TIMESTAMP(3),
  "approved_start_at" TIMESTAMP(3),
  "approved_end_at" TIMESTAMP(3),
  "allocation_bps" INTEGER NOT NULL,
  "admin_priority" INTEGER NOT NULL DEFAULT 0,
  "daily_impression_cap" INTEGER,
  "total_impression_cap" INTEGER,
  "frequency_cap" INTEGER NOT NULL DEFAULT 1,
  "requested_destination" VARCHAR(2048),
  "approved_destination" VARCHAR(2048),
  "reviewer_user_id" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "rejection_reason" VARCHAR(500),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "video_campaigns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "video_campaigns_allocation_bps_check" CHECK ("allocation_bps" > 0 AND "allocation_bps" <= 10000),
  CONSTRAINT "video_campaigns_frequency_cap_check" CHECK ("frequency_cap" > 0),
  CONSTRAINT "video_campaigns_caps_check" CHECK (("daily_impression_cap" IS NULL OR "daily_impression_cap" > 0) AND ("total_impression_cap" IS NULL OR "total_impression_cap" > 0)),
  CONSTRAINT "video_campaigns_schedule_check" CHECK ("approved_start_at" IS NULL OR "approved_end_at" IS NULL OR "approved_end_at" > "approved_start_at")
);

CREATE TABLE "video_campaign_orders" (
  "id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "purchaser_user_id" TEXT NOT NULL,
  "status" "VideoCampaignOrderStatus" NOT NULL DEFAULT 'CREATING',
  "idempotency_key" TEXT NOT NULL,
  "provider_receipt" TEXT NOT NULL,
  "razorpay_order_id" TEXT,
  "razorpay_payment_id" TEXT,
  "razorpay_signature" TEXT,
  "amount" INTEGER NOT NULL,
  "tax_amount" INTEGER NOT NULL,
  "total_amount" INTEGER NOT NULL,
  "tax_rate_bps" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL,
  "last_failure" VARCHAR(500),
  "paid_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "video_campaign_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "video_campaign_orders_amounts_check" CHECK ("amount" >= 0 AND "tax_amount" >= 0 AND "total_amount" = "amount" + "tax_amount"),
  CONSTRAINT "video_campaign_orders_tax_rate_bps_check" CHECK ("tax_rate_bps" >= 0 AND "tax_rate_bps" <= 10000)
);

CREATE TABLE "video_campaign_events" (
  "id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "delivery_token_id" TEXT NOT NULL,
  "event_type" "VideoCampaignEventType" NOT NULL,
  "viewer_hmac" VARCHAR(64) NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "video_campaign_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "video_campaign_daily_metrics" (
  "id" TEXT NOT NULL,
  "campaign_id" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "impressions" INTEGER NOT NULL DEFAULT 0,
  "starts" INTEGER NOT NULL DEFAULT 0,
  "qualified_views" INTEGER NOT NULL DEFAULT 0,
  "completions" INTEGER NOT NULL DEFAULT 0,
  "clicks" INTEGER NOT NULL DEFAULT 0,
  "engagements" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "video_campaign_daily_metrics_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "video_campaign_daily_metrics_counts_check" CHECK ("impressions" >= 0 AND "starts" >= 0 AND "qualified_views" >= 0 AND "completions" >= 0 AND "clicks" >= 0 AND "engagements" >= 0)
);

CREATE TABLE "video_rotation_states" (
  "day" DATE NOT NULL,
  "opportunity_sequence" INTEGER NOT NULL DEFAULT 0,
  "allocation_deficits" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "video_rotation_states_pkey" PRIMARY KEY ("day"),
  CONSTRAINT "video_rotation_states_opportunity_sequence_check" CHECK ("opportunity_sequence" >= 0)
);

CREATE TABLE "video_campaign_settings" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "min_feed_card_interval" INTEGER NOT NULL DEFAULT 4,
  "max_allocation_bps" INTEGER NOT NULL DEFAULT 10000,
  "default_frequency_cap" INTEGER NOT NULL DEFAULT 1,
  "scheduling_horizon_days" INTEGER NOT NULL DEFAULT 90,
  "default_daily_impression_cap" INTEGER,
  "default_total_impression_cap" INTEGER,
  "updated_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "video_campaign_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "video_campaign_settings_min_feed_card_interval_check" CHECK ("min_feed_card_interval" >= 4),
  CONSTRAINT "video_campaign_settings_max_allocation_bps_check" CHECK ("max_allocation_bps" > 0 AND "max_allocation_bps" <= 10000),
  CONSTRAINT "video_campaign_settings_default_frequency_cap_check" CHECK ("default_frequency_cap" > 0),
  CONSTRAINT "video_campaign_settings_scheduling_horizon_days_check" CHECK ("scheduling_horizon_days" > 0),
  CONSTRAINT "video_campaign_settings_caps_check" CHECK (("default_daily_impression_cap" IS NULL OR "default_daily_impression_cap" > 0) AND ("default_total_impression_cap" IS NULL OR "default_total_impression_cap" > 0))
);

CREATE TABLE "video_campaign_audit_events" (
  "id" TEXT NOT NULL,
  "actor_user_id" TEXT,
  "entity_type" VARCHAR(24) NOT NULL,
  "entity_id" TEXT NOT NULL,
  "action" VARCHAR(40) NOT NULL,
  "before_state" JSONB,
  "after_state" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "video_campaign_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "video_rotation_assignments" (
  "id" TEXT NOT NULL,
  "day" DATE NOT NULL,
  "sequence" INTEGER NOT NULL,
  "campaign_id" TEXT,
  "advertiser_user_id" TEXT,
  "viewer_hmac" VARCHAR(64),
  "delivery_token_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "video_rotation_assignments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "video_rotation_assignments_sequence_check" CHECK ("sequence" > 0)
);

CREATE UNIQUE INDEX "video_reels_media_object_key_key" ON "video_reels"("media_object_key");
CREATE UNIQUE INDEX "video_reels_poster_object_key_key" ON "video_reels"("poster_object_key");
CREATE INDEX "video_reels_owner_user_id_moderation_status_created_at_idx" ON "video_reels"("owner_user_id", "moderation_status", "created_at");
CREATE INDEX "video_reels_moderation_status_created_at_idx" ON "video_reels"("moderation_status", "created_at");
CREATE INDEX "video_reels_project_id_idx" ON "video_reels"("project_id");

CREATE UNIQUE INDEX "video_campaign_packages_slug_key" ON "video_campaign_packages"("slug");
CREATE INDEX "video_campaign_packages_is_active_amount_idx" ON "video_campaign_packages"("is_active", "amount");

CREATE INDEX "video_campaigns_owner_user_id_status_created_at_idx" ON "video_campaigns"("owner_user_id", "status", "created_at");
CREATE INDEX "video_campaigns_status_approved_start_at_approved_end_at_idx" ON "video_campaigns"("status", "approved_start_at", "approved_end_at");
CREATE INDEX "video_campaigns_reel_id_idx" ON "video_campaigns"("reel_id");

CREATE UNIQUE INDEX "video_campaign_orders_campaign_id_key" ON "video_campaign_orders"("campaign_id");
CREATE UNIQUE INDEX "video_campaign_orders_idempotency_key_key" ON "video_campaign_orders"("idempotency_key");
CREATE UNIQUE INDEX "video_campaign_orders_provider_receipt_key" ON "video_campaign_orders"("provider_receipt");
CREATE UNIQUE INDEX "video_campaign_orders_razorpay_order_id_key" ON "video_campaign_orders"("razorpay_order_id");
CREATE UNIQUE INDEX "video_campaign_orders_razorpay_payment_id_key" ON "video_campaign_orders"("razorpay_payment_id");
CREATE INDEX "video_campaign_orders_purchaser_user_id_status_created_at_idx" ON "video_campaign_orders"("purchaser_user_id", "status", "created_at");
CREATE INDEX "video_campaign_orders_status_created_at_idx" ON "video_campaign_orders"("status", "created_at");

CREATE UNIQUE INDEX "video_campaign_events_event_id_key" ON "video_campaign_events"("event_id");
CREATE UNIQUE INDEX "video_campaign_events_delivery_token_id_event_type_key" ON "video_campaign_events"("delivery_token_id", "event_type");
CREATE INDEX "video_campaign_events_campaign_id_event_type_created_at_idx" ON "video_campaign_events"("campaign_id", "event_type", "created_at");
CREATE INDEX "video_campaign_events_created_at_idx" ON "video_campaign_events"("created_at");

CREATE UNIQUE INDEX "video_campaign_daily_metrics_campaign_id_date_key" ON "video_campaign_daily_metrics"("campaign_id", "date");
CREATE INDEX "video_campaign_daily_metrics_date_idx" ON "video_campaign_daily_metrics"("date");

CREATE UNIQUE INDEX "video_rotation_assignments_day_sequence_key" ON "video_rotation_assignments"("day", "sequence");
CREATE UNIQUE INDEX "video_rotation_assignments_delivery_token_id_key" ON "video_rotation_assignments"("delivery_token_id");
CREATE INDEX "video_rotation_assignments_day_advertiser_user_id_sequence_idx" ON "video_rotation_assignments"("day", "advertiser_user_id", "sequence");
CREATE INDEX "video_rotation_assignments_campaign_id_day_idx" ON "video_rotation_assignments"("campaign_id", "day");
CREATE INDEX "video_rotation_assignments_campaign_id_viewer_hmac_created_at_idx" ON "video_rotation_assignments"("campaign_id", "viewer_hmac", "created_at");
CREATE INDEX "video_campaign_audit_events_entity_type_entity_id_created_at_idx" ON "video_campaign_audit_events"("entity_type", "entity_id", "created_at");
CREATE INDEX "video_campaign_audit_events_actor_user_id_created_at_idx" ON "video_campaign_audit_events"("actor_user_id", "created_at");

ALTER TABLE "payment_webhooks"
ADD CONSTRAINT "payment_webhooks_video_campaign_order_id_fkey"
FOREIGN KEY ("video_campaign_order_id") REFERENCES "video_campaign_orders"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "video_reels"
ADD CONSTRAINT "video_reels_owner_user_id_fkey"
FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "video_reels"
ADD CONSTRAINT "video_reels_project_id_fkey"
FOREIGN KEY ("project_id") REFERENCES "projects"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "video_reels"
ADD CONSTRAINT "video_reels_reviewer_user_id_fkey"
FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "video_campaigns"
ADD CONSTRAINT "video_campaigns_owner_user_id_fkey"
FOREIGN KEY ("owner_user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "video_campaigns"
ADD CONSTRAINT "video_campaigns_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "video_campaigns"
ADD CONSTRAINT "video_campaigns_reel_id_fkey"
FOREIGN KEY ("reel_id") REFERENCES "video_reels"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "video_campaigns"
ADD CONSTRAINT "video_campaigns_package_id_fkey"
FOREIGN KEY ("package_id") REFERENCES "video_campaign_packages"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "video_campaigns"
ADD CONSTRAINT "video_campaigns_reviewer_user_id_fkey"
FOREIGN KEY ("reviewer_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "video_campaign_orders"
ADD CONSTRAINT "video_campaign_orders_campaign_id_fkey"
FOREIGN KEY ("campaign_id") REFERENCES "video_campaigns"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "video_campaign_orders"
ADD CONSTRAINT "video_campaign_orders_purchaser_user_id_fkey"
FOREIGN KEY ("purchaser_user_id") REFERENCES "users"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "video_campaign_events"
ADD CONSTRAINT "video_campaign_events_campaign_id_fkey"
FOREIGN KEY ("campaign_id") REFERENCES "video_campaigns"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "video_campaign_daily_metrics"
ADD CONSTRAINT "video_campaign_daily_metrics_campaign_id_fkey"
FOREIGN KEY ("campaign_id") REFERENCES "video_campaigns"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "video_rotation_assignments"
ADD CONSTRAINT "video_rotation_assignments_campaign_id_fkey"
FOREIGN KEY ("campaign_id") REFERENCES "video_campaigns"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "video_rotation_assignments"
ADD CONSTRAINT "video_rotation_assignments_advertiser_user_id_fkey"
FOREIGN KEY ("advertiser_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "video_campaign_settings"
ADD CONSTRAINT "video_campaign_settings_updated_by_user_id_fkey"
FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "video_campaign_audit_events"
ADD CONSTRAINT "video_campaign_audit_events_actor_user_id_fkey"
FOREIGN KEY ("actor_user_id") REFERENCES "users"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
