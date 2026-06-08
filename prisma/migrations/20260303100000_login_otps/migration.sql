-- Create login_otps table for step-up authentication during login
CREATE TABLE IF NOT EXISTS "login_otps" (
  "id" text NOT NULL,
  "email" text NOT NULL,
  "role" text NOT NULL,
  "code_hash" text NOT NULL,
  "attempts" integer NOT NULL DEFAULT 0,
  "expires_at" timestamp(3) NOT NULL,
  "consumed" boolean NOT NULL DEFAULT false,
  "login_token_hash" text,
  "login_token_expires_at" timestamp(3),
  "used_at" timestamp(3),
  "ip_address" text,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "login_otps_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "login_otps_email_idx" ON "login_otps"("email");
CREATE INDEX IF NOT EXISTS "login_otps_role_idx" ON "login_otps"("role");
CREATE INDEX IF NOT EXISTS "login_otps_expires_at_idx" ON "login_otps"("expires_at");
CREATE INDEX IF NOT EXISTS "login_otps_consumed_idx" ON "login_otps"("consumed");
CREATE INDEX IF NOT EXISTS "login_otps_login_token_expires_at_idx" ON "login_otps"("login_token_expires_at");
CREATE INDEX IF NOT EXISTS "login_otps_used_at_idx" ON "login_otps"("used_at");
