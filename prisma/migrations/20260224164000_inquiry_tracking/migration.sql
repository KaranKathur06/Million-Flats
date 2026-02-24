-- Add inquiry tracking + response performance fields
ALTER TABLE "agents" ADD COLUMN IF NOT EXISTS "responded_leads" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS "inquiries" (
  "id" TEXT PRIMARY KEY,
  "property_id" TEXT NOT NULL,
  "agent_id" TEXT NOT NULL,
  "user_id" TEXT,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "responded_at" TIMESTAMPTZ
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inquiries_agent_id_fkey'
  ) THEN
    ALTER TABLE "inquiries"
      ADD CONSTRAINT "inquiries_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inquiries_property_id_fkey'
  ) THEN
    ALTER TABLE "inquiries"
      ADD CONSTRAINT "inquiries_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "manual_properties"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inquiries_user_id_fkey'
  ) THEN
    ALTER TABLE "inquiries"
      ADD CONSTRAINT "inquiries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "inquiries_agent_id_idx" ON "inquiries" ("agent_id");
CREATE INDEX IF NOT EXISTS "inquiries_property_id_idx" ON "inquiries" ("property_id");
CREATE INDEX IF NOT EXISTS "inquiries_user_id_idx" ON "inquiries" ("user_id");
CREATE INDEX IF NOT EXISTS "inquiries_status_idx" ON "inquiries" ("status");
CREATE INDEX IF NOT EXISTS "inquiries_created_at_idx" ON "inquiries" ("created_at");
