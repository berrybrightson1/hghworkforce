import { NextRequest, NextResponse } from "next/server";
import { AnonymousFeedbackStatus } from "@prisma/client";
import { canManage, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { companyId } = await ctx.params;
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;
  if (!canManage(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.anonymousFeedback.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { reviewedBy: { select: { name: true } } },
  });
  return NextResponse.json(rows);
}
