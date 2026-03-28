import { NextResponse } from "next/server";
import { UserRole, type User } from "@prisma/client";
import { companyHasFullAccess } from "@/lib/billing/access";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type AuthResult =
  | { ok: true; dbUser: User }
  | { ok: false; response: NextResponse };

export async function requireDbUser(): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const dbUser = await prisma.user.findUnique({ where: { authUserId: user.id } });
  if (!dbUser) {
    return {
      ok: false,
      response: NextResponse.json({ error: "User not found in database" }, { status: 404 }),
    };
  }
  if (!dbUser.isActive) {
    return { ok: false, response: NextResponse.json({ error: "Account inactive" }, { status: 403 }) };
  }
  return { ok: true, dbUser };
}

/**
 * Central permission helper: SUPER_ADMIN, COMPANY_ADMIN, and (optional) HR
 * can access all HR-level / management features.
 */
export function canManage(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "HR";
}

/** Kept as alias for backward-compat — identical to canManage(). */
export function canManagePayroll(role: UserRole): boolean {
  return canManage(role);
}

export function canApprovePayroll(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
}

export function canManageLeave(role: UserRole): boolean {
  return canManage(role);
}

/** Check-in security, attendance config (not payrun approval). */
export function canManageCheckinSecurity(role: UserRole): boolean {
  return canManage(role);
}

/** Billing and subscription management (dashboard + APIs). */
export function canManageBilling(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
}

/** HR restrictions: cannot approve payruns, manage billing, invite users, or change company settings. */
export function canManageTeam(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
}

/**
 * Super admin: any company.
 * Otherwise: must match assigned company. Users without a companyId
 * cannot access any company data (they need onboarding first).
 */
export function canAccessCompany(dbUser: User, companyId: string): boolean {
  if (dbUser.role === "SUPER_ADMIN") return true;
  if (!dbUser.companyId) return false;
  return dbUser.companyId === companyId;
}

export function subscriptionRequiredResponse(): NextResponse {
  return NextResponse.json(
    {
      error:
        "Your 3-day free trial has ended. Subscribe to restore access to HGH WorkForce for this workspace.",
      code: "SUBSCRIPTION_REQUIRED",
      trialEnded: true,
    },
    { status: 402 },
  );
}

/**
 * Blocks when the workspace trial has expired and subscription is not ACTIVE.
 * Includes company access check (same rules as canAccessCompany).
 */
export async function gateCompanyBilling(dbUser: User, companyId: string): Promise<NextResponse | null> {
  if (!canAccessCompany(dbUser, companyId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (dbUser.role === UserRole.SUPER_ADMIN) {
    return null;
  }
  const row = await prisma.company.findUnique({
    where: { id: companyId },
    select: { subscriptionStatus: true, trialEndsAt: true, createdAt: true },
  });
  if (!row) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  if (!companyHasFullAccess(row)) return subscriptionRequiredResponse();
  return null;
}
