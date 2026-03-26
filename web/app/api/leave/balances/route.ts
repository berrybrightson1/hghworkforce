import { NextRequest, NextResponse } from "next/server";
import { gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

function monthsEmployedApprox(start: Date): number {
  const now = new Date();
  let m =
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) m -= 1;
  return Math.max(0, m);
}

export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = req.nextUrl;
  const companyId = searchParams.get("companyId");
  const employeeId = searchParams.get("employeeId");

  if (!companyId) {
    return NextResponse.json({ error: "Company ID required" }, { status: 400 });
  }

  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  try {
    const entitlements = await prisma.leaveEntitlement.findMany({
      where: { companyId, isActive: true },
    });

    const approvedRequests = await prisma.leaveRequest.findMany({
      where: {
        ...(employeeId ? { employeeId } : { employee: { companyId } }),
        status: "APPROVED",
      },
      select: { employeeId: true, type: true, days: true },
    });

    const employees = employeeId
      ? await prisma.employee.findMany({
          where: { id: employeeId },
          include: { user: { select: { name: true } } },
        })
      : await prisma.employee.findMany({
          where: { companyId, status: "ACTIVE" },
          include: { user: { select: { name: true } } },
        });

    const balances = employees.map((emp) => {
      const months = monthsEmployedApprox(new Date(emp.startDate));
      const empBalances = entitlements.map((ent) => {
        const used = approvedRequests
          .filter((r) => r.employeeId === emp.id && r.type === ent.leaveType)
          .reduce((sum, r) => sum + r.days, 0);

        const accrual =
          ent.monthlyAccrualRate !== null && ent.monthlyAccrualRate !== undefined
            ? Number(ent.monthlyAccrualRate) * months
            : 0;
        let entitled = ent.days + Math.round(accrual * 100) / 100;
        if (ent.maxBalanceDays !== null && ent.maxBalanceDays !== undefined) {
          entitled = Math.min(entitled, ent.maxBalanceDays);
        }

        return {
          type: ent.leaveType,
          entitled,
          used,
          remaining: Math.round((entitled - used) * 100) / 100,
        };
      });

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        name: emp.name,
        user: emp.user,
        balances: empBalances,
      };
    });

    return NextResponse.json(employeeId ? balances[0] : balances);
  } catch (err) {
    console.error("Balance error:", err);
    return NextResponse.json({ error: "Failed to load balances" }, { status: 500 });
  }
}
