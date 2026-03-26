-- Add subscription / trial columns to existing databases (Supabase → SQL → New query → Run).
-- For removing legacy planTier / PlanTier, run migrate-plan-tiers-to-trial.sql.

DO $$ BEGIN CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'NONE';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);
