import { NextRequest, NextResponse } from "next/server";
import { canManageCheckinSecurity, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/** GET ?companyId= — pending + recent correction requests */
export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  if (!canManageCheckinSecurity(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const rows = await prisma.attendanceCorrectionRequest.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        employee: { select: { employeeCode: true, name: true } },
        checkIn: { select: { id: true, clockIn: true, clockOut: true } },
        requestedBy: { select: { name: true, email: true } },
      },
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}

/** POST — employees submit a correction for their own check-in */
export async function POST(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  let body: {
    checkInId?: string;
    reason?: string;
    proposedClockIn?: string | null;
    proposedClockOut?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const checkInId = body.checkInId?.trim();
  const reason = body.reason?.trim();
  if (!checkInId || !reason || reason.length < 3) {
    return NextResponse.json({ error: "checkInId and reason (min 3 chars) required" }, { status: 400 });
  }

  try {
    const checkIn = await prisma.checkIn.findUnique({
      where: { id: checkInId },
      include: { employee: { select: { id: true, companyId: true, userId: true } } },
    });
    if (!checkIn) {
      return NextResponse.json({ error: "Check-in not found" }, { status: 404 });
    }

    const billing = await gateCompanyBilling(auth.dbUser, checkIn.companyId);
    if (billing) return billing;

    if (auth.dbUser.role === "EMPLOYEE") {
      const emp = await prisma.employee.findUnique({
        where: { userId: auth.dbUser.id },
        select: { id: true },
      });
      if (!emp || emp.id !== checkIn.employeeId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (!canManageCheckinSecurity(auth.dbUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dup = await prisma.attendanceCorrectionRequest.findFirst({
      where: { checkInId, status: "PENDING" },
    });
    if (dup) {
      return NextResponse.json({ error: "A pending correction already exists for this check-in" }, { status: 409 });
    }

    const proposedClockIn = body.proposedClockIn ? new Date(body.proposedClockIn) : null;
    const proposedClockOut = body.proposedClockOut ? new Date(body.proposedClockOut) : null;

    const row = await prisma.attendanceCorrectionRequest.create({
      data: {
        checkInId,
        employeeId: checkIn.employeeId,
        companyId: checkIn.companyId,
        requestedByUserId: auth.dbUser.id,
        reason,
        proposedClockIn,
        proposedClockOut,
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to submit" }, { status: 500 });
  }
}
