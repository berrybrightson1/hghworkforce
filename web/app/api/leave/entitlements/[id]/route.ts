import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { canManageLeave, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  if (!canManageLeave(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  let body: { days?: number; monthlyAccrualRate?: number | null; maxBalanceDays?: number | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const row = await prisma.leaveEntitlement.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const billing = await gateCompanyBilling(auth.dbUser, row.companyId);
    if (billing) return billing;

    const data: Prisma.LeaveEntitlementUpdateInput = {};
    if (body.days !== undefined) data.days = body.days;
    if (body.monthlyAccrualRate !== undefined) {
      data.monthlyAccrualRate =
        body.monthlyAccrualRate === null ? null : new Prisma.Decimal(body.monthlyAccrualRate);
    }
    if (body.maxBalanceDays !== undefined) {
      data.maxBalanceDays = body.maxBalanceDays;
    }

    const updated = await prisma.leaveEntitlement.update({
      where: { id },
      data,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
