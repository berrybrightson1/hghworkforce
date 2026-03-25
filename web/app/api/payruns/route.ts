import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { canAccessCompany, requireDbUser } from "@/lib/api-auth";
import { guardPayrunCreation } from "@/lib/billing/guards";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = req.nextUrl;
    const requestedCompanyId = searchParams.get("companyId");

    let where: Prisma.PayrunWhereInput = {};
    if (auth.dbUser.role === "SUPER_ADMIN") {
      where = requestedCompanyId ? { companyId: requestedCompanyId } : {};
    } else if (!auth.dbUser.companyId) {
      if (!requestedCompanyId) {
        return NextResponse.json([]);
      }
      where = { companyId: requestedCompanyId };
    } else {
      if (requestedCompanyId && requestedCompanyId !== auth.dbUser.companyId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      where = { companyId: auth.dbUser.companyId };
    }

    const payruns = await prisma.payrun.findMany({
      where,
      include: {
        company: { select: { name: true } },
        _count: { select: { lines: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(payruns);
  } catch {
    return NextResponse.json({ error: "Failed to load payruns" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const companyId = body.companyId as string;
    if (!companyId) {
      return NextResponse.json({ error: "companyId required" }, { status: 400 });
    }
    if (!canAccessCompany(auth.dbUser, companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const payrunBlocked = await guardPayrunCreation(company);
    if (payrunBlocked) return payrunBlocked;

    const payrun = await prisma.payrun.create({
      data: {
        companyId,
        periodStart: new Date(body.periodStart),
        periodEnd: new Date(body.periodEnd),
        createdById: auth.dbUser.id,
        note: body.note || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "PAYRUN_CREATED",
        entityType: "Payrun",
        entityId: payrun.id,
        afterState: { companyId, status: payrun.status } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(payrun, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create payrun" }, { status: 500 });
  }
}
