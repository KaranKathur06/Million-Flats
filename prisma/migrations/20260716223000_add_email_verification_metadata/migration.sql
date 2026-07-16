-- Add metadata columns to email_verification_tokens for token hashing and audit
ALTER TABLE "email_verification_tokens"
  ADD COLUMN IF NOT EXISTS "token_type" text,
  ADD COLUMN IF NOT EXISTS "code_length" integer,
  ADD COLUMN IF NOT EXISTS "attempts" integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "used_at" timestamp(3),
  ADD COLUMN IF NOT EXISTS "sent_at" timestamp(3),
  ADD COLUMN IF NOT EXISTS "ip" text,
  ADD COLUMN IF NOT EXISTS "user_agent" text;

-- Index for faster lookups by user and expiry
CREATE INDEX IF NOT EXISTS "email_verification_tokens_expires_at_idx" ON "email_verification_tokens"("expires_at");
