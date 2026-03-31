import { NextRequest, NextResponse } from "next/server";
import { PayrunStatus } from "@prisma/client";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";
import { logServerError } from "@/lib/server-log";
import { prisma } from "@/lib/prisma";

function yearRangeUTC(year: number) {
  const start = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
  const endNext = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0, 0));
  return { start, endNext };
}

/**
 * Year-to-date totals from approved payrun lines whose period starts in the calendar year.
 */
export async function GET(req: NextRequest) {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;

  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  const yParam = req.nextUrl.searchParams.get("year");
  const year = yParam ? Number(yParam) : new Date().getUTCFullYear();
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return NextResponse.json({ error: "Invalid year" }, { status: 400 });
  }

  const { start, endNext } = yearRangeUTC(year);

  try {
    const lines = await prisma.payrunLine.findMany({
      where: {
        employeeId: self.employee.id,
        payrun: {
          status: PayrunStatus.APPROVED,
          periodStart: { gte: start, lt: endNext },
        },
      },
      select: {
        grossPay: true,
        netPay: true,
        totalDeductions: true,
        payrun: { select: { id: true, periodStart: true, periodEnd: true } },
      },
      orderBy: { payrun: { periodStart: "asc" } },
    });

    let gross = 0;
    let net = 0;
    let deductions = 0;
    for (const row of lines) {
      gross += Number(row.grossPay);
      net += Number(row.netPay);
      deductions += Number(row.totalDeductions);
    }

    return NextResponse.json({
      year,
      currency: "GHS",
      payCount: lines.length,
      grossPayYtd: gross,
      netPayYtd: net,
      totalDeductionsYtd: deductions,
      lines: lines.map((l) => ({
        payrunId: l.payrun.id,
        periodStart: l.payrun.periodStart.toISOString(),
        periodEnd: l.payrun.periodEnd.toISOString(),
        grossPay: l.grossPay.toString(),
        netPay: l.netPay.toString(),
        totalDeductions: l.totalDeductions.toString(),
      })),
    });
  } catch (e) {
    logServerError("me/payroll-ytd", e, { year, employeeId: self.employee.id });
    return NextResponse.json({ error: "Failed to load payroll summary" }, { status: 500 });
  }
}
