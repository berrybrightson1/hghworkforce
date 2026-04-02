import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { EmployeeStatus, UserRole, type Employee, type User } from "@prisma/client";
import { companyHasFullAccess } from "@/lib/billing/access";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { PORTAL_COOKIE_NAME, verifyPortalJwt, type PortalJwtPayload } from "@/lib/portal-jwt";

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
 * Tenant owners: billing, user administration, kiosk/security config, revenue,
 * and other actions that should not be delegated to HR-only users.
 */
export function canAdminCompany(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
}

/**
 * HR plus tenant admins: people operations (leave, draft payroll prep, inbox, workplace records, etc.).
 */
export function canHrDashboard(role: UserRole): boolean {
  return canAdminCompany(role) || role === "HR";
}

/**
 * Alias for {@link canHrDashboard}. Prefer canHrDashboard or canAdminCompany in new code
 * so intent is explicit at each call site.
 */
export function canManage(role: UserRole): boolean {
  return canHrDashboard(role);
}

/** Draft payroll, bank export, loans, shifts — HR and admins. */
export function canManagePayroll(role: UserRole): boolean {
  return canHrDashboard(role);
}

export function canApprovePayroll(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
}

export function canManageLeave(role: UserRole): boolean {
  return canHrDashboard(role);
}

/** Office kiosk settings, enterprise check-in flags — admins only (not HR). */
export function canManageCheckinSecurity(role: UserRole): boolean {
  return canAdminCompany(role);
}

/** Billing and subscription management (dashboard + APIs). */
export function canManageBilling(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
}

/** Read trial/subscription summary (e.g. GET /api/billing/summary). Same scope as dashboard HR ops. */
export function canViewBillingSummary(role: UserRole): boolean {
  return canHrDashboard(role);
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
    select: {
      subscriptionStatus: true,
      trialEndsAt: true,
      createdAt: true,
      referralAccessUntil: true,
    },
  });
  if (!row) return NextResponse.json({ error: "Company not found" }, { status: 404 });
  if (!companyHasFullAccess(row)) return subscriptionRequiredResponse();
  return null;
}

/** Billing gate for employee self-service (no Supabase user; no SUPER_ADMIN bypass). */
export async function gateCompanyBillingEmployee(companyId: string): Promise<NextResponse | null> {
  const row = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      subscriptionStatus: true,
      trialEndsAt: true,
      createdAt: true,
      referralAccessUntil: true,
    },
  });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!companyHasFullAccess(row)) return subscriptionRequiredResponse();
  return null;
}

export async function getPortalJwtFromCookies(): Promise<PortalJwtPayload | null> {
  const jar = await cookies();
  const raw = jar.get(PORTAL_COOKIE_NAME)?.value;
  if (!raw) return null;
  return verifyPortalJwt(raw);
}

/**
 * Resolves the current employee for portal APIs: PIN session (cookie) or linked Supabase EMPLOYEE user.
 * Rejects PIN sessions that still require a permanent PIN change.
 */
export async function requireEmployeeSelf(): Promise<
  | { ok: true; employee: Employee; via: "portal" | "supabase"; dbUser: User | null; jwt: PortalJwtPayload | null }
  | { ok: false; response: NextResponse }
> {
  const jar = await cookies();
  const raw = jar.get(PORTAL_COOKIE_NAME)?.value;
  if (raw) {
    const jwt = await verifyPortalJwt(raw);
    if (!jwt) {
      return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    if (jwt.requiresPinChange) {
      return { ok: false, response: NextResponse.json({ error: "PIN change required" }, { status: 401 }) };
    }
    const employee = await prisma.employee.findFirst({
      where: {
        id: jwt.employeeId,
        companyId: jwt.companyId,
        status: EmployeeStatus.ACTIVE,
        deletedAt: null,
        portalEnabled: true,
      },
    });
    if (!employee) {
      return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
    }
    return { ok: true, employee, via: "portal", dbUser: null, jwt };
  }

  const auth = await requireDbUser();
  if (!auth.ok) return { ok: false, response: auth.response };
  if (auth.dbUser.role !== UserRole.EMPLOYEE) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  const employee = await prisma.employee.findUnique({
    where: { userId: auth.dbUser.id },
  });
  if (
    !employee ||
    employee.status !== EmployeeStatus.ACTIVE ||
    employee.deletedAt ||
    !employee.portalEnabled
  ) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { ok: true, employee, via: "supabase", dbUser: auth.dbUser, jwt: null };
}

export async function gateBillingForEmployeeSelf(
  employee: Employee,
  via: "portal" | "supabase",
  dbUser: User | null,
): Promise<NextResponse | null> {
  const elevated = await requireDbUser();
  if (elevated.ok && elevated.dbUser.role === UserRole.SUPER_ADMIN) {
    return null;
  }

  if (via === "portal") {
    return gateCompanyBillingEmployee(employee.companyId);
  }
  if (!dbUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return gateCompanyBilling(dbUser, employee.companyId);
}
