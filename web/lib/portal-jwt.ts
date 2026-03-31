import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";

export const PORTAL_COOKIE_NAME = "hgh_portal_session";

export type PortalJwtPayload = {
  employeeId: string;
  tenantId: string;
  companyId: string;
  role: "EMPLOYEE";
  requiresPinChange: boolean;
};

function secretKey(): Uint8Array | null {
  const s = process.env.PORTAL_JWT_SECRET;
  if (!s) return null;
  return new TextEncoder().encode(s);
}

export async function signPortalJwt(payload: PortalJwtPayload, expiresIn: string = "8h"): Promise<string> {
  const key = secretKey();
  if (!key) {
    throw new Error("PORTAL_JWT_SECRET is not configured");
  }
  return new SignJWT({
    employeeId: payload.employeeId,
    tenantId: payload.tenantId,
    companyId: payload.companyId,
    role: payload.role,
    requiresPinChange: payload.requiresPinChange,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key);
}

export async function verifyPortalJwt(token: string): Promise<PortalJwtPayload | null> {
  const key = secretKey();
  if (!key) return null;
  try {
    const { payload } = await jwtVerify(token, key);
    const employeeId = String(payload.employeeId ?? "");
    const companyId = String(payload.companyId ?? "");
    const tenantId = String(payload.tenantId ?? companyId);
    const role = payload.role;
    const requiresPinChange = Boolean(payload.requiresPinChange);
    if (role !== "EMPLOYEE" || !employeeId || !companyId) return null;
    return {
      employeeId,
      tenantId,
      companyId,
      role: "EMPLOYEE",
      requiresPinChange,
    };
  } catch {
    return null;
  }
}

export function readPortalTokenFromRequest(request: NextRequest): string | undefined {
  return request.cookies.get(PORTAL_COOKIE_NAME)?.value;
}
