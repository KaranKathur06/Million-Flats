CREATE TABLE IF NOT EXISTS "lead_magnets" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "cta_label" TEXT NOT NULL DEFAULT 'Download Free Guide',
  "login_hint" TEXT NOT NULL DEFAULT 'Exclusive for registered users',
  "badge_text" TEXT,
  "file_s3_key" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "popup_enabled" BOOLEAN NOT NULL DEFAULT true,
  "popup_delay_seconds" INTEGER NOT NULL DEFAULT 4,
  "popup_scroll_percent" INTEGER NOT NULL DEFAULT 25,
  "cooldown_hours" INTEGER NOT NULL DEFAULT 24,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "lead_magnets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "lead_magnets_slug_key" ON "lead_magnets"("slug");
CREATE INDEX IF NOT EXISTS "lead_magnets_is_active_popup_enabled_sort_order_idx" ON "lead_magnets"("is_active", "popup_enabled", "sort_order");
CREATE INDEX IF NOT EXISTS "lead_magnets_created_at_idx" ON "lead_magnets"("created_at");

CREATE TABLE IF NOT EXISTS "lead_magnet_downloads" (
  "id" TEXT NOT NULL,
  "lead_magnet_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'popup',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_magnet_downloads_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lead_magnet_downloads_lead_magnet_id_idx" ON "lead_magnet_downloads"("lead_magnet_id");
CREATE INDEX IF NOT EXISTS "lead_magnet_downloads_user_id_idx" ON "lead_magnet_downloads"("user_id");
CREATE INDEX IF NOT EXISTS "lead_magnet_downloads_created_at_idx" ON "lead_magnet_downloads"("created_at");
CREATE INDEX IF NOT EXISTS "lead_magnet_downloads_source_idx" ON "lead_magnet_downloads"("source");

DO $$ BEGIN
  ALTER TABLE "lead_magnet_downloads"
    ADD CONSTRAINT "lead_magnet_downloads_lead_magnet_id_fkey"
    FOREIGN KEY ("lead_magnet_id") REFERENCES "lead_magnets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "lead_magnet_downloads"
    ADD CONSTRAINT "lead_magnet_downloads_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

INSERT INTO "lead_magnets" (
  "id",
  "slug",
  "title",
  "subtitle",
  "cta_label",
  "login_hint",
  "badge_text",
  "file_s3_key",
  "is_active",
  "popup_enabled",
  "popup_delay_seconds",
  "popup_scroll_percent",
  "cooldown_hours",
  "sort_order",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid()::text,
  'dubai-real-estate-investor-guide',
  'Dubai Real Estate Investor Guide (Free)',
  'Avoid 7 costly mistakes NRIs make and unlock practical market insights used by top investors.',
  'Download Free Guide',
  'Login required',
  'Exclusive for Registered Users',
  COALESCE(NULLIF(current_setting('app.lead_magnet_faq_key', true), ''), 'private/lead-magnets/dubai-investor-guide.pdf'),
  true,
  true,
  4,
  25,
  24,
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "lead_magnets" WHERE "slug" = 'dubai-real-estate-investor-guide'
);
