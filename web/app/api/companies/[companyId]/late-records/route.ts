import { NextRequest, NextResponse } from "next/server";
import { canManage, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { companyId } = await ctx.params;
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;
  if (!canManage(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const take = Math.min(Number(req.nextUrl.searchParams.get("take")) || 100, 500);
  const rows = await prisma.lateRecord.findMany({
    where: { companyId },
    orderBy: { date: "desc" },
    take,
    include: {
      employee: { select: { id: true, name: true, employeeCode: true } },
    },
  });
  return NextResponse.json(rows);
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { companyId } = await ctx.params;
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;
  if (!canManage(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    employeeId?: string;
    minutesLate?: number;
    date?: string;
    checkInId?: string | null;
    notes?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const emp = await prisma.employee.findFirst({
    where: { id: body.employeeId ?? "", companyId, deletedAt: null },
  });
  if (!emp) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }
  const minutesLate = Number(body.minutesLate);
  if (!Number.isFinite(minutesLate) || minutesLate < 1) {
    return NextResponse.json({ error: "minutesLate required" }, { status: 400 });
  }
  const d = body.date ? new Date(body.date) : new Date();
  if (Number.isNaN(d.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const row = await prisma.lateRecord.create({
    data: {
      companyId,
      employeeId: emp.id,
      checkInId: body.checkInId || null,
      date: d,
      minutesLate: Math.round(minutesLate),
      notes: body.notes?.trim() || null,
    },
  });
  return NextResponse.json(row, { status: 201 });
}
