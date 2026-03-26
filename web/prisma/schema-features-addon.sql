-- HGH Workforce feature add-on (Tier 2, webhooks, corrections, onboarding, leave policy, payrun approval note)
-- Run in Supabase → SQL → New query after backup. Prefer `npx prisma db push` from `web/` if you use Prisma locally.

ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "tier2PensionEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "tier2EmployeePercent" DECIMAL(5, 2) NOT NULL DEFAULT 5;
ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "tier2EmployerPercent" DECIMAL(5, 2) NOT NULL DEFAULT 5;

ALTER TABLE "Payrun" ADD COLUMN IF NOT EXISTS "approvalNote" TEXT;
ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "approvalNote" TEXT;

ALTER TABLE "LeaveEntitlement"
  ADD COLUMN IF NOT EXISTS "monthlyAccrualRate" DECIMAL(5, 2);
ALTER TABLE "LeaveEntitlement"
  ADD COLUMN IF NOT EXISTS "maxBalanceDays" INTEGER;

ALTER TABLE "PayrunLine"
  ADD COLUMN IF NOT EXISTS "tier2Employee" DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "PayrunLine"
  ADD COLUMN IF NOT EXISTS "tier2Employer" DECIMAL(12, 2) NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceCorrectionStatus') THEN
    CREATE TYPE "AttendanceCorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "CompanyWebhook" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "payrunApproved" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyWebhook_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CompanyWebhook_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "CompanyWebhook_companyId_idx" ON "CompanyWebhook" ("companyId");

CREATE TABLE IF NOT EXISTS "EmployeeOnboardingTask" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeOnboardingTask_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EmployeeOnboardingTask_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EmployeeOnboardingTask_employeeId_idx" ON "EmployeeOnboardingTask" ("employeeId");

CREATE TABLE IF NOT EXISTS "AttendanceCorrectionRequest" (
  "id" TEXT NOT NULL,
  "checkInId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "proposedClockIn" TIMESTAMP(3),
  "proposedClockOut" TIMESTAMP(3),
  "status" "AttendanceCorrectionStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AttendanceCorrectionRequest_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AttendanceCorrectionRequest_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "CheckIn" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AttendanceCorrectionRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AttendanceCorrectionRequest_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AttendanceCorrectionRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AttendanceCorrectionRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AttendanceCorrectionRequest_companyId_status_idx" ON "AttendanceCorrectionRequest" ("companyId", "status");
CREATE INDEX IF NOT EXISTS "AttendanceCorrectionRequest_employeeId_idx" ON "AttendanceCorrectionRequest" ("employeeId");
