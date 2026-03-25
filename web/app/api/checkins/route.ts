import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireDbUser, canAccessCompany } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getClientIpFromRequest } from "@/lib/checkin-ip";
import { assertCompanyCheckinIpAllowed } from "@/lib/checkin-enforcement";
import { faceDescriptorsMatch, parseFaceDescriptor } from "@/lib/face-math";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Haversine distance in metres between two lat/lng points. */
function haversineMetres(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000; // earth radius in metres
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Parse "HH:mm" into { hours, minutes }. */
function parseHHmm(t: string) {
  const [h, m] = t.split(":").map(Number);
  return { hours: h, minutes: m };
}

/** Minutes elapsed from midnight for an HH:mm string. */
function hhmToMinutes(t: string) {
  const { hours, minutes } = parseHHmm(t);
  return hours * 60 + minutes;
}

/** Minutes elapsed from midnight for a Date (in UTC). */
function dateToMinutesUTC(d: Date) {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
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

    if (companyId) {
      if (!canAccessCompany(auth.dbUser, companyId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      where.companyId = companyId;
    } else if (auth.dbUser.companyId) {
      where.companyId = auth.dbUser.companyId;
    }

    // If employee role, scope to own records only
    if (auth.dbUser.role === "EMPLOYEE") {
      const emp = await prisma.employee.findUnique({
        where: { userId: auth.dbUser.id },
        select: { id: true },
      });
      if (!emp) {
        return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
      }
      where.employeeId = emp.id;
    } else if (employeeId) {
      where.employeeId = employeeId;
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
 * Body: { action: "clock-in" | "clock-out", lat?, lng?, note?, sessionId?, faceDescriptor? }
 * Employees clock in/out. Only one open check-in at a time.
 * - Validates GPS against company geofence (if configured).
 * - Enterprise: IP allowlist, CheckinSession + events, optional face descriptor match.
 * - Auto-links to active shift assignment.
 * - Computes tardiness on clock-in, overtime/early departure on clock-out.
 */
export async function POST(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const action = body.action as string;
    const lat = body.lat as number | undefined;
    const lng = body.lng as number | undefined;
    const note = body.note as string | undefined;
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : undefined;
    const faceDescriptorRaw = body.faceDescriptor;

    if (action !== "clock-in" && action !== "clock-out") {
      return NextResponse.json(
        { error: "action must be 'clock-in' or 'clock-out'" },
        { status: 400 },
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: auth.dbUser.id },
      select: { id: true, companyId: true, status: true, faceDescriptor: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
    }
    if (employee.status !== "ACTIVE") {
      return NextResponse.json({ error: "Employee account is not active" }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: employee.companyId },
      select: {
        officeLat: true,
        officeLng: true,
        geofenceRadius: true,
        checkinLockToFirstIp: true,
        checkinBoundIp: true,
        checkinEnterpriseEnabled: true,
        checkinEnforceIpAllowlist: true,
        checkinRequireFaceVerification: true,
        checkinFaceDistanceThreshold: true,
        checkinMaxFaceAttempts: true,
        allowedIps: { select: { address: true } },
      },
    });

    const clientIp = getClientIpFromRequest(req);
    if (company) {
      const ipOk = await assertCompanyCheckinIpAllowed({
        companyId: employee.companyId,
        company,
        clientIp,
        actorId: auth.dbUser.id,
      });
      if (!ipOk.ok) {
        await prisma.auditLog.create({
          data: {
            actorId: auth.dbUser.id,
            action: "CHECKIN_IP_BLOCKED",
            entityType: "Company",
            entityId: employee.companyId,
            afterState: { reason: ipOk.logReason, clientIp, source: "checkins_api" },
            ipAddress: clientIp,
          },
        });
        return NextResponse.json(
          {
            error:
              ipOk.reason === "ip_mismatch"
                ? "Check-in is only allowed from your company’s registered work PC."
                : "Check-in not allowed from this network",
            reason: ipOk.reason,
          },
          { status: 403 },
        );
      }
    }

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

    const threshold =
      company?.checkinFaceDistanceThreshold != null
        ? Number(company.checkinFaceDistanceThreshold)
        : 0.55;
    const maxFaceAttempts = company?.checkinMaxFaceAttempts ?? 3;

    async function runFaceGate(): Promise<NextResponse | null> {
      const emp = employee;
      if (!emp) return null;
      if (!company?.checkinRequireFaceVerification) return null;
      const stored = parseFaceDescriptor(emp.faceDescriptor);
      if (!stored) {
        return NextResponse.json(
          {
            error: "Face profile not enrolled yet.",
            hint:
              "Open Portal → Check-in and use Register your face, or ask a Company Admin to register it on your employee profile.",
          },
          { status: 403 },
        );
      }
      const sample = parseFaceDescriptor(faceDescriptorRaw);
      if (!sample) {
        return NextResponse.json(
          { error: "Face verification required for this company" },
          { status: 400 },
        );
      }
      if (faceDescriptorsMatch(sample, stored, threshold)) {
        if (activeSession) {
          await prisma.checkinEvent.create({
            data: { sessionId: activeSession.id, type: "FACE_MATCH_OK" },
          });
        }
        return null;
      }

      if (activeSession) {
        await prisma.checkinEvent.create({
          data: {
            sessionId: activeSession.id,
            type: "FACE_MATCH_FAIL",
            metadata: { threshold },
          },
        });
        const updatedSession = await prisma.checkinSession.update({
          where: { id: activeSession.id },
          data: { faceFailCount: { increment: 1 } },
          select: { faceFailCount: true },
        });
        if (updatedSession.faceFailCount >= maxFaceAttempts) {
          await prisma.faceMismatchAlert.create({
            data: {
              employeeId: emp.id,
              companyId: emp.companyId,
              checkinSessionId: activeSession.id,
              metadata: { faceFailCount: updatedSession.faceFailCount },
            },
          });
        }
      }
      return NextResponse.json({ error: "Face did not match enrolled profile" }, { status: 403 });
    }

    // ── Geofence check ──
    let outsideGeofence = false;
    if (
      company?.officeLat &&
      company?.officeLng &&
      company?.geofenceRadius &&
      lat != null &&
      lng != null
    ) {
      const distance = haversineMetres(
        Number(company.officeLat),
        Number(company.officeLng),
        lat,
        lng,
      );
      outsideGeofence = distance > company.geofenceRadius;
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
      // Check for existing open check-in
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
        const clockInMins = dateToMinutesUTC(now);
        const diff = clockInMins - shiftStartMins;
        // Only flag as late if more than 5 min grace period
        if (diff > 5) {
          lateMinutes = diff;
        }
      }

      const faceRejectIn = await runFaceGate();
      if (faceRejectIn) return faceRejectIn;

      const checkIn = await prisma.checkIn.create({
        data: {
          employeeId: employee.id,
          companyId: employee.companyId,
          clockIn: now,
          status: "CLOCKED_IN",
          clockInLat: lat != null ? new Prisma.Decimal(lat.toFixed(7)) : null,
          clockInLng: lng != null ? new Prisma.Decimal(lng.toFixed(7)) : null,
          outsideGeofence,
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
            outsideGeofence,
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

    const faceRejectOut = await runFaceGate();
    if (faceRejectOut) return faceRejectOut;

    const clockOut = new Date();
    const diffMs = clockOut.getTime() - openCheckIn.clockIn.getTime();
    const hoursWorked = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

    // ── Overtime & early departure ──
    let overtimeHours: number | null = null;
    let earlyDepartMinutes: number | null = null;

    const shift = openCheckIn.shiftAssignment?.shift ?? activeAssignment?.shift;
    if (shift) {
      const shiftEndMins = hhmToMinutes(shift.endTime);
      const clockOutMins = dateToMinutesUTC(clockOut);

      // Early departure: left before shift end (more than 5 min grace)
      if (shiftEndMins - clockOutMins > 5) {
        earlyDepartMinutes = shiftEndMins - clockOutMins;
      }

      // Overtime: worked past shift end
      const shiftStartMins = hhmToMinutes(shift.startTime);
      const scheduledHours = (shiftEndMins - shiftStartMins - (shift.breakMinutes ?? 0)) / 60;
      if (hoursWorked > scheduledHours + 0.08) {
        // 0.08h ~ 5min grace
        overtimeHours = Math.round((hoursWorked - scheduledHours) * 100) / 100;
      }
    }

    const updated = await prisma.checkIn.update({
      where: { id: openCheckIn.id },
      data: {
        clockOut,
        status: "CLOCKED_OUT",
        clockOutLat: lat != null ? new Prisma.Decimal(lat.toFixed(7)) : null,
        clockOutLng: lng != null ? new Prisma.Decimal(lng.toFixed(7)) : null,
        outsideGeofence: outsideGeofence || openCheckIn.outsideGeofence,
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
      _meta: {
        outsideGeofence: outsideGeofence || openCheckIn.outsideGeofence,
        overtimeHours,
        earlyDepartMinutes,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to process check-in" }, { status: 500 });
  }
}
