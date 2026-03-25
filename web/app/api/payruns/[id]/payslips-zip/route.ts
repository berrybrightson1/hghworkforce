import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import JSZip from "jszip";
import { canAccessCompany, requireDbUser } from "@/lib/api-auth";
import { buildPayslipPdfData } from "@/lib/payslip-pdf-data";
import { prisma } from "@/lib/prisma";
import { PayslipDocument } from "@/components/payroll/PayslipDocument";

export const runtime = "nodejs";

/**
 * GET /api/payruns/[id]/payslips-zip
 * ZIP of all payslip PDFs for an approved payrun (HR / admins only).
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const { id: payrunId } = await ctx.params;

  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    include: {
      company: true,
      lines: {
        include: {
          employee: { include: { user: true } },
        },
      },
    },
  });

  if (!payrun) {
    return NextResponse.json({ error: "Pay run not found" }, { status: 404 });
  }

  if (!canAccessCompany(auth.dbUser, payrun.companyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (payrun.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Only approved pay runs can be exported as payslip ZIP" },
      { status: 400 },
    );
  }

  if (payrun.lines.length === 0) {
    return NextResponse.json({ error: "No payroll lines to export" }, { status: 400 });
  }

  const zip = new JSZip();
  const periodSlug = payrun.periodEnd.toISOString().split("T")[0];

  for (const line of payrun.lines) {
    const data = buildPayslipPdfData(line, payrun);
    const doc = createElement(PayslipDocument, { data });
    const buf = await renderToBuffer(doc as Parameters<typeof renderToBuffer>[0]);
    const safeCode = line.employee.employeeCode.replace(/[^\w.-]+/g, "_");
    zip.file(`payslip-${safeCode}-${periodSlug}.pdf`, buf);
  }

  const bytes = await zip.generateAsync({ type: "uint8array" });
  const filename = `payslips-${payrun.company.name.replace(/[^\w.-]+/g, "_")}-${periodSlug}.zip`;

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
