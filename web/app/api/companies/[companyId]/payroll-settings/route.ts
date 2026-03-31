import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { canApprovePayroll, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const select = {
  tier2PensionEnabled: true,
  tier2EmployeePercent: true,
  tier2EmployerPercent: true,
  showBirthdaysOnDashboard: true,
  birthdayLookaheadDays: true,
  payslipPrimaryHex: true,
  payslipAccentHex: true,
  payslipThemeVariant: true,
  overtimeHourlyMultiplier: true,
  standardHoursPerMonth: true,
  includeAttendanceOvertimeInPayrun: true,
} satisfies Record<string, boolean>;

function serialize(c: {
  tier2PensionEnabled: boolean;
  tier2EmployeePercent: Prisma.Decimal;
  tier2EmployerPercent: Prisma.Decimal;
  showBirthdaysOnDashboard: boolean;
  birthdayLookaheadDays: number;
  payslipPrimaryHex: string;
  payslipAccentHex: string;
  payslipThemeVariant: string;
  overtimeHourlyMultiplier: Prisma.Decimal;
  standardHoursPerMonth: Prisma.Decimal;
  includeAttendanceOvertimeInPayrun: boolean;
}) {
  return {
    tier2PensionEnabled: c.tier2PensionEnabled,
    tier2EmployeePercent: Number(c.tier2EmployeePercent),
    tier2EmployerPercent: Number(c.tier2EmployerPercent),
    showBirthdaysOnDashboard: c.showBirthdaysOnDashboard,
    birthdayLookaheadDays: c.birthdayLookaheadDays,
    payslipPrimaryHex: c.payslipPrimaryHex,
    payslipAccentHex: c.payslipAccentHex,
    payslipThemeVariant: c.payslipThemeVariant,
    overtimeHourlyMultiplier: Number(c.overtimeHourlyMultiplier),
    standardHoursPerMonth: Number(c.standardHoursPerMonth),
    includeAttendanceOvertimeInPayrun: c.includeAttendanceOvertimeInPayrun,
  };
}

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { companyId } = await ctx.params;
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  if (!canApprovePayroll(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const c = await prisma.company.findUnique({
      where: { id: companyId },
      select,
    });
    if (!c) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(serialize(c));
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { companyId } = await ctx.params;
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  if (!canApprovePayroll(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const data: Prisma.CompanyUpdateInput = {};
    if (body.tier2PensionEnabled !== undefined) data.tier2PensionEnabled = Boolean(body.tier2PensionEnabled);
    if (body.tier2EmployeePercent !== undefined) {
      data.tier2EmployeePercent = new Prisma.Decimal(Number(body.tier2EmployeePercent));
    }
    if (body.tier2EmployerPercent !== undefined) {
      data.tier2EmployerPercent = new Prisma.Decimal(Number(body.tier2EmployerPercent));
    }
    if (body.showBirthdaysOnDashboard !== undefined) {
      data.showBirthdaysOnDashboard = Boolean(body.showBirthdaysOnDashboard);
    }
    if (body.birthdayLookaheadDays !== undefined) {
      const n = Number(body.birthdayLookaheadDays);
      if (Number.isInteger(n) && n >= 0 && n <= 365) data.birthdayLookaheadDays = n;
    }
    if (typeof body.payslipPrimaryHex === "string" && /^#[0-9A-Fa-f]{6}$/.test(body.payslipPrimaryHex)) {
      data.payslipPrimaryHex = body.payslipPrimaryHex;
    }
    if (typeof body.payslipAccentHex === "string" && /^#[0-9A-Fa-f]{6}$/.test(body.payslipAccentHex)) {
      data.payslipAccentHex = body.payslipAccentHex;
    }
    if (typeof body.payslipThemeVariant === "string") {
      const v = body.payslipThemeVariant.toUpperCase();
      if (v === "DEFAULT" || v === "MINIMAL" || v === "STRIPED") data.payslipThemeVariant = v;
    }
    if (body.overtimeHourlyMultiplier !== undefined) {
      const n = Number(body.overtimeHourlyMultiplier);
      if (Number.isFinite(n) && n >= 1 && n <= 5) data.overtimeHourlyMultiplier = new Prisma.Decimal(n.toFixed(2));
    }
    if (body.standardHoursPerMonth !== undefined) {
      const n = Number(body.standardHoursPerMonth);
      if (Number.isFinite(n) && n >= 1 && n <= 400) data.standardHoursPerMonth = new Prisma.Decimal(n.toFixed(2));
    }
    if (body.includeAttendanceOvertimeInPayrun !== undefined) {
      data.includeAttendanceOvertimeInPayrun = Boolean(body.includeAttendanceOvertimeInPayrun);
    }

    const updated = await prisma.company.update({
      where: { id: companyId },
      data,
      select,
    });
    return NextResponse.json(serialize(updated));
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
