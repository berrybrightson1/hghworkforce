-- HGH WorkForce: Check-in & Shift tables
-- Paste into Supabase -> SQL -> New query -> Run

-- Enums
CREATE TYPE "CheckInStatus" AS ENUM ('CLOCKED_IN', 'CLOCKED_OUT');
CREATE TYPE "ShiftStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- Shift templates (e.g. Morning 08:00-17:00)
CREATE TABLE "Shift" (
    "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "companyId"    TEXT NOT NULL,
    "name"         TEXT NOT NULL,
    "startTime"    TEXT NOT NULL,
    "endTime"      TEXT NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 60,
    "status"       "ShiftStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Shift_companyId_status_idx" ON "Shift"("companyId", "status");

-- Shift assignments (employee <-> shift for a date range)
CREATE TABLE "ShiftAssignment" (
    "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "shiftId"    TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "startDate"  TIMESTAMP(3) NOT NULL,
    "endDate"    TIMESTAMP(3),
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShiftAssignment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShiftAssignment_employeeId_startDate_idx" ON "ShiftAssignment"("employeeId", "startDate");
CREATE INDEX "ShiftAssignment_shiftId_idx" ON "ShiftAssignment"("shiftId");

-- Check-in records (clock in/out with optional GPS)
CREATE TABLE "CheckIn" (
    "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "employeeId"        TEXT NOT NULL,
    "companyId"         TEXT NOT NULL,
    "clockIn"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clockOut"          TIMESTAMP(3),
    "status"            "CheckInStatus" NOT NULL DEFAULT 'CLOCKED_IN',
    "clockInLat"        DECIMAL(10,7),
    "clockInLng"        DECIMAL(10,7),
    "clockOutLat"       DECIMAL(10,7),
    "clockOutLng"       DECIMAL(10,7),
    "hoursWorked"       DECIMAL(6,2),
    "note"              TEXT,
    "shiftAssignmentId" TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CheckIn_employeeId_clockIn_idx" ON "CheckIn"("employeeId", "clockIn");
CREATE INDEX "CheckIn_companyId_clockIn_idx" ON "CheckIn"("companyId", "clockIn");
CREATE INDEX "CheckIn_companyId_status_idx" ON "CheckIn"("companyId", "status");

-- Foreign keys
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_shiftAssignmentId_fkey"
    FOREIGN KEY ("shiftAssignmentId") REFERENCES "ShiftAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_shiftId_fkey"
    FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ShiftAssignment" ADD CONSTRAINT "ShiftAssignment_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
