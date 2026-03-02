-- Create enums for agent subscriptions
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgentSubscriptionPlan') THEN
    CREATE TYPE "AgentSubscriptionPlan" AS ENUM ('BASIC', 'PROFESSIONAL', 'PREMIUM');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgentSubscriptionStatus') THEN
    CREATE TYPE "AgentSubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'CANCELLED', 'EXPIRED');
  END IF;
END $$;

-- Create agent_subscriptions table
CREATE TABLE IF NOT EXISTS "agent_subscriptions" (
  "id" text NOT NULL,
  "agent_id" text NOT NULL,
  "plan" "AgentSubscriptionPlan" NOT NULL DEFAULT 'BASIC',
  "status" "AgentSubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
  "start_date" timestamp(3),
  "end_date" timestamp(3),
  "trial_ends_at" timestamp(3),
  "cancelled_at" timestamp(3),
  "listings_limit" integer,
  "lead_limit" integer,
  "verix_access_level" integer,
  "provider" text,
  "provider_subscription_id" text,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL,

  CONSTRAINT "agent_subscriptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "agent_subscriptions_agent_id_key" UNIQUE ("agent_id"),
  CONSTRAINT "agent_subscriptions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "agent_subscriptions_status_idx" ON "agent_subscriptions"("status");
CREATE INDEX IF NOT EXISTS "agent_subscriptions_plan_idx" ON "agent_subscriptions"("plan");
