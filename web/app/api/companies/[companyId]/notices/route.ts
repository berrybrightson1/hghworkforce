import { NextRequest, NextResponse } from "next/server";
import { CompanyNoticeStatus, PortalNotificationType } from "@prisma/client";
import { canManage, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { notifyEmployeeInApp } from "@/lib/notify";
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
  if (!canManage(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await prisma.companyNotice.findMany({
    where: { companyId },
    orderBy: { publishedAt: "desc" },
    take: 50,
    include: { createdBy: { select: { name: true } } },
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

  let body: { title?: string; body?: string; notifyEmployees?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const title = body.title?.trim();
  const text = body.body?.trim();
  if (!title || !text) {
    return NextResponse.json({ error: "title and body required" }, { status: 400 });
  }

  const notice = await prisma.companyNotice.create({
    data: {
      companyId,
      title,
      body: text,
      status: CompanyNoticeStatus.PUBLISHED,
      createdById: auth.dbUser.id,
    },
  });

  if (body.notifyEmployees !== false) {
    const emps = await prisma.employee.findMany({
      where: { companyId, deletedAt: null, status: "ACTIVE" },
      select: { id: true },
    });
    for (const e of emps) {
      await notifyEmployeeInApp(
        e.id,
        companyId,
        PortalNotificationType.COMPANY_NOTICE,
        title,
        text.slice(0, 280),
        "/portal/notices",
      );
    }
  }

  return NextResponse.json(notice, { status: 201 });
}
