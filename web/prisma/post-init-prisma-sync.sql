-- Run after `init-from-schema.sql` (Supabase → SQL → New query → paste → Run).
-- Idempotent: safe to re-run. Brings the DB closer to `prisma/schema.prisma` for:
-- tier2 / webhooks / attendance corrections / payrun payment fields / onboarding tracker /
-- performance / revenue / exit (if an older init snapshot omitted exits).
--
-- If you already ran `schema-features-addon.sql`, this still skips existing objects.

-- ── Company: Tier 2 pension (not in base init CREATE TABLE) ─────────────────
ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "tier2PensionEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "tier2EmployeePercent" DECIMAL(5, 2) NOT NULL DEFAULT 5;
ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "tier2EmployerPercent" DECIMAL(5, 2) NOT NULL DEFAULT 5;

-- ── Payrun & payroll lines & leave ─────────────────────────────────────────
ALTER TABLE "Payrun" ADD COLUMN IF NOT EXISTS "approvalNote" TEXT;
ALTER TABLE "Payrun" ADD COLUMN IF NOT EXISTS "isPaid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Payrun" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "Payrun" ADD COLUMN IF NOT EXISTS "scheduledPayDate" TIMESTAMP(3);
ALTER TABLE "Payrun" ADD COLUMN IF NOT EXISTS "markedPaidBy" TEXT;

ALTER TABLE "LeaveRequest" ADD COLUMN IF NOT EXISTS "approvalNote" TEXT;

ALTER TABLE "LeaveEntitlement"
  ADD COLUMN IF NOT EXISTS "monthlyAccrualRate" DECIMAL(5, 2);
ALTER TABLE "LeaveEntitlement"
  ADD COLUMN IF NOT EXISTS "maxBalanceDays" INTEGER;

ALTER TABLE "PayrunLine"
  ADD COLUMN IF NOT EXISTS "tier2Employee" DECIMAL(12, 2) NOT NULL DEFAULT 0;
