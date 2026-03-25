import type { NextRequest } from "next/server";

export function normalizeClientIp(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let ip = raw.split(",")[0].trim();
  if (ip.startsWith("::ffff:")) ip = ip.slice(7);
  return ip || null;
}

export function getClientIpFromRequest(req: NextRequest): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  const xReal = req.headers.get("x-real-ip");
  return normalizeClientIp(forwarded ?? xReal ?? "127.0.0.1");
}

export function isIpOnAllowlist(clientIp: string | null, addresses: string[]): boolean {
  if (!clientIp || addresses.length === 0) return false;
  const n = normalizeClientIp(clientIp) ?? clientIp;
  return addresses.some((a) => (normalizeClientIp(a) ?? a.trim()) === n);
}

/** When enforcement is on but the allowlist is empty, allow traffic to avoid lockout. */
export function checkinIpAllowed(opts: {
  enterpriseEnabled: boolean;
  enforceIp: boolean;
  allowedAddresses: string[];
  clientIp: string | null;
}): { allowed: boolean; reason?: "missing_ip" | "ip_not_allowed" } {
  if (!opts.enterpriseEnabled || !opts.enforceIp) {
    return { allowed: true };
  }
  if (opts.allowedAddresses.length === 0) {
    return { allowed: true };
  }
  if (!opts.clientIp) {
    return { allowed: false, reason: "missing_ip" };
  }
  if (!isIpOnAllowlist(opts.clientIp, opts.allowedAddresses)) {
    return { allowed: false, reason: "ip_not_allowed" };
  }
  return { allowed: true };
}
