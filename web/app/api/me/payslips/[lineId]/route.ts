import { NextRequest, NextResponse } from "next/server";
import { buildPayslipPdfData } from "@/lib/payslip-pdf-data";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * JSON preview of a payslip line (same structure as PDF) for the signed-in employee only.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ lineId: string }> },
) {
  const { lineId } = await ctx.params;

  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;

  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  try {
    const line = await prisma.payrunLine.findFirst({
      where: { id: lineId, employeeId: self.employee.id },
      include: {
        employee: { include: { user: true } },
        payrun: { include: { company: true } },
      },
    });

    if (!line) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const payslip = await prisma.payslip.findFirst({
      where: { payrunLineId: lineId, employeeId: self.employee.id },
      select: { id: true, createdAt: true },
    });

    const data = buildPayslipPdfData(line, line.payrun);
    return NextResponse.json({
      payslipId: payslip?.id ?? null,
      generatedAt: payslip?.createdAt?.toISOString() ?? null,
      ...data,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load payslip" }, { status: 500 });
  }
}
