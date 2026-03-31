import type { CheckIn } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  evaluateKioskClockInGate,
  localDateString,
  startOfLocalDayUtc,
  endOfLocalDayUtc,
} from "@/lib/kiosk-time";
import { wallMinutesFromDateInZone } from "@/lib/shift-wall-time";
import { isCompanyPublicHoliday } from "@/lib/public-holidays";
import { upsertLateRecordFromCheckIn } from "@/lib/late-record-from-checkin";

function hhmToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export type CheckinCompanyGateFields = {
  kioskTimezone: string | null;
  kioskOfficeOpensAt: string | null;
  kioskOfficeClosesAt: string | null;
  kioskCutoffTime: string | null;
};

/** Active shift assignment for the employee on the local civil day of `now` in `tz`. */
export async function findActiveShiftAssignmentForEmployeeLocalDay(
  employeeId: string,
  tz: string,
  now: Date,
) {
  const localDate = localDateString(now, tz);
  const dayStart = startOfLocalDayUtc(localDate, tz);
  const dayEnd = endOfLocalDayUtc(localDate, tz);
  return prisma.shiftAssignment.findFirst({
    where: {
      employeeId,
      startDate: { lte: dayEnd },
      OR: [{ endDate: null }, { endDate: { gte: dayStart } }],
    },
    include: {
      shift: { select: { name: true, startTime: true, endTime: true, breakMinutes: true } },
    },
    orderBy: { startDate: "desc" },
  });
}

export type ClockInFailure = { ok: false; status: number; error: string };
export type ClockInSuccess = {
  ok: true;
  checkIn: CheckIn;
  _meta: {
    lateMinutes: number | null;
    publicHoliday: boolean;
    shiftName: string | null;
  };
};

/**
 * Shared clock-in rules (kiosk; portal does not punch): office gate, shift required,
 * public holiday / lateness / LateRecord, same shift link as kiosk.
 */
export async function tryClockIn(params: {
  employeeId: string;
  companyId: string;
  note: string | null | undefined;
  checkinSessionId: string | null;
  company: CheckinCompanyGateFields;
}): Promise<ClockInSuccess | ClockInFailure> {
  const tz = params.company.kioskTimezone || "Africa/Accra";
  const now = new Date();

  const openCheckIn = await prisma.checkIn.findFirst({
    where: { employeeId: params.employeeId, status: "CLOCKED_IN" },
  });
  if (openCheckIn) {
    return {
      ok: false,
      status: 409,
      error: "Already clocked in. Please clock out first.",
    };
  }

  const gate = evaluateKioskClockInGate({
    now,
    timezone: tz,
    opensAt: params.company.kioskOfficeOpensAt,
    closesAt: params.company.kioskOfficeClosesAt,
    cutoffTime: params.company.kioskCutoffTime,
  });
  if (!gate.ok) {
    return { ok: false, status: 403, error: gate.message };
  }

  const activeAssignment = await findActiveShiftAssignmentForEmployeeLocalDay(
    params.employeeId,
    tz,
    now,
  );
  if (!activeAssignment) {
    return {
      ok: false,
      status: 403,
      error: "No shift is assigned to you for today — contact HR.",
    };
  }

  const onPublicHoliday = await isCompanyPublicHoliday(params.companyId, now, tz);
  let lateMinutes: number | null = null;
  if (!onPublicHoliday && activeAssignment.shift) {
    const shiftStartMins = hhmToMinutes(activeAssignment.shift.startTime);
    const clockInMins = wallMinutesFromDateInZone(now, tz);
    const diff = clockInMins - shiftStartMins;
    if (diff > 5) lateMinutes = diff;
  }

  const checkIn = await prisma.checkIn.create({
    data: {
      employeeId: params.employeeId,
      companyId: params.companyId,
      clockIn: now,
      status: "CLOCKED_IN",
      lateMinutes,
      shiftAssignmentId: activeAssignment.id,
      note: params.note ?? null,
      checkinSessionId: params.checkinSessionId,
    },
  });

  if (lateMinutes != null && lateMinutes > 0) {
    await upsertLateRecordFromCheckIn({
      companyId: params.companyId,
      employeeId: params.employeeId,
      checkInId: checkIn.id,
      lateMinutes,
      clockIn: now,
      timeZone: tz,
    });
  }

  return {
    ok: true,
    checkIn,
    _meta: {
      lateMinutes,
      publicHoliday: onPublicHoliday,
      shiftName: activeAssignment.shift
        ? `${activeAssignment.shift.startTime} - ${activeAssignment.shift.endTime}`
        : null,
    },
  };
}

export type ClockOutFailure = { ok: false; status: number; error: string };
export type ClockOutSuccess = {
  ok: true;
  updated: CheckIn;
  _meta: { overtimeHours: number | null; earlyDepartMinutes: number | null };
};

/** Shared clock-out rules: OT / early departure, same shift resolution as kiosk. */
export async function tryClockOut(params: {
  employeeId: string;
  companyId: string;
  company: CheckinCompanyGateFields & { checkinEnterpriseEnabled: boolean };
  sessionId: string | null | undefined;
  note: string | null | undefined;
}): Promise<ClockOutSuccess | ClockOutFailure> {
  const tz = params.company.kioskTimezone || "Africa/Accra";
  const clockOut = new Date();

  const openCheckIn = await prisma.checkIn.findFirst({
    where: { employeeId: params.employeeId, status: "CLOCKED_IN" },
    orderBy: { clockIn: "desc" },
    include: {
      shiftAssignment: {
        include: { shift: { select: { startTime: true, endTime: true, breakMinutes: true } } },
      },
    },
  });

  if (!openCheckIn) {
    return { ok: false, status: 404, error: "No open check-in found" };
  }

  if (
    params.company.checkinEnterpriseEnabled &&
    openCheckIn.checkinSessionId &&
    params.sessionId !== openCheckIn.checkinSessionId
  ) {
    return { ok: false, status: 400, error: "Session does not match this check-in" };
  }

  const activeAssignment = await findActiveShiftAssignmentForEmployeeLocalDay(
    params.employeeId,
    tz,
    clockOut,
  );

  const diffMs = clockOut.getTime() - openCheckIn.clockIn.getTime();
  const hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

  let overtimeHours: number | null = null;
  let earlyDepartMinutes: number | null = null;

  const shift = openCheckIn.shiftAssignment?.shift ?? activeAssignment?.shift;
  if (shift) {
    const shiftEndMins = hhmToMinutes(shift.endTime);
    const clockOutMins = wallMinutesFromDateInZone(clockOut, tz);
    if (shiftEndMins - clockOutMins > 5) {
      earlyDepartMinutes = shiftEndMins - clockOutMins;
    }
    const shiftStartMins = hhmToMinutes(shift.startTime);
    const scheduledHours = (shiftEndMins - shiftStartMins - (shift.breakMinutes ?? 0)) / 60;
    if (hoursWorked > scheduledHours + 0.08) {
      overtimeHours = Math.round((hoursWorked - scheduledHours) * 100) / 100;
    }
  }

  const note = params.note ?? openCheckIn.note;

  const updated = await prisma.checkIn.update({
    where: { id: openCheckIn.id },
    data: {
      clockOut,
      status: "CLOCKED_OUT",
      hoursWorked: new Prisma.Decimal(hoursWorked.toFixed(2)),
      overtimeHours: overtimeHours != null ? new Prisma.Decimal(overtimeHours.toFixed(2)) : null,
      earlyDepartMinutes,
      note,
    },
  });

  return {
    ok: true,
    updated,
    _meta: { overtimeHours, earlyDepartMinutes },
  };
}
