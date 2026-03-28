import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { companyHasFullAccess } from "@/lib/billing/access";
import { prisma } from "@/lib/prisma";
import {
  evaluateKioskClockInGate,
  localDateString,
  startOfLocalDayUtc,
  endOfLocalDayUtc,
} from "@/lib/kiosk-time";
import { wallMinutesFromDateInZone } from "@/lib/shift-wall-time";

function hhmToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/**
 * POST /api/kiosk/clock
 * Body: { challengeId, code, action: "clock-in" | "clock-out", note? }
 *
 * Verifies the 6-digit code from the device-bound challenge, then clocks in/out.
 */
export async function POST(req: NextRequest) {
  let body: {
    challengeId?: string;
    code?: string;
    action?: string;
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const challengeId = typeof body.challengeId === "string" ? body.challengeId : "";
  const code = typeof body.code === "string" ? body.code : "";
  const action = body.action;
  const note = typeof body.note === "string" ? body.note : undefined;

  if (!challengeId || !code) {
    return NextResponse.json({ error: "challengeId and code are required" }, { status: 400 });
  }
  if (action !== "clock-in" && action !== "clock-out") {
    return NextResponse.json({ error: "action must be clock-in or clock-out" }, { status: 400 });
  }

  try {
    // Verify the challenge
    const challenge = await prisma.kioskChallenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Invalid or expired session — start again" }, { status: 401 });
    }
    if (challenge.consumed) {
      return NextResponse.json({ error: "This code has already been used — start again" }, { status: 401 });
    }
    if (new Date() > challenge.expiresAt) {
      return NextResponse.json({ error: "Code expired — go back and generate a new one" }, { status: 401 });
    }
    if (!challenge.deviceVerified) {
      return NextResponse.json({ error: "Scan the QR code with your phone first" }, { status: 403 });
    }
    if (challenge.code !== code) {
      return NextResponse.json({ error: "Incorrect code — check your phone and try again" }, { status: 403 });
    }

    // Mark challenge as consumed
    await prisma.kioskChallenge.update({
      where: { id: challengeId },
      data: { consumed: true },
    });

    // Load company
    const company = await prisma.company.findUnique({
      where: { id: challenge.companyId },
      select: {
        kioskOfficeOpensAt: true,
        kioskOfficeClosesAt: true,
        kioskCutoffTime: true,
        kioskTimezone: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        createdAt: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (!companyHasFullAccess(company)) {
      return NextResponse.json(
        {
          error:
            "This workspace's free trial has ended. Ask your administrator to subscribe before check-in is available again.",
          code: "SUBSCRIPTION_REQUIRED",
        },
        { status: 402 },
      );
    }

    // Load employee
    const employee = await prisma.employee.findUnique({
      where: { id: challenge.employeeId },
      select: { id: true, companyId: true, status: true },
    });

    if (!employee || employee.companyId !== challenge.companyId) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }
    if (employee.status !== "ACTIVE") {
      return NextResponse.json({ error: "Employee is not active" }, { status: 403 });
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
        const clockInMins = wallMinutesFromDateInZone(now, tz);
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

    // clock-out
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
      _meta: { overtimeHours, earlyDepartMinutes },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to process check-in" }, { status: 500 });
  }
}
