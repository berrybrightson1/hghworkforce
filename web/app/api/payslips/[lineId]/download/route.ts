import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { createElement } from "react";
import {
  canAccessCompany,
  canManagePayroll,
  gateCompanyBilling,
  requireDbUser,
} from "@/lib/api-auth";
import { buildPayslipPdfData } from "@/lib/payslip-pdf-data";
import { prisma } from "@/lib/prisma";
import { PayslipDocument } from "@/components/payroll/PayslipDocument";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ lineId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { lineId } = await ctx.params;

  try {
    const line = await prisma.payrunLine.findUnique({
      where: { id: lineId },
      include: {
        payrun: {
          include: {
            company: true,
          },
        },
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!line) {
      return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
    }

    const isSelf = auth.dbUser.id === line.employee.userId;
    const isPayrollStaff =
      canManagePayroll(auth.dbUser.role) && canAccessCompany(auth.dbUser, line.payrun.companyId);

    if (!isSelf && !isPayrollStaff) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const billing = await gateCompanyBilling(auth.dbUser, line.payrun.companyId);
    if (billing) return billing;

    if (line.payrun.status !== "APPROVED") {
      return NextResponse.json({ error: "Payslip not yet available" }, { status: 400 });
    }

    const data = buildPayslipPdfData(line, line.payrun);

    const stream = await renderToStream(
      createElement(PayslipDocument, { data }) as Parameters<typeof renderToStream>[0],
    );

    // Update download count (optional)
    await prisma.payslip.update({
      where: { payrunLineId: lineId },
      data: { downloadCount: { increment: 1 } },
    }).catch(() => {});

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="payslip-${line.employee.employeeCode}-${line.payrun.periodEnd.toISOString().split("T")[0]}.pdf"`,
      },
    });
  } catch (err) {
    console.error("PDF generation error:", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
