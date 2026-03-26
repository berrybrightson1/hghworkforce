import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDbUser, canManageCheckinSecurity, gateCompanyBilling } from "@/lib/api-auth";

/**
 * DELETE /api/companies/[companyId]/allowed-ips/[allowedIpId]
 */
export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ companyId: string; allowedIpId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const { companyId, allowedIpId } = await ctx.params;
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  if (!canManageCheckinSecurity(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await prisma.allowedIP.findFirst({
      where: { id: allowedIpId, companyId },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.allowedIP.delete({ where: { id: allowedIpId } });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "ALLOWED_IP_DELETED",
        entityType: "Company",
        entityId: companyId,
        beforeState: { id: existing.id, address: existing.address },
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete IP" }, { status: 500 });
  }
}
