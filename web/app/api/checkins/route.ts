import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireDbUser, gateCompanyBilling } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { wallMinutesFromDateInZone } from "@/lib/shift-wall-time";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Minutes elapsed from midnight for an HH:mm string. */
function hhmToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

// ── GET ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/checkins?companyId=...&date=YYYY-MM-DD&employeeId=...&status=...
 * Returns check-in records for a company, optionally filtered by date/employee.
 */
export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = req.nextUrl;
    const companyId = searchParams.get("companyId");
    const date = searchParams.get("date");
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");

    const where: Prisma.CheckInWhereInput = {};

    if (auth.dbUser.role === "EMPLOYEE") {
      const emp = await prisma.employee.findUnique({
        where: { userId: auth.dbUser.id },
        select: { id: true, companyId: true },
      });
      if (!emp) {
        return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
      }
      const billing = await gateCompanyBilling(auth.dbUser, emp.companyId);
      if (billing) return billing;
      where.companyId = emp.companyId;
      where.employeeId = emp.id;
    } else {
      const effectiveCompanyId = companyId ?? auth.dbUser.companyId;
      if (!effectiveCompanyId) {
        return NextResponse.json(
          { error: "companyId query parameter is required" },
          { status: 400 },
        );
      }
      const billing = await gateCompanyBilling(auth.dbUser, effectiveCompanyId);
      if (billing) return billing;
      where.companyId = effectiveCompanyId;

      if (employeeId) {
        const empInCo = await prisma.employee.findFirst({
          where: { id: employeeId, companyId: effectiveCompanyId },
          select: { id: true },
        });
        if (!empInCo) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        where.employeeId = employeeId;
      }
    }

    if (date) {
      const dayStart = new Date(`${date}T00:00:00.000Z`);
      const dayEnd = new Date(`${date}T23:59:59.999Z`);
      where.clockIn = { gte: dayStart, lte: dayEnd };
    }

    if (status === "CLOCKED_IN" || status === "CLOCKED_OUT") {
      where.status = status;
    }

    const checkins = await prisma.checkIn.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            name: true,
            department: true,
            jobTitle: true,
            user: { select: { name: true } },
          },
        },
        shiftAssignment: {
          include: {
            shift: { select: { name: true, startTime: true, endTime: true } },
          },
        },
      },
      orderBy: { clockIn: "desc" },
      take: 200,
    });

    return NextResponse.json(checkins);
  } catch {
    return NextResponse.json({ error: "Failed to load check-ins" }, { status: 500 });
  }
}

// ── POST ─────────────────────────────────────────────────────────────────────

/**
 * POST /api/checkins
 * Body: { action: "clock-in" | "clock-out", note?, sessionId? }
 * Employees clock in/out from the portal. Only one open check-in at a time.
 * - Auto-links to active shift assignment.
 * - Computes tardiness on clock-in, overtime/early departure on clock-out.
 */
