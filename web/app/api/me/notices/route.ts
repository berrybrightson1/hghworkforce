import { NextResponse } from "next/server";
import { CompanyNoticeStatus } from "@prisma/client";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;
  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  const now = new Date();
  const notices = await prisma.companyNotice.findMany({
    where: {
      companyId: self.employee.companyId,
      status: CompanyNoticeStatus.PUBLISHED,
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    },
    orderBy: { publishedAt: "desc" },
    take: 50,
    include: {
      receipts: {
        where: { employeeId: self.employee.id },
        select: { readAt: true },
      },
    },
  });

  return NextResponse.json(
    notices.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      publishedAt: n.publishedAt,
      readAt: n.receipts[0]?.readAt ?? null,
    })),
  );
}