ALTER TABLE "PayrunLine"
  ADD COLUMN IF NOT EXISTS "tier2Employer" DECIMAL(12, 2) NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE "Payrun" ADD CONSTRAINT "Payrun_markedPaidBy_fkey"
    FOREIGN KEY ("markedPaidBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Attendance correction ─────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AttendanceCorrectionStatus') THEN
    CREATE TYPE "AttendanceCorrectionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CompanyWebhook" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "payrunApproved" BOOLEAN NOT NULL DEFAULT true,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyWebhook_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "CompanyWebhook" ADD CONSTRAINT "CompanyWebhook_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "CompanyWebhook_companyId_idx" ON "CompanyWebhook"("companyId");

CREATE TABLE IF NOT EXISTS "EmployeeOnboardingTask" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmployeeOnboardingTask_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "EmployeeOnboardingTask" ADD CONSTRAINT "EmployeeOnboardingTask_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "EmployeeOnboardingTask_employeeId_idx" ON "EmployeeOnboardingTask"("employeeId");

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
  CONSTRAINT "AttendanceCorrectionRequest_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_checkInId_fkey"
    FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_requestedByUserId_fkey"
    FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AttendanceCorrectionRequest" ADD CONSTRAINT "AttendanceCorrectionRequest_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "AttendanceCorrectionRequest_companyId_status_idx"
  ON "AttendanceCorrectionRequest"("companyId", "status");
CREATE INDEX IF NOT EXISTS "AttendanceCorrectionRequest_employeeId_idx"
  ON "AttendanceCorrectionRequest"("employeeId");

-- ── Onboarding tracker (templates + per-employee onboardings) ────────────
DO $$ BEGIN
  CREATE TYPE "OnboardingStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "OnboardingTaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'OVERDUE', 'WAIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "OnboardingTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnboardingTemplate_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "OnboardingTemplate" ADD CONSTRAINT "OnboardingTemplate_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "OnboardingTemplate_companyId_idx" ON "OnboardingTemplate"("companyId");

CREATE TABLE IF NOT EXISTS "OnboardingTemplateTask" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "dueAfterDays" INTEGER NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "OnboardingTemplateTask_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "OnboardingTemplateTask" ADD CONSTRAINT "OnboardingTemplateTask_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "OnboardingTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "OnboardingTemplateTask_templateId_idx" ON "OnboardingTemplateTask"("templateId");

CREATE TABLE IF NOT EXISTS "EmployeeOnboarding" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  "status" "OnboardingStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EmployeeOnboarding_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "EmployeeOnboarding" ADD CONSTRAINT "EmployeeOnboarding_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "EmployeeOnboarding" ADD CONSTRAINT "EmployeeOnboarding_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "OnboardingTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "EmployeeOnboarding_companyId_idx" ON "EmployeeOnboarding"("companyId");
CREATE INDEX IF NOT EXISTS "EmployeeOnboarding_employeeId_idx" ON "EmployeeOnboarding"("employeeId");

CREATE TABLE IF NOT EXISTS "OnboardingChecklistItem" (
  "id" TEXT NOT NULL,
  "onboardingId" TEXT NOT NULL,
  "templateTaskId" TEXT,
  "title" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "isRequired" BOOLEAN NOT NULL DEFAULT true,
  "status" "OnboardingTaskStatus" NOT NULL DEFAULT 'PENDING',
  "completedAt" TIMESTAMP(3),
  "completedBy" TEXT,
  "waivedBy" TEXT,
  "waivedNote" TEXT,
  CONSTRAINT "OnboardingChecklistItem_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "OnboardingChecklistItem" ADD CONSTRAINT "OnboardingChecklistItem_onboardingId_fkey"
    FOREIGN KEY ("onboardingId") REFERENCES "EmployeeOnboarding"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "OnboardingChecklistItem_onboardingId_idx" ON "OnboardingChecklistItem"("onboardingId");

-- ── Performance management ─────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "PerformanceCycleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "PerformanceReviewStatus" AS ENUM (
    'PENDING', 'SELF_REVIEWED', 'MANAGER_REVIEWED', 'COMPLETED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PerformanceCycle" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "periodStart" TIMESTAMP(3) NOT NULL,
  "periodEnd" TIMESTAMP(3) NOT NULL,
  "status" "PerformanceCycleStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PerformanceCycle_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "PerformanceCycle" ADD CONSTRAINT "PerformanceCycle_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "PerformanceCycle_companyId_status_idx"
  ON "PerformanceCycle"("companyId", "status");

CREATE TABLE IF NOT EXISTS "PerformanceReview" (
  "id" TEXT NOT NULL,
  "cycleId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "reviewerId" TEXT,
  "status" "PerformanceReviewStatus" NOT NULL DEFAULT 'PENDING',
  "selfRating" DOUBLE PRECISION,
  "managerRating" DOUBLE PRECISION,
  "finalRating" DOUBLE PRECISION,
  "selfComment" TEXT,
  "managerComment" TEXT,
  "submittedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "PerformanceReview_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_cycleId_fkey"
    FOREIGN KEY ("cycleId") REFERENCES "PerformanceCycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PerformanceReview" ADD CONSTRAINT "PerformanceReview_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "PerformanceReview_cycleId_idx" ON "PerformanceReview"("cycleId");
CREATE INDEX IF NOT EXISTS "PerformanceReview_employeeId_idx" ON "PerformanceReview"("employeeId");

CREATE TABLE IF NOT EXISTS "PerformanceGoal" (
  "id" TEXT NOT NULL,
  "reviewId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "selfScore" INTEGER,
  "managerScore" INTEGER,
  "weight" INTEGER NOT NULL,
  CONSTRAINT "PerformanceGoal_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "PerformanceGoal" ADD CONSTRAINT "PerformanceGoal_reviewId_fkey"
    FOREIGN KEY ("reviewId") REFERENCES "PerformanceReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS "PerformanceGoal_reviewId_idx" ON "PerformanceGoal"("reviewId");

-- ── Revenue tracker (cost vs revenue reports) ────────────────────────────
CREATE TABLE IF NOT EXISTS "RevenueEntry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "month" INTEGER NOT NULL,
  "year" INTEGER NOT NULL,
  "revenueAmount" DECIMAL(14, 2) NOT NULL,
  "note" TEXT,
  "enteredBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RevenueEntry_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "RevenueEntry" ADD CONSTRAINT "RevenueEntry_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "RevenueEntry" ADD CONSTRAINT "RevenueEntry_enteredBy_fkey"
    FOREIGN KEY ("enteredBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "RevenueEntry_companyId_month_year_key"
  ON "RevenueEntry"("companyId", "month", "year");
CREATE INDEX IF NOT EXISTS "RevenueEntry_companyId_idx" ON "RevenueEntry"("companyId");

-- ── Exit management (older init snapshots may lack this block) ─────────────
DO $$ BEGIN CREATE TYPE "ExitType" AS ENUM (
    'RESIGNATION', 'TERMINATION', 'REDUNDANCY', 'RETIREMENT', 'CONTRACT_END', 'DEATH'
  ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ExitStatus" AS ENUM (
    'INITIATED', 'IN_PROGRESS', 'CLEARED', 'COMPLETED'
  ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ExitClearanceDepartment" AS ENUM (
    'IT', 'FINANCE', 'ADMIN', 'MANAGER', 'SECURITY', 'OTHER'
  ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ExitClearanceStatus" AS ENUM (
    'PENDING', 'CLEARED', 'WAIVED'
  ); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ExitRecord" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "exitType" "ExitType" NOT NULL,
  "noticeDate" TIMESTAMP(3) NOT NULL,
  "lastWorkingDay" TIMESTAMP(3) NOT NULL,
  "exitInterviewDate" TIMESTAMP(3),
  "reason" TEXT,
  "status" "ExitStatus" NOT NULL DEFAULT 'INITIATED',
  "finalPayrunId" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExitRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ExitClearanceItem" (
  "id" TEXT NOT NULL,
  "exitRecordId" TEXT NOT NULL,
  "department" "ExitClearanceDepartment" NOT NULL,
  "item" TEXT NOT NULL,
  "assignedTo" TEXT,
  "status" "ExitClearanceStatus" NOT NULL DEFAULT 'PENDING',
  "clearedAt" TIMESTAMP(3),
  "clearedBy" TEXT,
  "note" TEXT,
  CONSTRAINT "ExitClearanceItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExitRecord_companyId_status_idx" ON "ExitRecord"("companyId", "status");
CREATE INDEX IF NOT EXISTS "ExitRecord_employeeId_idx" ON "ExitRecord"("employeeId");
CREATE INDEX IF NOT EXISTS "ExitClearanceItem_exitRecordId_idx" ON "ExitClearanceItem"("exitRecordId");

DO $$ BEGIN
  ALTER TABLE "ExitRecord" ADD CONSTRAINT "ExitRecord_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ExitRecord" ADD CONSTRAINT "ExitRecord_createdBy_fkey"
    FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ExitClearanceItem" ADD CONSTRAINT "ExitClearanceItem_exitRecordId_fkey"
    FOREIGN KEY ("exitRecordId") REFERENCES "ExitRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "ExitClearanceItem" ADD CONSTRAINT "ExitClearanceItem_clearedBy_fkey"
    FOREIGN KEY ("clearedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
