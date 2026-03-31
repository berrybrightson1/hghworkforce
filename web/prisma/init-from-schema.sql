-- Generated from prisma/schema.prisma (do not edit by hand; regenerate with):
--   npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script
--
-- Safe to re-run on Supabase: skips enums/tables/indexes/constraints that already exist.
-- For an existing DB missing only billing columns, you can use add-plan-billing-columns.sql instead.

-- CreateEnum (idempotent)
DO $$ BEGIN CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'COMPANY_ADMIN', 'HR', 'EMPLOYEE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACTOR'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'TERMINATED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SalaryComponentType" AS ENUM ('ALLOWANCE', 'DEDUCTION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "PayrunStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LeaveType" AS ENUM ('ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'COMPASSIONATE', 'UNPAID'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LoanType" AS ENUM ('LOAN', 'ADVANCE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LoanStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "SubscriptionStatus" AS ENUM ('NONE', 'ACTIVE', 'TRIAL', 'PAST_DUE', 'CANCELED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "registrationNumber" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
    "trialEndsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "authUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Employee" (
    "id" TEXT NOT NULL,
    "employeeCode" TEXT NOT NULL,
    "userId" TEXT,
    "companyId" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "employmentType" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "startDate" TIMESTAMP(3) NOT NULL,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "basicSalary" DECIMAL(12,2) NOT NULL,
    "ssnitEncrypted" TEXT,
    "tinEncrypted" TEXT,
    "bankNameEncrypted" TEXT,
    "bankAccountEncrypted" TEXT,
    "bankBranchEncrypted" TEXT,
    "nokName" TEXT,
    "nokPhone" TEXT,
    "nokRelationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "SalaryComponent" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "SalaryComponentType" NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Payrun" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "status" "PayrunStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "createdById" TEXT NOT NULL,
    "submittedById" TEXT,
    "approvedById" TEXT,
    "rejectedById" TEXT,
    "rejectionNote" TEXT,
    "approvedAt" TIMESTAMP(3),
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payrun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PayrunLine" (
    "id" TEXT NOT NULL,
    "payrunId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "grossPay" DECIMAL(12,2) NOT NULL,
    "ssnitEmployee" DECIMAL(12,2) NOT NULL,
    "ssnitEmployer" DECIMAL(12,2) NOT NULL,
    "taxablePay" DECIMAL(12,2) NOT NULL,
    "payeTax" DECIMAL(12,2) NOT NULL,
    "provident" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "loanDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherDeductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalDeductions" DECIMAL(12,2) NOT NULL,
    "netPay" DECIMAL(12,2) NOT NULL,
    "isOverridden" BOOLEAN NOT NULL DEFAULT false,
    "overrideNote" TEXT,
    "salarySnapshot" JSONB NOT NULL,

    CONSTRAINT "PayrunLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Payslip" (
    "id" TEXT NOT NULL,
    "payrunLineId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "pdfUrl" TEXT NOT NULL,
    "emailedAt" TIMESTAMP(3),
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payslip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LeaveEntitlement" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL,
    "days" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "LeaveEntitlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "LeaveRequest" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "LeaveType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "days" INTEGER NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Loan" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "LoanType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL,
    "monthlyRepayment" DECIMAL(12,2) NOT NULL,
    "disbursedAt" TIMESTAMP(3) NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "TaxBracket" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "year" INTEGER NOT NULL,
    "minAmount" DECIMAL(12,2) NOT NULL,
    "maxAmount" DECIMAL(12,2),
    "rate" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxBracket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Invitation" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "companyId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Company_isActive_idx" ON "Company"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_authUserId_key" ON "User"("authUserId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_authUserId_idx" ON "User"("authUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_companyId_role_idx" ON "User"("companyId", "role");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_employeeCode_key" ON "Employee"("employeeCode");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Employee_companyId_status_idx" ON "Employee"("companyId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Employee_employeeCode_idx" ON "Employee"("employeeCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "SalaryComponent_employeeId_type_idx" ON "SalaryComponent"("employeeId", "type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payrun_companyId_status_idx" ON "Payrun"("companyId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payrun_periodStart_periodEnd_idx" ON "Payrun"("periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "PayrunLine_payrunId_idx" ON "PayrunLine"("payrunId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "PayrunLine_payrunId_employeeId_key" ON "PayrunLine"("payrunId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Payslip_payrunLineId_key" ON "Payslip"("payrunLineId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Payslip_employeeId_idx" ON "Payslip"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "LeaveEntitlement_companyId_leaveType_key" ON "LeaveEntitlement"("companyId", "leaveType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeaveRequest_employeeId_status_idx" ON "LeaveRequest"("employeeId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "LeaveRequest_startDate_endDate_idx" ON "LeaveRequest"("startDate", "endDate");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Loan_employeeId_status_idx" ON "Loan"("employeeId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TaxBracket_year_isActive_idx" ON "TaxBracket"("year", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Invitation_code_key" ON "Invitation"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invitation_email_status_idx" ON "Invitation"("email", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invitation_code_idx" ON "Invitation"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey (idempotent)
DO $$ BEGIN ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "SalaryComponent" ADD CONSTRAINT "SalaryComponent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Payrun" ADD CONSTRAINT "Payrun_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PayrunLine" ADD CONSTRAINT "PayrunLine_payrunId_fkey" FOREIGN KEY ("payrunId") REFERENCES "Payrun"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PayrunLine" ADD CONSTRAINT "PayrunLine_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_payrunLineId_fkey" FOREIGN KEY ("payrunLineId") REFERENCES "PayrunLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Payslip" ADD CONSTRAINT "Payslip_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "LeaveEntitlement" ADD CONSTRAINT "LeaveEntitlement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Loan" ADD CONSTRAINT "Loan_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "TaxBracket" ADD CONSTRAINT "TaxBracket_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Employee.name (HR display name; nullable for legacy rows). Safe to re-run.
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "name" TEXT;

-- ═══════════════════════════════════════════════════════════════════════════
-- Enterprise check-in (additive). Run in Supabase SQL after `prisma migrate` or
-- use alongside schema.prisma changes. Idempotent where possible.
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN CREATE TYPE "CheckinSessionEventType" AS ENUM (
  'PORTAL_OPENED',
  'CLOCK_IN', 'CLOCK_OUT', 'SESSION_INTERRUPTED', 'TAB_HIDDEN', 'TAB_VISIBLE'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "checkinEnterpriseEnabled" BOOLEAN NOT NULL DEFAULT false;

-- Device-bound kiosk check-in (replaces face/IP)
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "kioskDeviceTokenHash" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "deviceBoundAt" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "deviceResetAt" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "deviceResetBy" TEXT;

-- Mobile money (optional; encrypted MSISDN)
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "momoProvider" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "momoMsisdnEncrypted" TEXT;

ALTER TABLE "CheckIn" ADD COLUMN IF NOT EXISTS "checkinSessionId" TEXT;

CREATE TABLE IF NOT EXISTS "CheckinSession" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "clientIp" TEXT,
  "userAgent" TEXT,
  "endedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CheckinSession_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CheckinSession_employeeId_createdAt_idx" ON "CheckinSession"("employeeId", "createdAt");
CREATE INDEX IF NOT EXISTS "CheckinSession_companyId_createdAt_idx" ON "CheckinSession"("companyId", "createdAt");

CREATE TABLE IF NOT EXISTS "CheckinEvent" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "type" "CheckinSessionEventType" NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CheckinEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CheckinEvent_sessionId_createdAt_idx" ON "CheckinEvent"("sessionId", "createdAt");

CREATE TABLE IF NOT EXISTS "KioskChallenge" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "deviceVerified" BOOLEAN NOT NULL DEFAULT false,
  "consumed" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "KioskChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "KioskChallenge_companyId_idx" ON "KioskChallenge"("companyId");
CREATE INDEX IF NOT EXISTS "KioskChallenge_employeeId_idx" ON "KioskChallenge"("employeeId");
CREATE INDEX IF NOT EXISTS "KioskChallenge_expiresAt_idx" ON "KioskChallenge"("expiresAt");

DO $$ BEGIN
  ALTER TABLE "CheckinSession" ADD CONSTRAINT "CheckinSession_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CheckinSession" ADD CONSTRAINT "CheckinSession_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CheckinEvent" ADD CONSTRAINT "CheckinEvent_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "CheckinSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "KioskChallenge" ADD CONSTRAINT "KioskChallenge_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "KioskChallenge" ADD CONSTRAINT "KioskChallenge_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_checkinSessionId_fkey"
    FOREIGN KEY ("checkinSessionId") REFERENCES "CheckinSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE INDEX IF NOT EXISTS "CheckIn_checkinSessionId_idx" ON "CheckIn"("checkinSessionId");

-- ── Kiosk (office PC check-in) ───────────────────────────────────────────────
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "kioskOfficeOpensAt" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "kioskOfficeClosesAt" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "kioskCutoffTime" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "kioskTimezone" TEXT NOT NULL DEFAULT 'Africa/Accra';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "kioskLastAbsentRunDate" TEXT;

CREATE TABLE IF NOT EXISTS "KioskDayAbsence" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "reason" TEXT NOT NULL DEFAULT 'MISSING_CHECKIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KioskDayAbsence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "KioskDayAbsence_companyId_employeeId_localDate_key" ON "KioskDayAbsence"("companyId", "employeeId", "localDate");
CREATE INDEX IF NOT EXISTS "KioskDayAbsence_companyId_localDate_idx" ON "KioskDayAbsence"("companyId", "localDate");

DO $$ BEGIN
  ALTER TABLE "KioskDayAbsence" ADD CONSTRAINT "KioskDayAbsence_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "KioskDayAbsence" ADD CONSTRAINT "KioskDayAbsence_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Exit management (offboarding + clearance) ─────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "ExitType" AS ENUM ('RESIGNATION', 'TERMINATION', 'REDUNDANCY', 'RETIREMENT', 'CONTRACT_END', 'DEATH');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ExitStatus" AS ENUM ('INITIATED', 'IN_PROGRESS', 'CLEARED', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ExitClearanceDepartment" AS ENUM ('IT', 'FINANCE', 'ADMIN', 'MANAGER', 'SECURITY', 'OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "ExitClearanceStatus" AS ENUM ('PENDING', 'CLEARED', 'WAIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

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
CREATE INDEX IF NOT EXISTS "ExitRecord_companyId_status_idx" ON "ExitRecord"("companyId", "status");
CREATE INDEX IF NOT EXISTS "ExitRecord_employeeId_idx" ON "ExitRecord"("employeeId");

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

-- Kiosk device binding: fast lookup for “token already bound to another employee”
CREATE INDEX IF NOT EXISTS "Employee_kioskDeviceTokenHash_idx" ON "Employee"("kioskDeviceTokenHash");

-- ── Employee PIN portal + notifications (additive) ────────────────────────────
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "portalPin" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "temporaryPin" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "pinChangedAt" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "portalLastLoginAt" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "portalEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "portalFailedAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "portalLockedUntil" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TABLE "AttendanceCorrectionRequest" ALTER COLUMN "requestedByUserId" DROP NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PortalNotificationType" AS ENUM (
    'PAYSLIP_PUBLISHED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LOAN_APPROVED', 'LOAN_REJECTED',
    'QUERY_RESPONDED', 'SHIFT_SWAP_APPROVED', 'SHIFT_SWAP_REJECTED', 'ONBOARDING_TASK_DUE',
    'PERFORMANCE_REVIEW_OPEN', 'DOCUMENT_REQUIRED', 'PIN_RESET', 'GENERAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PinResetRequestStatus" AS ENUM ('PENDING', 'RESOLVED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PortalNotification" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" "PortalNotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "linkUrl" TEXT,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PortalNotification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PortalNotification_employeeId_isRead_idx" ON "PortalNotification"("employeeId", "isRead");
CREATE INDEX IF NOT EXISTS "PortalNotification_tenantId_createdAt_idx" ON "PortalNotification"("tenantId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "PortalNotification" ADD CONSTRAINT "PortalNotification_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PinResetRequest" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "status" "PinResetRequestStatus" NOT NULL DEFAULT 'PENDING',
  "otpHash" TEXT,
  "otpExpiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "adminNote" TEXT,
  CONSTRAINT "PinResetRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PinResetRequest_companyId_status_idx" ON "PinResetRequest"("companyId", "status");
CREATE INDEX IF NOT EXISTS "PinResetRequest_employeeId_idx" ON "PinResetRequest"("employeeId");

DO $$ BEGIN
  ALTER TABLE "PinResetRequest" ADD CONSTRAINT "PinResetRequest_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "PinResetRequest" ADD CONSTRAINT "PinResetRequest_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- LoanStatus: add PENDING for employee loan requests (payroll still uses only ACTIVE). Idempotent.
DO $$ BEGIN
  ALTER TYPE "LoanStatus" ADD VALUE 'PENDING';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Employee.manager (dashboard user who sees this person in inbox "My team")
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "managedByUserId" TEXT;
CREATE INDEX IF NOT EXISTS "Employee_managedByUserId_idx" ON "Employee"("managedByUserId");
DO $$ BEGIN
  ALTER TABLE "Employee" ADD CONSTRAINT "Employee_managedByUserId_fkey"
    FOREIGN KEY ("managedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─── Workplace / HR extensions (Features 1–12) ─────────────────────────────

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "showBirthdaysOnDashboard" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "birthdayLookaheadDays" INTEGER NOT NULL DEFAULT 30;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "payslipPrimaryHex" TEXT NOT NULL DEFAULT '#0f172a';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "payslipAccentHex" TEXT NOT NULL DEFAULT '#b45309';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "payslipThemeVariant" TEXT NOT NULL DEFAULT 'DEFAULT';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "overtimeHourlyMultiplier" DECIMAL(5,2) NOT NULL DEFAULT 1.5;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "standardHoursPerMonth" DECIMAL(6,2) NOT NULL DEFAULT 173;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "includeAttendanceOvertimeInPayrun" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "probationEndDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "contractType" TEXT;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "contractStartDate" TIMESTAMP(3);
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "contractEndDate" TIMESTAMP(3);

DO $$ BEGIN
  ALTER TYPE "PortalNotificationType" ADD VALUE 'COMPANY_NOTICE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "PortalNotificationType" ADD VALUE 'PAY_QUERY_UPDATE';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TYPE "PortalNotificationType" ADD VALUE 'PROFILE_REQUEST_DECIDED';
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "PayQueryStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AnonymousFeedbackStatus" AS ENUM ('NEW', 'REVIEWED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ProfileChangeRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CompanyNoticeStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PublicHoliday" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PublicHoliday_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PublicHoliday_companyId_date_key" ON "PublicHoliday"("companyId", "date");
CREATE INDEX IF NOT EXISTS "PublicHoliday_companyId_idx" ON "PublicHoliday"("companyId");
DO $$ BEGIN ALTER TABLE "PublicHoliday" ADD CONSTRAINT "PublicHoliday_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "LatenessPolicy" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL UNIQUE,
  "graceMinutes" INTEGER NOT NULL DEFAULT 5,
  "lateInstancesBeforeWarning" INTEGER,
  "warningLetterBodyTemplate" TEXT,
  CONSTRAINT "LatenessPolicy_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN ALTER TABLE "LatenessPolicy" ADD CONSTRAINT "LatenessPolicy_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "LateRecord" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "checkInId" TEXT,
  "date" TIMESTAMP(3) NOT NULL,
  "minutesLate" INTEGER NOT NULL,
  "warningLetterSentAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LateRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "LateRecord_companyId_date_idx" ON "LateRecord"("companyId", "date");
CREATE INDEX IF NOT EXISTS "LateRecord_employeeId_idx" ON "LateRecord"("employeeId");
DO $$ BEGIN ALTER TABLE "LateRecord" ADD CONSTRAINT "LateRecord_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "LateRecord" ADD CONSTRAINT "LateRecord_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "LateRecord" ADD CONSTRAINT "LateRecord_checkInId_fkey"
  FOREIGN KEY ("checkInId") REFERENCES "CheckIn"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "PayQuery" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "PayQueryStatus" NOT NULL DEFAULT 'OPEN',
  "responseBody" TEXT,
  "respondedById" TEXT,
  "respondedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PayQuery_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "PayQuery_companyId_status_idx" ON "PayQuery"("companyId", "status");
CREATE INDEX IF NOT EXISTS "PayQuery_employeeId_idx" ON "PayQuery"("employeeId");
DO $$ BEGIN ALTER TABLE "PayQuery" ADD CONSTRAINT "PayQuery_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PayQuery" ADD CONSTRAINT "PayQuery_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "PayQuery" ADD CONSTRAINT "PayQuery_respondedById_fkey"
  FOREIGN KEY ("respondedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "AnonymousFeedback" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "category" TEXT,
  "status" "AnonymousFeedbackStatus" NOT NULL DEFAULT 'NEW',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "internalNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AnonymousFeedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AnonymousFeedback_companyId_status_idx" ON "AnonymousFeedback"("companyId", "status");
DO $$ BEGIN ALTER TABLE "AnonymousFeedback" ADD CONSTRAINT "AnonymousFeedback_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "AnonymousFeedback" ADD CONSTRAINT "AnonymousFeedback_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "ProfileChangeRequest" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "changesJson" JSONB NOT NULL,
  "employeeNote" TEXT,
  "status" "ProfileChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewerNote" TEXT,
  "decidedById" TEXT,
  "decidedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfileChangeRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProfileChangeRequest_companyId_status_idx" ON "ProfileChangeRequest"("companyId", "status");
CREATE INDEX IF NOT EXISTS "ProfileChangeRequest_employeeId_idx" ON "ProfileChangeRequest"("employeeId");
DO $$ BEGIN ALTER TABLE "ProfileChangeRequest" ADD CONSTRAINT "ProfileChangeRequest_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProfileChangeRequest" ADD CONSTRAINT "ProfileChangeRequest_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "ProfileChangeRequest" ADD CONSTRAINT "ProfileChangeRequest_decidedById_fkey"
  FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "CompanyNotice" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "status" "CompanyNoticeStatus" NOT NULL DEFAULT 'PUBLISHED',
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CompanyNotice_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CompanyNotice_companyId_publishedAt_idx" ON "CompanyNotice"("companyId", "publishedAt");
DO $$ BEGIN ALTER TABLE "CompanyNotice" ADD CONSTRAINT "CompanyNotice_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "CompanyNotice" ADD CONSTRAINT "CompanyNotice_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "NoticeReceipt" (
  "id" TEXT NOT NULL,
  "noticeId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NoticeReceipt_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "NoticeReceipt_noticeId_employeeId_key" ON "NoticeReceipt"("noticeId", "employeeId");
CREATE INDEX IF NOT EXISTS "NoticeReceipt_employeeId_idx" ON "NoticeReceipt"("employeeId");
DO $$ BEGIN ALTER TABLE "NoticeReceipt" ADD CONSTRAINT "NoticeReceipt_noticeId_fkey"
  FOREIGN KEY ("noticeId") REFERENCES "CompanyNotice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "NoticeReceipt" ADD CONSTRAINT "NoticeReceipt_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
