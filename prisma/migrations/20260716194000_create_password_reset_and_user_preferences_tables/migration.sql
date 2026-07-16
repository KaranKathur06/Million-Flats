-- Create password_reset_tokens and user_preferences tables for user auth and onboarding

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" text NOT NULL,
  "user_id" text NOT NULL,
  "token_hash" text NOT NULL,
  "expires_at" timestamp(3) NOT NULL,
  "used_at" timestamp(3),
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_expires_at_idx" ON "password_reset_tokens"("expires_at");
CREATE INDEX IF NOT EXISTS "password_reset_tokens_used_at_idx" ON "password_reset_tokens"("used_at");

CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" text NOT NULL,
  "user_id" text NOT NULL,
  "country" text NOT NULL,
  "city" text,
  "community" text,
  "filters" jsonb,
  "created_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_preferences_user_id_idx" ON "user_preferences"("user_id");
