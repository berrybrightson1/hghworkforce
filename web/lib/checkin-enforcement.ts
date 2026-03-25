import { prisma } from "@/lib/prisma";
import { checkinIpAllowed, normalizeClientIp } from "@/lib/checkin-ip";

export type CompanyIpEnforcementSelect = {
  checkinLockToFirstIp: boolean;
  checkinBoundIp: string | null;
  checkinEnterpriseEnabled: boolean;
  checkinEnforceIpAllowlist: boolean;
  allowedIps: { address: string }[];
};

/**
 * Enforces company check-in IP policy: either lock to first seen IP, or enterprise allowlist rules.
 * When checkinLockToFirstIp is true, manual allowlist is ignored for enforcement.
 */
export async function assertCompanyCheckinIpAllowed(params: {
  companyId: string;
  company: CompanyIpEnforcementSelect;
  clientIp: string | null;
  /** When null (e.g. unauthenticated kiosk), first-IP bind still works but audit row is skipped. */
  actorId: string | null;
}): Promise<
  | { ok: true }
  | { ok: false; reason: "missing_ip" | "ip_mismatch" | "ip_not_allowed"; logReason: string }
> {
  const { companyId, company, clientIp, actorId } = params;

  if (company.checkinLockToFirstIp) {
    if (!clientIp) {
      return { ok: false, reason: "missing_ip", logReason: "missing_ip" };
    }
    const normalizedClient = normalizeClientIp(clientIp) ?? clientIp;

    if (company.checkinBoundIp == null) {
      const result = await prisma.company.updateMany({
        where: { id: companyId, checkinBoundIp: null },
        data: { checkinBoundIp: normalizedClient },
      });
      if (result.count > 0) {
        if (actorId) {
          await prisma.auditLog.create({
            data: {
              actorId,
              action: "CHECKIN_IP_BOUND_FIRST_VISIT",
              entityType: "Company",
              entityId: companyId,
              afterState: { boundIp: normalizedClient },
              ipAddress: clientIp,
            },
          });
        }
        return { ok: true };
      }

      const refreshed = await prisma.company.findUnique({
        where: { id: companyId },
        select: { checkinBoundIp: true },
      });
      const bound = refreshed?.checkinBoundIp;
      if (bound != null && (normalizeClientIp(bound) ?? bound) === normalizedClient) {
        return { ok: true };
      }
      return { ok: false, reason: "ip_mismatch", logReason: "ip_race_not_bound_machine" };
    }

    const normalizedBound = normalizeClientIp(company.checkinBoundIp) ?? company.checkinBoundIp;
    if (normalizedBound === normalizedClient) {
      return { ok: true };
    }
    return { ok: false, reason: "ip_mismatch", logReason: "ip_not_bound_machine" };
  }

  const allowedAddresses = company.allowedIps.map((r) => r.address);
  const ipResult = checkinIpAllowed({
    enterpriseEnabled: company.checkinEnterpriseEnabled,
    enforceIp: company.checkinEnforceIpAllowlist,
    allowedAddresses,
    clientIp,
  });
  if (!ipResult.allowed) {
    return {
      ok: false,
      reason: ipResult.reason ?? "ip_not_allowed",
      logReason: ipResult.reason ?? "ip_not_allowed",
    };
  }
  return { ok: true };
}
