import { NextResponse } from "next/server";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ noticeId: string }> },
) {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;
  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  const { noticeId } = await ctx.params;
  const n = await prisma.companyNotice.findFirst({
    where: { id: noticeId, companyId: self.employee.companyId },
  });
  if (!n) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.noticeReceipt.upsert({
    where: {
      noticeId_employeeId: { noticeId, employeeId: self.employee.id },
    },
    create: { noticeId, employeeId: self.employee.id },
    update: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
