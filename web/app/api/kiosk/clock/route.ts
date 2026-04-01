import { NextRequest, NextResponse } from "next/server";
import { companyHasFullAccess } from "@/lib/billing/access";
import { prisma } from "@/lib/prisma";
import { tryClockIn, tryClockOut } from "@/lib/checkin-clock";

/**
 * POST /api/kiosk/clock
 * Body: { challengeId, code, action: "clock-in" | "clock-out", note? }
 *
 * Verifies the 6-digit code from the device-bound challenge, then clocks in/out
 * via shared tryClockIn / tryClockOut (kiosk is the only supported channel for employees).
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

    await prisma.kioskChallenge.update({
      where: { id: challengeId },
      data: { consumed: true },
    });

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
        referralAccessUntil: true,
        checkinEnterpriseEnabled: true,
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

    const gateFields = {
      kioskTimezone: company.kioskTimezone ?? null,
      kioskOfficeOpensAt: company.kioskOfficeOpensAt ?? null,
      kioskOfficeClosesAt: company.kioskOfficeClosesAt ?? null,
      kioskCutoffTime: company.kioskCutoffTime ?? null,
    };

    if (action === "clock-in") {
      const result = await tryClockIn({
        employeeId: employee.id,
        companyId: employee.companyId,
        note: note ?? null,
        checkinSessionId: null,
        company: gateFields,
      });
      if (!result.ok) {
        const payload: Record<string, unknown> = { error: result.error };
        if (result.status === 409) payload.clockedIn = true;
        return NextResponse.json(payload, { status: result.status });
      }

      return NextResponse.json(
        {
          ...result.checkIn,
          _meta: {
            lateMinutes: result._meta.lateMinutes,
            publicHoliday: result._meta.publicHoliday,
            shiftName: result._meta.shiftName,
          },
        },
        { status: 201 },
      );
    }

    const result = await tryClockOut({
      employeeId: employee.id,
      companyId: employee.companyId,
      company: {
        ...gateFields,
        checkinEnterpriseEnabled: Boolean(company.checkinEnterpriseEnabled),
      },
      sessionId: null,
      note: note ?? null,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json({
      ...result.updated,
      _meta: result._meta,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to process check-in" }, { status: 500 });
  }
}
