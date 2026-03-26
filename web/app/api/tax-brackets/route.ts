import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { DEFAULT_MONTHLY_PAYE_BRACKETS } from "@/lib/ghana-tax";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = req.nextUrl;
  const year = Number(searchParams.get("year") || new Date().getFullYear());
  const globalOnly = searchParams.get("global") === "true";

  if (globalOnly) {
    if (auth.dbUser.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
      const globalRows = await prisma.taxBracket.findMany({
        where: { companyId: null, year, isActive: true },
        orderBy: { minAmount: "asc" },
      });
      const source = globalRows.length > 0 ? "global" : "default";
      const brackets =
        globalRows.length > 0
          ? globalRows.map((r) => ({
              minAmount: Number(r.minAmount),
              maxAmount: r.maxAmount === null ? null : Number(r.maxAmount),
              ratePercent: Number(r.rate),
            }))
          : DEFAULT_MONTHLY_PAYE_BRACKETS;
      return NextResponse.json({ year, source, brackets });
    } catch {
      return NextResponse.json({ error: "Failed to load tax brackets" }, { status: 500 });
    }
  }

  const companyId = searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  try {
    const companyRows = await prisma.taxBracket.findMany({
      where: { companyId, year, isActive: true },
      orderBy: { minAmount: "asc" },
    });
    const globalRows =
      companyRows.length === 0
        ? await prisma.taxBracket.findMany({
            where: { companyId: null, year, isActive: true },
            orderBy: { minAmount: "asc" },
          })
        : [];

    const rows = companyRows.length > 0 ? companyRows : globalRows;
    const source =
      companyRows.length > 0 ? "company" : globalRows.length > 0 ? "global" : "default";

    const brackets =
      rows.length > 0
        ? rows.map((r) => ({
            minAmount: Number(r.minAmount),
            maxAmount: r.maxAmount === null ? null : Number(r.maxAmount),
            ratePercent: Number(r.rate),
          }))
        : DEFAULT_MONTHLY_PAYE_BRACKETS;

    return NextResponse.json({ year, source, brackets });
  } catch {
    return NextResponse.json({ error: "Failed to load tax brackets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  let body: {
    companyId?: string | null;
    year?: number;
    brackets?: { minAmount: number; maxAmount: number | null; ratePercent: number }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const year = body.year ?? new Date().getFullYear();
  const targetCompanyId =
    body.companyId === undefined || body.companyId === "" ? null : body.companyId;

  if (targetCompanyId === null) {
    if (auth.dbUser.role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only a super admin can edit global tax brackets" },
        { status: 403 },
      );
    }
  } else {
    if (auth.dbUser.role !== "SUPER_ADMIN" && auth.dbUser.role !== "COMPANY_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const billing = await gateCompanyBilling(auth.dbUser, targetCompanyId);
    if (billing) return billing;
  }

  const brackets = body.brackets;
  if (!Array.isArray(brackets) || brackets.length === 0) {
    return NextResponse.json({ error: "brackets array required" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.taxBracket.deleteMany({
        where: {
          year,
          ...(targetCompanyId ? { companyId: targetCompanyId } : { companyId: null }),
        },
      });
      await tx.taxBracket.createMany({
        data: brackets.map((b) => ({
          companyId: targetCompanyId,
          year,
          minAmount: b.minAmount,
          maxAmount: b.maxAmount,
          rate: b.ratePercent,
          isActive: true,
        })),
      });
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "TAX_BRACKETS_SAVED",
        entityType: "TaxBracket",
        entityId: `${targetCompanyId ?? "global"}-${year}`,
        afterState: { count: brackets.length } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save tax brackets" }, { status: 500 });
  }
}
