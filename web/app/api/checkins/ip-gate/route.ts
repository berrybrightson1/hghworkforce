import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/api-auth";
import { checkinIpAllowed, getClientIpFromRequest } from "@/lib/checkin-ip";

/**
 * GET /api/checkins/ip-gate
 * Cookie-authenticated. Used by middleware and for diagnostics.
 * Non-employees receive allowed: true (portal check-in is employee-only UI).
 */
export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  try {
    const employee = await prisma.employee.findUnique({
      where: { userId: auth.dbUser.id },
      select: { companyId: true },
    });
    if (!employee) {
      return NextResponse.json({ allowed: true, skipped: true });
    }

    const company = await prisma.company.findUnique({
      where: { id: employee.companyId },
      select: {
        checkinEnterpriseEnabled: true,
        checkinEnforceIpAllowlist: true,
        allowedIps: { select: { address: true } },
      },
    });

    if (!company) {
      return NextResponse.json({ allowed: true, skipped: true });
    }

    const allowedAddresses = company.allowedIps.map((r) => r.address);
    const clientIp = getClientIpFromRequest(req);
    const { allowed, reason } = checkinIpAllowed({
      enterpriseEnabled: company.checkinEnterpriseEnabled,
      enforceIp: company.checkinEnforceIpAllowlist,
      allowedAddresses,
      clientIp,
    });

    if (!allowed) {
      await prisma.auditLog.create({
        data: {
          actorId: auth.dbUser.id,
          action: "CHECKIN_IP_BLOCKED",
          entityType: "Company",
          entityId: employee.companyId,
          afterState: { reason, clientIp },
          ipAddress: clientIp,
        },
      });
      return NextResponse.json({ allowed: false, reason }, { status: 403 });
    }

    return NextResponse.json({ allowed: true, clientIp });
  } catch {
    return NextResponse.json({ error: "IP check failed" }, { status: 500 });
  }
}
