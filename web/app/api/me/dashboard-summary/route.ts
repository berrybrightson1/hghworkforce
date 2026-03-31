import { NextResponse } from "next/server";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/** Single round-trip snapshot for portal home. */
export async function GET() {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;

  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  const eid = self.employee.id;

  try {
    const [
      lastPayslip,
      unreadNotifications,
      shifts,
      pendingLeave,
      pendingLoans,
      pendingCorrections,
    ] = await prisma.$transaction([
      prisma.payslip.findFirst({
        where: { employeeId: eid },
        orderBy: { createdAt: "desc" },
        include: {
          payrunLine: {
            include: { payrun: { select: { periodStart: true, periodEnd: true } } },
          },
        },
      }),
      prisma.portalNotification.count({ where: { employeeId: eid, isRead: false } }),
      prisma.shiftAssignment.findMany({
        where: { employeeId: eid, endDate: null },
        include: {
          shift: {
            select: { name: true, startTime: true, endTime: true, breakMinutes: true },
          },
        },
        take: 5,
        orderBy: { startDate: "asc" },
      }),
      prisma.leaveRequest.count({
        where: { employeeId: eid, status: "PENDING" },
      }),
      prisma.loan.count({
        where: { employeeId: eid, status: "PENDING" },
      }),
      prisma.attendanceCorrectionRequest.count({
        where: { employeeId: eid, status: "PENDING" },
      }),
    ]);

    return NextResponse.json({
      lastPayslip,
      unreadNotifications,
      shifts,
      pendingLeave,
      pendingLoans,
      pendingCorrections,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load summary" }, { status: 500 });
  }
}
