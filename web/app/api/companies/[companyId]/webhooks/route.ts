import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
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
    const rows = await prisma.companyWebhook.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        url: true,
        payrunApproved: true,
        isActive: true,
        createdAt: true,
      },
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
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

  if (!canApprovePayroll(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { url?: string; payrunApproved?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const url = body.url?.trim();
  if (!url || !/^https:\/\//i.test(url)) {
    return NextResponse.json({ error: "Valid https URL required" }, { status: 400 });
  }

  try {
    const secret = crypto.randomBytes(32).toString("hex");
    const row = await prisma.companyWebhook.create({
      data: {
        companyId,
        url,
        secret,
        payrunApproved: body.payrunApproved !== false,
      },
      select: {
        id: true,
        url: true,
        secret: true,
        payrunApproved: true,
        isActive: true,
        createdAt: true,
      },
    });
    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
