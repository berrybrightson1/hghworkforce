import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIpFromRequest } from "@/lib/checkin-ip";
import { assertCompanyCheckinIpAllowed } from "@/lib/checkin-enforcement";
import { getKioskAuditActorId } from "@/lib/kiosk-audit-actor";
import { normalizeKioskCompanyId } from "@/lib/kiosk-company-id";

/**
 * GET /api/kiosk/ip-gate?companyId=
 * Unauthenticated. Same IP rules as portal check-in (first PC bind or enterprise allowlist).
 */
export async function GET(req: NextRequest) {
  const companyId = normalizeKioskCompanyId(req.nextUrl.searchParams.get("companyId"));
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        checkinLockToFirstIp: true,
        checkinBoundIp: true,
        checkinEnterpriseEnabled: true,
        checkinEnforceIpAllowlist: true,
        allowedIps: { select: { address: true } },
      },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const clientIp = getClientIpFromRequest(req);
    const actorId = await getKioskAuditActorId(companyId);
    const enforce = await assertCompanyCheckinIpAllowed({
      companyId,
      company,
      clientIp,
      actorId,
    });

    if (!enforce.ok) {
      if (actorId) {
        await prisma.auditLog.create({
          data: {
            actorId,
            action: "CHECKIN_IP_BLOCKED",
            entityType: "Company",
            entityId: companyId,
            afterState: { reason: enforce.logReason, clientIp, source: "kiosk_ip_gate" },
            ipAddress: clientIp,
          },
        });
      }
      return NextResponse.json(
        { allowed: false, reason: enforce.reason },
        { status: 403 },
      );
    }

    return NextResponse.json({ allowed: true, clientIp });
  } catch {
    return NextResponse.json({ error: "IP check failed" }, { status: 500 });
  }
}
