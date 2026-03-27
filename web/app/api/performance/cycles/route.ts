import { NextResponse } from "next/server";
import { requireDbUser, canManage, gateCompanyBilling } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  if (!canManage(dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId") ?? dbUser.companyId;
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const billing = await gateCompanyBilling(dbUser, companyId);
  if (billing) return billing;

  const cycles = await prisma.performanceCycle.findMany({
    where: { companyId },
    include: { _count: { select: { reviews: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(cycles);
}

export async function POST(req: Request) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  if (!canManage(dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { companyId, name, periodStart, periodEnd } = body;

  if (!companyId || !name || !periodStart || !periodEnd) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const billing = await gateCompanyBilling(dbUser, companyId);
  if (billing) return billing;

  const cycle = await prisma.performanceCycle.create({
    data: {
      tenantId: companyId,
      companyId,
      name,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      status: "DRAFT",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: dbUser.id,
      action: "PERFORMANCE_CYCLE_CREATED",
      entityType: "PerformanceCycle",
      entityId: cycle.id,
      afterState: { name },
    },
  });

  return NextResponse.json(cycle, { status: 201 });
}
