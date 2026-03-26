import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { createElement } from "react";
import { gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { ReportDocument } from "@/components/payroll/ReportDocument";

export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = req.nextUrl;
  const companyId = searchParams.get("companyId");
  const employeeId = searchParams.get("employeeId");
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

  if (!companyId || !employeeId) {
    return NextResponse.json({ error: "companyId and employeeId required" }, { status: 400 });
  }
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });
    if (!employee || employee.companyId !== companyId) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const payrunLines = await prisma.payrunLine.findMany({
      where: {
        employeeId,
        payrun: {
          companyId,
          periodEnd: {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31),
          },
          status: "APPROVED",
        },
      },
      include: { payrun: true },
      orderBy: { payrun: { periodEnd: "asc" } },
    });

    const headers = [
      "Month",
      "Basic Salary",
      "Allowances",
      "Gross",
      "SSNIT (EE)",
      "Taxable Pay",
      "PAYE Tax",
      "Net Pay",
    ];

    const rows = payrunLines.map((l) => {
      const snap = l.salarySnapshot as Record<string, unknown> | null;
      return [
        l.payrun.periodEnd.toLocaleDateString("en-US", { month: "long" }),
        Number(snap?.basicSalary ?? 0).toFixed(2),
        Number(snap?.allowanceTotal ?? 0).toFixed(2),
        Number(l.grossPay).toFixed(2),
        Number(l.ssnitEmployee).toFixed(2),
        Number(l.taxablePay).toFixed(2),
        Number(l.payeTax).toFixed(2),
        Number(l.netPay).toFixed(2),
      ];
    });

    // Add Totals row
    const totals = payrunLines.reduce(
      (acc, l) => {
        const snap = l.salarySnapshot as Record<string, unknown> | null;
        acc.basic += Number(snap?.basicSalary ?? 0);
        acc.allowance += Number(snap?.allowanceTotal ?? 0);
        acc.gross += Number(l.grossPay);
        acc.ssnit += Number(l.ssnitEmployee);
        acc.taxable += Number(l.taxablePay);
        acc.paye += Number(l.payeTax);
        acc.net += Number(l.netPay);
        return acc;
      },
      { basic: 0, allowance: 0, gross: 0, ssnit: 0, taxable: 0, paye: 0, net: 0 },
    );

    rows.push([
      "TOTAL",
      totals.basic.toFixed(2),
      totals.allowance.toFixed(2),
      totals.gross.toFixed(2),
      totals.ssnit.toFixed(2),
      totals.taxable.toFixed(2),
      totals.paye.toFixed(2),
      totals.net.toFixed(2),
    ]);

    const reportData = {
      title: "P9A Tax Deduction Card",
      subtitle: `Employee: ${employee.name?.trim() || employee.user?.name || "Employee"} (${employee.employeeCode}) | Year: ${year}`,
      headers,
      rows,
    };

    const stream = await renderToStream(
      createElement(ReportDocument, { data: reportData }) as Parameters<typeof renderToStream>[0],
    );

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="P9A-${employee.employeeCode}-${year}.pdf"`,
      },
    });
  } catch (err) {
    console.error("P9A error:", err);
    return NextResponse.json({ error: "Failed to generate P9A" }, { status: 500 });
  }
}
