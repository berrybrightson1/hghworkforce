import { NextResponse } from "next/server";
import { requireDbUser, canAdminCompany, gateCompanyBilling } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  if (!canAdminCompany(dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId") ?? dbUser.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const billing = await gateCompanyBilling(dbUser, companyId);
  if (billing) return billing;

  const entries = await prisma.revenueEntry.findMany({
    where: { companyId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    take: 12,
  });

  return NextResponse.json(entries);
}

export async function POST(req: Request) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  if (!canAdminCompany(dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { companyId, month, year, revenueAmount, note } = body;

  if (!companyId || !month || !year || revenueAmount === undefined) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const billing = await gateCompanyBilling(dbUser, companyId);
  if (billing) return billing;

  const entry = await prisma.revenueEntry.upsert({
    where: { companyId_month_year: { companyId, month, year } },
    create: {
      tenantId: companyId,
      companyId,
      month,
      year,
      revenueAmount,
      note: note ?? null,
      enteredBy: dbUser.id,
    },
    update: {
      revenueAmount,
      note: note ?? null,
      enteredBy: dbUser.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: dbUser.id,
      action: "REVENUE_ENTRY_SAVED",
      entityType: "RevenueEntry",
      entityId: entry.id,
      afterState: { month, year, revenueAmount },
    },
  });

  return NextResponse.json(entry);
}
