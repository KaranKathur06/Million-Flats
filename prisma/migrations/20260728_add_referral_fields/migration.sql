-- Migration: add referral_source and referral_details to users
-- Run this on your Postgres DB to add the new columns required by the updated schema

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_source VARCHAR(255);

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_details TEXT;

-- Optionally: index referral_source for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_source ON public.users (referral_source);
