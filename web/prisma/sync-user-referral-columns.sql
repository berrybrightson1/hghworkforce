-- Run once in Supabase: SQL → New query → paste → Run.
-- Fixes: Prisma P2022 "User.firstName does not exist" (and related new columns/tables).

-- Company
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "referralAccessUntil" TIMESTAMP(3);

-- User (required by current Prisma schema)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredByUserId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "pendingReferralCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "User_referralCode_key" ON "User"("referralCode") WHERE "referralCode" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "User_referredByUserId_idx" ON "User"("referredByUserId");
DO $$
BEGIN
  ALTER TABLE "User" ADD CONSTRAINT "User_referredByUserId_fkey"
    FOREIGN KEY ("referredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "TrialDevice" (
  "id" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "emailsUsed" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "blockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrialDevice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "TrialDevice_fingerprint_key" ON "TrialDevice"("fingerprint");

CREATE TABLE IF NOT EXISTS "ReferralReward" (
  "id" TEXT NOT NULL,
  "referrerId" TEXT NOT NULL,
  "refereeId" TEXT NOT NULL,
  "refereeDisplayName" TEXT,
  "awardedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "appliedToSubscription" BOOLEAN NOT NULL DEFAULT false,
  "toastShownAt" TIMESTAMP(3),
  CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralReward_refereeId_key" ON "ReferralReward"("refereeId");
CREATE INDEX IF NOT EXISTS "ReferralReward_referrerId_idx" ON "ReferralReward"("referrerId");
CREATE INDEX IF NOT EXISTS "ReferralReward_referrerId_toastShownAt_idx" ON "ReferralReward"("referrerId", "toastShownAt");
DO $$
BEGIN
  ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_referrerId_fkey"
    FOREIGN KEY ("referrerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
DO $$
BEGIN
  ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_refereeId_fkey"
    FOREIGN KEY ("refereeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
