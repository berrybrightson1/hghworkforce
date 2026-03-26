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
DO $$ BEGIN CREATE TYPE "PlanTier" AS ENUM ('FREE', 'STARTER', 'GROWTH', 'ENTERPRISE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
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
    "planTier" "PlanTier" NOT NULL DEFAULT 'FREE',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'NONE',
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
  'PORTAL_OPENED', 'FACE_SCAN_STARTED', 'FACE_MATCH_OK', 'FACE_MATCH_FAIL',
  'CLOCK_IN', 'CLOCK_OUT', 'SESSION_INTERRUPTED', 'TAB_HIDDEN', 'TAB_VISIBLE'
); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "IPAccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "checkinEnterpriseEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "checkinEnforceIpAllowlist" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "checkinLockToFirstIp" BOOLEAN NOT NULL DEFAULT true;
-- Existing DBs that already added this column with DEFAULT false: fix server default for new rows only.
ALTER TABLE "Company" ALTER COLUMN "checkinLockToFirstIp" SET DEFAULT true;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "checkinBoundIp" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "checkinRequireFaceVerification" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "checkinFaceDistanceThreshold" DECIMAL(8,5);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "checkinMaxFaceAttempts" INTEGER NOT NULL DEFAULT 3;

ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "faceDescriptor" JSONB;
ALTER TABLE "Employee" ADD COLUMN IF NOT EXISTS "faceRegisteredAt" TIMESTAMP(3);

ALTER TABLE "CheckIn" ADD COLUMN IF NOT EXISTS "checkinSessionId" TEXT;

CREATE TABLE IF NOT EXISTS "AllowedIP" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "label" TEXT,
  "address" TEXT NOT NULL,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AllowedIP_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AllowedIP_companyId_idx" ON "AllowedIP"("companyId");

CREATE TABLE IF NOT EXISTS "IPAccessRequest" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "requestedIp" TEXT NOT NULL,
  "note" TEXT,
  "status" "IPAccessRequestStatus" NOT NULL DEFAULT 'PENDING',
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IPAccessRequest_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "IPAccessRequest_companyId_status_idx" ON "IPAccessRequest"("companyId", "status");

CREATE TABLE IF NOT EXISTS "CheckinSession" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "clientIp" TEXT,
  "userAgent" TEXT,
  "faceFailCount" INTEGER NOT NULL DEFAULT 0,
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

CREATE TABLE IF NOT EXISTS "FaceMismatchAlert" (
  "id" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "checkinSessionId" TEXT,
  "metadata" JSONB,
  "resolvedAt" TIMESTAMP(3),
  "resolvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FaceMismatchAlert_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "FaceMismatchAlert_companyId_resolvedAt_idx" ON "FaceMismatchAlert"("companyId", "resolvedAt");
CREATE INDEX IF NOT EXISTS "FaceMismatchAlert_employeeId_idx" ON "FaceMismatchAlert"("employeeId");

DO $$ BEGIN
  ALTER TABLE "AllowedIP" ADD CONSTRAINT "AllowedIP_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "AllowedIP" ADD CONSTRAINT "AllowedIP_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "IPAccessRequest" ADD CONSTRAINT "IPAccessRequest_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "IPAccessRequest" ADD CONSTRAINT "IPAccessRequest_requestedByUserId_fkey"
    FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "IPAccessRequest" ADD CONSTRAINT "IPAccessRequest_reviewedById_fkey"
    FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
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
  ALTER TABLE "FaceMismatchAlert" ADD CONSTRAINT "FaceMismatchAlert_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FaceMismatchAlert" ADD CONSTRAINT "FaceMismatchAlert_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FaceMismatchAlert" ADD CONSTRAINT "FaceMismatchAlert_checkinSessionId_fkey"
    FOREIGN KEY ("checkinSessionId") REFERENCES "CheckinSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "FaceMismatchAlert" ADD CONSTRAINT "FaceMismatchAlert_resolvedById_fkey"
    FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
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
