import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getClientIpFromRequest } from "@/lib/checkin-ip";
import { assertCompanyCheckinIpAllowed } from "@/lib/checkin-enforcement";
import { getKioskAuditActorId } from "@/lib/kiosk-audit-actor";
import { faceDescriptorsMatch, parseFaceDescriptor } from "@/lib/face-math";
import { verifyKioskSessionToken } from "@/lib/kiosk-token";
import {
  evaluateKioskClockInGate,
  localDateString,
  startOfLocalDayUtc,
  endOfLocalDayUtc,
} from "@/lib/kiosk-time";

function parseHHmm(t: string) {
  const [h, m] = t.split(":").map(Number);
  return { hours: h, minutes: m };
}

function hhmToMinutes(t: string) {
  const { hours, minutes } = parseHHmm(t);
  return hours * 60 + minutes;
}

function dateToMinutesUTC(d: Date) {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

/**
 * POST /api/kiosk/clock
 * Body: { token, action: "clock-in" | "clock-out", faceDescriptor: number[], note? }
 */
export async function POST(req: NextRequest) {
  let body: {
    token?: string;
    action?: string;
    faceDescriptor?: unknown;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const action = body.action;
  const note = typeof body.note === "string" ? body.note : undefined;
  const faceDescriptorRaw = body.faceDescriptor;

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }
  if (action !== "clock-in" && action !== "clock-out") {
    return NextResponse.json({ error: "action must be clock-in or clock-out" }, { status: 400 });
  }

  const payload = verifyKioskSessionToken(token);
  if (!payload) {
    return NextResponse.json({ error: "Session expired — enter your details again" }, { status: 401 });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: payload.companyId },
      select: {
        checkinLockToFirstIp: true,
        checkinBoundIp: true,
        checkinEnterpriseEnabled: true,
        checkinEnforceIpAllowlist: true,
        checkinFaceDistanceThreshold: true,
        checkinMaxFaceAttempts: true,
        allowedIps: { select: { address: true } },
        kioskOfficeOpensAt: true,
        kioskOfficeClosesAt: true,
        kioskCutoffTime: true,
        kioskTimezone: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const clientIp = getClientIpFromRequest(req);
    const actorId = await getKioskAuditActorId(payload.companyId);
    const ipOk = await assertCompanyCheckinIpAllowed({
      companyId: payload.companyId,
      company,
      clientIp,
      actorId,
    });
    if (!ipOk.ok) {
      return NextResponse.json(
        {
          error:
            ipOk.reason === "ip_mismatch"
              ? "This kiosk must run on the registered office PC."
              : "Check-in not allowed from this network.",
        },
        { status: 403 },
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: payload.employeeId },
      select: {
        id: true,
        companyId: true,
        status: true,
        faceDescriptor: true,
      },
    });

    if (!employee || employee.companyId !== payload.companyId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    if (employee.status !== "ACTIVE") {
      return NextResponse.json({ error: "Employee is not active" }, { status: 403 });
    }

    const threshold =
      company.checkinFaceDistanceThreshold != null
        ? Number(company.checkinFaceDistanceThreshold)
        : 0.55;

    const stored = parseFaceDescriptor(employee.faceDescriptor);
    if (!stored) {
      return NextResponse.json(
        {
          error: "Face profile not enrolled yet.",
          hint:
            "Use Portal → Check-in → Register your face, or ask a Company Admin to register it on your employee profile.",
        },
        { status: 403 },
      );
    }
    const sample = parseFaceDescriptor(faceDescriptorRaw);
    if (!sample) {
      return NextResponse.json({ error: "Face capture required" }, { status: 400 });
    }
    if (!faceDescriptorsMatch(sample, stored, threshold)) {
      await prisma.faceMismatchAlert.create({
        data: {
          employeeId: employee.id,
          companyId: employee.companyId,
          checkinSessionId: null,
          metadata: { threshold, source: "kiosk" },
        },
      });
      return NextResponse.json({ error: "Face did not match enrolled profile" }, { status: 403 });
    }

    const tz = company.kioskTimezone || "Africa/Accra";
    const now = new Date();

    const openCheckIn = await prisma.checkIn.findFirst({
      where: { employeeId: employee.id, status: "CLOCKED_IN" },
      orderBy: { clockIn: "desc" },
      include: {
        shiftAssignment: {
          include: { shift: { select: { startTime: true, endTime: true, breakMinutes: true } } },
        },
      },
    });

    const localDate = localDateString(now, tz);
    const dayStart = startOfLocalDayUtc(localDate, tz);
    const dayEnd = endOfLocalDayUtc(localDate, tz);

    const activeAssignment = await prisma.shiftAssignment.findFirst({
      where: {
        employeeId: employee.id,
        startDate: { lte: dayEnd },
        OR: [{ endDate: null }, { endDate: { gte: dayStart } }],
      },
      include: {
        shift: { select: { startTime: true, endTime: true, breakMinutes: true } },
      },
      orderBy: { startDate: "desc" },
    });

    if (action === "clock-in") {
      if (openCheckIn) {
        return NextResponse.json(
          { error: "Already checked in. Check out first.", clockedIn: true },
          { status: 409 },
        );
      }

      const gate = evaluateKioskClockInGate({
        now,
        timezone: tz,
        opensAt: company.kioskOfficeOpensAt,
        closesAt: company.kioskOfficeClosesAt,
        cutoffTime: company.kioskCutoffTime,
      });
      if (!gate.ok) {
        return NextResponse.json({ error: gate.message }, { status: 403 });
      }

      if (!activeAssignment) {
        return NextResponse.json(
          { error: "No shift is assigned to you for today — use the portal or contact HR." },
          { status: 403 },
        );
      }

      let lateMinutes: number | null = null;
      if (activeAssignment.shift) {
        const shiftStartMins = hhmToMinutes(activeAssignment.shift.startTime);
        const clockInMins = dateToMinutesUTC(now);
        const diff = clockInMins - shiftStartMins;
        if (diff > 5) lateMinutes = diff;
      }

      const checkIn = await prisma.checkIn.create({
        data: {
          employeeId: employee.id,
          companyId: employee.companyId,
          clockIn: now,
          status: "CLOCKED_IN",
          lateMinutes,
          shiftAssignmentId: activeAssignment.id,
          note: note ?? null,
          checkinSessionId: null,
        },
      });

      return NextResponse.json(
        {
          ...checkIn,
          _meta: {
            lateMinutes,
            shiftName: activeAssignment.shift
              ? `${activeAssignment.shift.startTime} - ${activeAssignment.shift.endTime}`
              : null,
          },
        },
        { status: 201 },
      );
    }

    // clock-out — always allowed when there is an open check-in (after hours, before open, etc.)
    if (!openCheckIn) {
      return NextResponse.json({ error: "No open check-in to close" }, { status: 404 });
    }

    const clockOut = new Date();
    const diffMs = clockOut.getTime() - openCheckIn.clockIn.getTime();
    const hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

    let overtimeHours: number | null = null;
    let earlyDepartMinutes: number | null = null;
    const shift = openCheckIn.shiftAssignment?.shift ?? activeAssignment?.shift;

    if (shift) {
      const shiftEndMins = hhmToMinutes(shift.endTime);
      const clockOutMins = dateToMinutesUTC(clockOut);
      if (shiftEndMins - clockOutMins > 5) {
        earlyDepartMinutes = shiftEndMins - clockOutMins;
      }
      const shiftStartMins = hhmToMinutes(shift.startTime);
      const scheduledHours = (shiftEndMins - shiftStartMins - (shift.breakMinutes ?? 0)) / 60;
      if (hoursWorked > scheduledHours + 0.08) {
        overtimeHours = Math.round((hoursWorked - scheduledHours) * 100) / 100;
      }
    }

    const updated = await prisma.checkIn.update({
      where: { id: openCheckIn.id },
      data: {
        clockOut,
        status: "CLOCKED_OUT",
        hoursWorked: new Prisma.Decimal(hoursWorked.toFixed(2)),
        overtimeHours: overtimeHours != null ? new Prisma.Decimal(overtimeHours.toFixed(2)) : null,
        earlyDepartMinutes,
        note: note ?? openCheckIn.note,
      },
    });

    return NextResponse.json({
      ...updated,
      _meta: {
        overtimeHours,
        earlyDepartMinutes,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to process check-in" }, { status: 500 });
  }
}
