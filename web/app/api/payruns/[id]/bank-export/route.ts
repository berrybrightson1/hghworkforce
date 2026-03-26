import { NextRequest, NextResponse } from "next/server";
import { canManagePayroll, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { decrypt } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { employeeDisplayName } from "@/lib/employee-display";

function csvEscape(s: string) {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * GET /api/payruns/[id]/bank-export
 * CSV for bulk salary transfers (GH-friendly columns). Approved pay runs only.
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  if (!canManagePayroll(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  try {
    const payrun = await prisma.payrun.findUnique({
      where: { id },
      include: {
        company: { select: { name: true } },
        lines: {
          include: {
            employee: { include: { user: { select: { name: true } } } },
          },
          orderBy: { id: "asc" },
        },
      },
    });
    if (!payrun) {
      return NextResponse.json({ error: "Pay run not found" }, { status: 404 });
    }
    const billing = await gateCompanyBilling(auth.dbUser, payrun.companyId);
    if (billing) return billing;

    if (payrun.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Only approved pay runs can be exported for the bank" },
        { status: 400 },
      );
    }

    const header = [
      "employee_code",
      "employee_name",
      "bank_name",
      "bank_branch",
      "account_number",
      "net_pay",
      "currency",
    ].join(",");

    const rows = payrun.lines.map((line) => {
      const emp = line.employee;
      const name = employeeDisplayName(emp);
      const net = Number(line.netPay).toFixed(2);
      return [
        csvEscape(emp.employeeCode),
        csvEscape(name),
        csvEscape(decrypt(emp.bankNameEncrypted) ?? ""),
        csvEscape(decrypt(emp.bankBranchEncrypted) ?? ""),
        csvEscape(decrypt(emp.bankAccountEncrypted) ?? ""),
        net,
        "GHS",
      ].join(",");
    });

    const csv = [header, ...rows].join("\r\n");
    const fname = `salary-${payrun.company.name.replace(/[^\w.-]+/g, "_")}-${payrun.periodEnd.toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fname}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
