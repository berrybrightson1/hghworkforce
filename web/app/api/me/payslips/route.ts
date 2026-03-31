import { NextResponse } from "next/server";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;

  try {
    const { employee, via, dbUser } = self;

    const billing = await gateBillingForEmployeeSelf(employee, via, dbUser);
    if (billing) return billing;

    const payslips = await prisma.payslip.findMany({
      where: { employeeId: employee.id },
      include: {
        payrunLine: {
          include: {
            payrun: {
              select: { periodStart: true, periodEnd: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(payslips);
  } catch {
    return NextResponse.json({ error: "Failed to load payslips" }, { status: 500 });
  }
}
