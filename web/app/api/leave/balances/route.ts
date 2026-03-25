import { NextRequest, NextResponse } from "next/server";
import { canAccessCompany, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = req.nextUrl;
  const companyId = searchParams.get("companyId");
  const employeeId = searchParams.get("employeeId");

  if (!companyId) {
    return NextResponse.json({ error: "Company ID required" }, { status: 400 });
  }

  if (!canAccessCompany(auth.dbUser, companyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
      const empBalances = entitlements.map((ent) => {
        const used = approvedRequests
          .filter((r) => r.employeeId === emp.id && r.type === ent.leaveType)
          .reduce((sum, r) => sum + r.days, 0);

        return {
          type: ent.leaveType,
          entitled: ent.days,
          used,
          remaining: ent.days - used,
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
