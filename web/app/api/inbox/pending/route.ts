import { NextRequest, NextResponse } from "next/server";
import { canManage, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET ?companyId= — pending leave + attendance corrections for HR inbox.
 */
export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (!canManage(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  const scope = req.nextUrl.searchParams.get("scope") === "team" ? "team" : "all";
  let teamEmployeeIds: string[] | null = null;
  if (scope === "team") {
    const rows = await prisma.employee.findMany({
      where: { companyId, deletedAt: null, managedByUserId: auth.dbUser.id },
      select: { id: true },
    });
    teamEmployeeIds = rows.map((r) => r.id);
    if (teamEmployeeIds.length === 0) {
      return NextResponse.json({
        leaveRequests: [],
        attendanceCorrections: [],
        loanRequests: [],
        scope,
      });
    }
  }

  const employeeFilter =
    teamEmployeeIds != null ? { employeeId: { in: teamEmployeeIds } } : undefined;
  const leaveEmployeeNested = teamEmployeeIds != null
    ? { id: { in: teamEmployeeIds }, companyId, deletedAt: null }
    : { companyId, deletedAt: null };

  try {
    const [leaveRequests, attendanceCorrections, loanRequests] = await prisma.$transaction([
      prisma.leaveRequest.findMany({
        where: {
          status: "PENDING",
          employee: leaveEmployeeNested,
        },
        orderBy: { createdAt: "asc" },
        take: 100,
        include: {
          employee: { select: { id: true, employeeCode: true, name: true, department: true } },
        },
      }),
      prisma.attendanceCorrectionRequest.findMany({
        where: {
          status: "PENDING",
          companyId,
          ...(employeeFilter ?? {}),
        },
        orderBy: { createdAt: "asc" },
        take: 100,
        include: {
          employee: { select: { id: true, employeeCode: true, name: true } },
          checkIn: { select: { id: true, clockIn: true, clockOut: true } },
        },
      }),
      prisma.loan.findMany({
        where: {
          status: "PENDING",
          employee: leaveEmployeeNested,
        },
        orderBy: { createdAt: "asc" },
        take: 100,
        include: {
          employee: { select: { id: true, employeeCode: true, name: true, department: true } },
        },
      }),
    ]);

    return NextResponse.json({
      leaveRequests,
      attendanceCorrections,
      loanRequests,
      scope,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load inbox" }, { status: 500 });
  }
}