export async function POST(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const action = body.action as string;
    const note = body.note as string | undefined;
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;

    if (action !== "clock-in" && action !== "clock-out") {
      return NextResponse.json(
        { error: "action must be 'clock-in' or 'clock-out'" },
        { status: 400 },
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: auth.dbUser.id },
      select: { id: true, companyId: true, status: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
    }
    if (employee.status !== "ACTIVE") {
      return NextResponse.json({ error: "Employee account is not active" }, { status: 403 });
    }

    const billingGate = await gateCompanyBilling(auth.dbUser, employee.companyId);
    if (billingGate) return billingGate;

    const company = await prisma.company.findUnique({
      where: { id: employee.companyId },
      select: {
        checkinEnterpriseEnabled: true,
        kioskTimezone: true,
      },
    });

    const companyTz = company?.kioskTimezone || "Africa/Accra";

    let activeSession: { id: string } | null = null;
    if (company?.checkinEnterpriseEnabled) {
      if (!sessionId) {
        return NextResponse.json(
          { error: "sessionId is required when enterprise check-in is enabled" },
          { status: 400 },
        );
      }
      const s = await prisma.checkinSession.findFirst({
        where: { id: sessionId, employeeId: employee.id, endedAt: null },
        select: { id: true },
      });
      if (!s) {
        return NextResponse.json({ error: "Invalid or closed check-in session" }, { status: 400 });
      }
      activeSession = s;
    }

    // ── Find active shift assignment for today ──
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setUTCHours(0, 0, 0, 0);

    const activeAssignment = await prisma.shiftAssignment.findFirst({
      where: {
        employeeId: employee.id,
        startDate: { lte: now },
        OR: [{ endDate: null }, { endDate: { gte: todayStart } }],
      },
      include: {
        shift: { select: { startTime: true, endTime: true, breakMinutes: true } },
      },
      orderBy: { startDate: "desc" },
    });

    if (action === "clock-in") {
      const openCheckIn = await prisma.checkIn.findFirst({
        where: { employeeId: employee.id, status: "CLOCKED_IN" },
      });
      if (openCheckIn) {
        return NextResponse.json(
          { error: "Already clocked in. Please clock out first.", existing: openCheckIn },
          { status: 409 },
        );
      }

      // ── Tardiness ──
      let lateMinutes: number | null = null;
      if (activeAssignment?.shift) {
        const shiftStartMins = hhmToMinutes(activeAssignment.shift.startTime);
        const clockInMins = wallMinutesFromDateInZone(now, companyTz);
        const diff = clockInMins - shiftStartMins;
        if (diff > 5) {
          lateMinutes = diff;
        }
      }

      const checkIn = await prisma.checkIn.create({
        data: {
          employeeId: employee.id,
          companyId: employee.companyId,
          clockIn: now,
          status: "CLOCKED_IN",
          lateMinutes,
          shiftAssignmentId: activeAssignment?.id ?? null,
          note: note || null,
          checkinSessionId: activeSession?.id ?? null,
        },
      });

      if (activeSession) {
        await prisma.checkinEvent.create({
          data: { sessionId: activeSession.id, type: "CLOCK_IN" },
        });
      }

      return NextResponse.json(
        {
          ...checkIn,
          _meta: {
            lateMinutes,
            shiftName: activeAssignment?.shift
              ? `${activeAssignment.shift.startTime} - ${activeAssignment.shift.endTime}`
              : null,
          },
        },
        { status: 201 },
      );
    }

    // ── Clock-out ──
    const openCheckIn = await prisma.checkIn.findFirst({
      where: { employeeId: employee.id, status: "CLOCKED_IN" },
      orderBy: { clockIn: "desc" },
      include: {
        shiftAssignment: {
          include: { shift: { select: { startTime: true, endTime: true, breakMinutes: true } } },
        },
      },
    });

    if (!openCheckIn) {
      return NextResponse.json({ error: "No open check-in found" }, { status: 404 });
    }

    if (
      company?.checkinEnterpriseEnabled &&
      openCheckIn.checkinSessionId &&
      sessionId !== openCheckIn.checkinSessionId
    ) {
      return NextResponse.json(
        { error: "Session does not match this check-in" },
        { status: 400 },
      );
    }

    const clockOut = new Date();
    const diffMs = clockOut.getTime() - openCheckIn.clockIn.getTime();
    const hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

    let overtimeHours: number | null = null;
    let earlyDepartMinutes: number | null = null;

    const shift = openCheckIn.shiftAssignment?.shift ?? activeAssignment?.shift;
    if (shift) {
      const shiftEndMins = hhmToMinutes(shift.endTime);
      const clockOutMins = wallMinutesFromDateInZone(clockOut, companyTz);

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
        note: note || openCheckIn.note,
      },
    });

    if (activeSession) {
      await prisma.checkinEvent.create({
        data: { sessionId: activeSession.id, type: "CLOCK_OUT" },
      });
      await prisma.checkinSession.update({
        where: { id: activeSession.id },
        data: { endedAt: clockOut },
      });
    }

    return NextResponse.json({
      ...updated,
      _meta: { overtimeHours, earlyDepartMinutes },
    });
  } catch {
    return NextResponse.json({ error: "Failed to process check-in" }, { status: 500 });
  }
}
