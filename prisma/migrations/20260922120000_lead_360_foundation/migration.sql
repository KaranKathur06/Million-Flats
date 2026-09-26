DO $$ BEGIN
  CREATE TYPE "LeadPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LeadActivityType" AS ENUM ('CREATED', 'STATUS_CHANGED', 'ASSIGNED', 'NOTE_ADDED', 'FOLLOW_UP_SCHEDULED', 'WHATSAPP_INITIATED', 'DOCUMENTS_REQUESTED', 'DOCUMENTS_SUBMITTED', 'DOCUMENTS_VERIFIED', 'CONVERTED', 'CLOSED', 'REOPENED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "leads"
  ADD COLUMN IF NOT EXISTS "priority" "LeadPriority" NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN IF NOT EXISTS "property_id" TEXT,
  ADD COLUMN IF NOT EXISTS "agent_id" TEXT,
  ADD COLUMN IF NOT EXISTS "source_url" TEXT,
  ADD COLUMN IF NOT EXISTS "source_type" TEXT,
  ADD COLUMN IF NOT EXISTS "display_price_at_inquiry" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "base_price_at_inquiry" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "base_currency_at_inquiry" TEXT,
  ADD COLUMN IF NOT EXISTS "display_currency_at_inquiry" TEXT;

CREATE INDEX IF NOT EXISTS "leads_property_id_idx" ON "leads"("property_id");
CREATE INDEX IF NOT EXISTS "leads_agent_id_idx" ON "leads"("agent_id");

CREATE TABLE IF NOT EXISTS "lead_activities" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "type" "LeadActivityType" NOT NULL,
  "summary" TEXT NOT NULL,
  "metadata" JSONB,
  "actor_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_activities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lead_activities_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "lead_activities_lead_id_created_at_idx" ON "lead_activities"("lead_id", "created_at");

CREATE TABLE IF NOT EXISTS "lead_notes" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "author_id" TEXT,
  "text" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lead_notes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "lead_notes_lead_id_created_at_idx" ON "lead_notes"("lead_id", "created_at");

CREATE TABLE IF NOT EXISTS "lead_follow_ups" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "scheduled_at" TIMESTAMP(3) NOT NULL,
  "assigned_to" TEXT,
  "notes" TEXT,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_follow_ups_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "lead_follow_ups_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "lead_follow_ups_lead_id_scheduled_at_idx" ON "lead_follow_ups"("lead_id", "scheduled_at");
CREATE INDEX IF NOT EXISTS "lead_follow_ups_assigned_to_scheduled_at_idx" ON "lead_follow_ups"("assigned_to", "scheduled_at");