-- Add plan / subscription columns to existing databases (Supabase → SQL → New query → Run).
-- Skip any statement that already exists on your project.

CREATE TYPE "PlanTier" AS ENUM ('FREE', 'STARTER', 'GROWTH', 'ENTERPRISE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELED');

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "planTier" "PlanTier" NOT NULL DEFAULT 'FREE';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'NONE';
