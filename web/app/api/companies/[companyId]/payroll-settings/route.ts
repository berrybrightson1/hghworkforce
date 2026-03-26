import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { canApprovePayroll, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

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
      select: {
        tier2PensionEnabled: true,
        tier2EmployeePercent: true,
        tier2EmployerPercent: true,
      },
    });
    if (!c) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      tier2PensionEnabled: c.tier2PensionEnabled,
      tier2EmployeePercent: Number(c.tier2EmployeePercent),
      tier2EmployerPercent: Number(c.tier2EmployerPercent),
    });
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

  let body: {
    tier2PensionEnabled?: boolean;
    tier2EmployeePercent?: number;
    tier2EmployerPercent?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const data: Prisma.CompanyUpdateInput = {};
    if (body.tier2PensionEnabled !== undefined) data.tier2PensionEnabled = body.tier2PensionEnabled;
    if (body.tier2EmployeePercent !== undefined) {
      data.tier2EmployeePercent = new Prisma.Decimal(body.tier2EmployeePercent);
    }
    if (body.tier2EmployerPercent !== undefined) {
      data.tier2EmployerPercent = new Prisma.Decimal(body.tier2EmployerPercent);
    }

    const updated = await prisma.company.update({
      where: { id: companyId },
      data,
      select: {
        tier2PensionEnabled: true,
        tier2EmployeePercent: true,
        tier2EmployerPercent: true,
      },
    });
    return NextResponse.json({
      tier2PensionEnabled: updated.tier2PensionEnabled,
      tier2EmployeePercent: Number(updated.tier2EmployeePercent),
      tier2EmployerPercent: Number(updated.tier2EmployerPercent),
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
