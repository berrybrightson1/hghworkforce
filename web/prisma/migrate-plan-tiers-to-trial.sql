-- Replace PlanTier with trial-based access (Supabase → SQL → New query → paste → Run).
-- Run after deploying app code that expects trialEndsAt and no planTier.

-- 1) Trial end for everyone who doesn't have it yet (3 days from company creation).
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP(3);

UPDATE "Company"
SET "trialEndsAt" = "createdAt" + interval '3 days'
WHERE "trialEndsAt" IS NULL;

-- 2) Drop legacy plan tier column (and type).
ALTER TABLE "Company" DROP COLUMN IF EXISTS "planTier";

DROP TYPE IF EXISTS "PlanTier";
