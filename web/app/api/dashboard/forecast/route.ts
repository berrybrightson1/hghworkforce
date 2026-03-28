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

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const [employees, lastApprovedPayrun, pendingPayrun] = await prisma.$transaction([
    prisma.employee.findMany({
      where: { companyId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        basicSalary: true,
        salaryComponents: {
          where: {
            type: "ALLOWANCE",
            isRecurring: true,
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
          select: { name: true, amount: true },
        },
      },
    }),
    prisma.payrun.findFirst({
      where: { companyId, status: "APPROVED" },
      orderBy: { periodEnd: "desc" },
      select: {
        id: true,
        periodEnd: true,
        isPaid: true,
        paidAt: true,
        scheduledPayDate: true,
      },
    }),
    prisma.payrun.findFirst({
      where: { companyId, status: { in: ["DRAFT", "PENDING"] } },
      orderBy: { periodEnd: "desc" },
      select: { scheduledPayDate: true, periodEnd: true },
    }),
  ]);

  const totalMonthlyLiability = employees.reduce((sum, emp) => {
    const basic = Number(emp.basicSalary);
    const allowances = emp.salaryComponents.reduce((a, c) => a + Number(c.amount), 0);
    return sum + basic + allowances;
  }, 0);

  // Calculate days until next payrun
  let daysUntilNextPayrun: number;
  if (pendingPayrun?.scheduledPayDate) {
    daysUntilNextPayrun = Math.max(
      0,
      Math.ceil((new Date(pendingPayrun.scheduledPayDate).getTime() - now.getTime()) / 86400000),
    );
  } else {
    // Default: last working day of current month
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const dayOfWeek = lastDay.getDay();
    if (dayOfWeek === 0) lastDay.setDate(lastDay.getDate() - 2);
    else if (dayOfWeek === 6) lastDay.setDate(lastDay.getDate() - 1);
    daysUntilNextPayrun = Math.max(0, Math.ceil((lastDay.getTime() - now.getTime()) / 86400000));
  }

  const breakdown = employees.map((emp) => ({
    name: emp.name ?? "Unnamed",
    basic: Number(emp.basicSalary),
    allowances: emp.salaryComponents.reduce((a, c) => a + Number(c.amount), 0),
    gross:
      Number(emp.basicSalary) +
      emp.salaryComponents.reduce((a, c) => a + Number(c.amount), 0),
  }));

  return NextResponse.json({
    totalMonthlyLiability,
    activeEmployeeCount: employees.length,
    daysUntilNextPayrun,
    lastPayrun: lastApprovedPayrun
      ? {
          id: lastApprovedPayrun.id,
          periodEnd: lastApprovedPayrun.periodEnd,
          isPaid: lastApprovedPayrun.isPaid,
          paidAt: lastApprovedPayrun.paidAt,
        }
      : null,
    breakdown,
    month: now.toLocaleDateString("en-GH", { month: "long", year: "numeric" }),
  });
}
