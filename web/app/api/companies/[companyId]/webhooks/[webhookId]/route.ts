import { NextRequest, NextResponse } from "next/server";
import { canApprovePayroll, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ companyId: string; webhookId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { companyId, webhookId } = await ctx.params;
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  if (!canApprovePayroll(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { isActive?: boolean; payrunApproved?: boolean; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const row = await prisma.companyWebhook.findUnique({ where: { id: webhookId } });
    if (!row || row.companyId !== companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.companyWebhook.update({
      where: { id: webhookId },
      data: {
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(body.payrunApproved !== undefined ? { payrunApproved: body.payrunApproved } : {}),
        ...(body.url?.trim() ? { url: body.url.trim() } : {}),
      },
      select: { id: true, url: true, payrunApproved: true, isActive: true },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ companyId: string; webhookId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { companyId, webhookId } = await ctx.params;
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  if (!canApprovePayroll(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const row = await prisma.companyWebhook.findUnique({ where: { id: webhookId } });
    if (!row || row.companyId !== companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await prisma.companyWebhook.delete({ where: { id: webhookId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
