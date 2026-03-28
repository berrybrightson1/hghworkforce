import { NextResponse } from "next/server";
import { requireDbUser, canManage, gateCompanyBilling } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  if (!canManage(dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId") ?? dbUser.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const billing = await gateCompanyBilling(dbUser, companyId);
  if (billing) return billing;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [
    activeEmployeeCount,
    todayCheckins,
    pendingPayruns,
    pendingLeave,
    salaryData,
  ] = await prisma.$transaction([
    prisma.employee.count({
      where: { companyId, status: "ACTIVE" },
    }),
    prisma.checkIn.findMany({
      where: {
        companyId,
        clockIn: { gte: todayStart, lte: todayEnd },
      },
      select: { employeeId: true, lateMinutes: true },
    }),
    prisma.payrun.count({
      where: { companyId, status: "PENDING" },
    }),
    prisma.leaveRequest.count({
      where: {
        employee: { companyId },
        status: "PENDING",
      },
    }),
    prisma.employee.findMany({
      where: { companyId, status: "ACTIVE" },
      select: {
        basicSalary: true,
        salaryComponents: {
          where: {
            type: "ALLOWANCE",
            isRecurring: true,
            OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
          },
          select: { amount: true },
        },
      },
    }),
  ]);

  const checkedInEmployeeIds = new Set(todayCheckins.map((c) => c.employeeId));
  const present = todayCheckins.filter((c) => !c.lateMinutes || c.lateMinutes <= 0).length;
  const late = todayCheckins.filter((c) => c.lateMinutes && c.lateMinutes > 0).length;
  const absent = activeEmployeeCount - checkedInEmployeeIds.size;

  const monthSalaryLiability = salaryData.reduce((sum, emp) => {
    const basic = Number(emp.basicSalary);
    const allowances = emp.salaryComponents.reduce((a, c) => a + Number(c.amount), 0);
    return sum + basic + allowances;
  }, 0);

  return NextResponse.json({
    todayAttendance: { present, late, absent },
    pendingApprovals: pendingPayruns + pendingLeave,
    pendingPayruns,
    pendingLeave,
    monthSalaryLiability,
    activeEmployeeCount,
  });
}
