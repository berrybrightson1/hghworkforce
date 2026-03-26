import { NextResponse } from "next/server";
import { canManagePayroll, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { regeneratePayrunLines } from "@/lib/payroll-lines";

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  if (!canManagePayroll(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const payrun = await prisma.payrun.findUnique({ where: { id } });
    if (!payrun) {
      return NextResponse.json({ error: "Pay run not found" }, { status: 404 });
    }
    const billing = await gateCompanyBilling(auth.dbUser, payrun.companyId);
    if (billing) return billing;

    const result = await regeneratePayrunLines(id, auth.dbUser.id);
    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to generate lines";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
