import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { createElement } from "react";
import { gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { ReportDocument } from "@/components/payroll/ReportDocument";

function csvEscape(s: string | number): string {
  const str = String(s);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ key: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const { key } = await ctx.params;
  const { searchParams } = req.nextUrl;
  const companyId = searchParams.get("companyId");
  const payrunId = searchParams.get("payrunId");
  const format = searchParams.get("format") || "csv";

  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  const lineReports = [
    "payroll-summary",
    "ssnit",
    "paye",
    "bank-schedule",
  ] as const;

  try {
    let reportData: { title: string; subtitle: string; headers: string[]; rows: string[][] } | null = null;
    let csvBody = "";
    let filename = `${key}.csv`;

    if (key === "leave-balances") {
      const ent = await prisma.leaveEntitlement.findMany({
        where: { companyId, isActive: true },
      });
      const types = [...new Set(ent.map((e) => e.leaveType))].sort();
      const employees = await prisma.employee.findMany({
        where: { companyId, deletedAt: null },
        select: { id: true, employeeCode: true },
        orderBy: { employeeCode: "asc" },
      });
      const usage = await prisma.leaveRequest.groupBy({
        by: ["employeeId", "type"],
        where: {
          employee: { companyId },
          status: "APPROVED",
        },
        _sum: { days: true },
      });
      const usageMap = new Map<string, number>();
      for (const u of usage) {
        usageMap.set(`${u.employeeId}-${u.type}`, u._sum.days ?? 0);
      }
      
      const headers = ["Employee", ...types.map((t) => `${t} (entitled/used)`)];
      const rows = employees.map((emp) => {
        const cells = types.map((t) => {
          const entRow = ent.find((x) => x.leaveType === t);
          const entitled = entRow?.days ?? 0;
          const used = usageMap.get(`${emp.id}-${t}`) ?? 0;
          return `${entitled}/${used}`;
        });
        return [emp.employeeCode, ...cells];
      });

      if (format === "pdf") {
        reportData = {
          title: "Leave Balances Report",
          subtitle: `Company ID: ${companyId}`,
          headers,
          rows,
        };
      } else {
        csvBody = [headers.map(csvEscape).join(","), ...rows.map(r => r.map(csvEscape).join(","))].join("\n");
      }
    } else if (key === "loan-outstanding") {
      const loans = await prisma.loan.findMany({
        where: { employee: { companyId }, status: "ACTIVE" },
        include: { employee: { select: { employeeCode: true } } },
        orderBy: { createdAt: "desc" },
      });
      
      const headers = ["Employee", "Type", "Balance", "Monthly Repayment"];
      const rows = loans.map((l) => [
        l.employee.employeeCode,
        l.type,
        Number(l.balance).toFixed(2),
        Number(l.monthlyRepayment).toFixed(2),
      ]);

      if (format === "pdf") {
        reportData = {
          title: "Outstanding Loans Report",
          subtitle: `Company ID: ${companyId}`,
          headers,
          rows,
        };
      } else {
        csvBody = [headers.map(csvEscape).join(","), ...rows.map(r => r.map(csvEscape).join(","))].join("\n");
      }
    } else if (lineReports.includes(key as (typeof lineReports)[number])) {
      const payrun = payrunId
        ? await prisma.payrun.findFirst({
            where: { id: payrunId, companyId },
            include: {
              lines: {
                include: { employee: { select: { employeeCode: true } } },
                orderBy: { id: "asc" },
              },
            },
          })
        : await prisma.payrun.findFirst({
            where: {
              companyId,
              lines: { some: {} },
            },
            orderBy: { periodEnd: "desc" },
            include: {
              lines: {
                include: { employee: { select: { employeeCode: true } } },
                orderBy: { id: "asc" },
              },
            },
          });

      if (!payrun || payrun.lines.length === 0) {
        return NextResponse.json({ error: "No payroll lines found" }, { status: 404 });
      }

      filename = `${key}-${payrun.id.slice(0, 8)}.csv`;
      let headers: string[] = [];
      let rows: string[][] = [];

      if (key === "payroll-summary") {
        headers = ["Employee", "Gross", "SSNIT(EE)", "Taxable", "PAYE", "Provident", "Loans", "Other Ded", "Total Ded", "Net"];
        rows = payrun.lines.map((l) => [
          l.employee.employeeCode,
          Number(l.grossPay).toFixed(2),
          Number(l.ssnitEmployee).toFixed(2),
          Number(l.taxablePay).toFixed(2),
          Number(l.payeTax).toFixed(2),
          Number(l.provident).toFixed(2),
          Number(l.loanDeductions).toFixed(2),
          Number(l.otherDeductions).toFixed(2),
          Number(l.totalDeductions).toFixed(2),
          Number(l.netPay).toFixed(2),
        ]);
      } else if (key === "ssnit") {
        headers = ["Employee", "Basic (snap)", "SSNIT EE", "SSNIT ER"];
        rows = payrun.lines.map((l) => {
          const snap = l.salarySnapshot as { basicSalary?: number } | null;
          return [
            l.employee.employeeCode,
            String(snap?.basicSalary ?? ""),
            Number(l.ssnitEmployee).toFixed(2),
            Number(l.ssnitEmployer).toFixed(2),
          ];
        });
      } else if (key === "paye") {
        headers = ["Employee", "Taxable Pay", "PAYE"];
        rows = payrun.lines.map((l) => [
          l.employee.employeeCode,
          Number(l.taxablePay).toFixed(2),
          Number(l.payeTax).toFixed(2),
        ]);
      } else {
        headers = ["Employee", "Net Pay"];
        rows = payrun.lines.map((l) => [l.employee.employeeCode, Number(l.netPay).toFixed(2)]);
      }

      if (format === "pdf") {
        reportData = {
          title: `${key.replace("-", " ").toUpperCase()} Report`,
          subtitle: `Period: ${payrun.periodStart.toLocaleDateString()} - ${payrun.periodEnd.toLocaleDateString()}`,
          headers,
          rows,
        };
      } else {
        csvBody = [headers.map(csvEscape).join(","), ...rows.map(r => r.map(csvEscape).join(","))].join("\n");
      }
    } else {
      return NextResponse.json({ error: "Unknown report" }, { status: 404 });
    }

    if (format === "pdf" && reportData) {
      const stream = await renderToStream(
        createElement(ReportDocument, { data: reportData }) as Parameters<typeof renderToStream>[0],
      );
      return new NextResponse(stream as unknown as ReadableStream, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${key}.pdf"`,
        },
      });
    }

    if (format === "json") {
      return NextResponse.json({ report: key, csv: csvBody, pdfAvailable: true });
    }

    return new NextResponse(csvBody, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Report error:", err);
    return NextResponse.json({ error: "Failed to build report" }, { status: 500 });
  }
}
