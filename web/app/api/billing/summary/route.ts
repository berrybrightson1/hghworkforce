import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import {
  canAccessCompany,
  canManageBilling,
  requireDbUser,
  requireEmployeeSelf,
} from "@/lib/api-auth";
import {
  companyHasFullAccess,
  effectiveTrialEndsAt,
  isSubscriptionActive,
  msUntilTrialEnd,
  TRIAL_DAYS,
} from "@/lib/billing/access";
import { isPaymentProviderConfigured } from "@/lib/billing/enforcement";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/billing/summary?companyId=
 * Trial + subscription state (company admin / super admin only).
 */
export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const self = await requireEmployeeSelf();
  if (self.ok) {
    if (self.employee.companyId !== companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        createdAt: true,
      },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const elevated = await requireDbUser();
    const superAdminExempt = elevated.ok && elevated.dbUser.role === UserRole.SUPER_ADMIN;
    const tenantHasAccess = companyHasFullAccess(company);
    const fullAccess = superAdminExempt || tenantHasAccess;
    const locked = !fullAccess;
    const subscribed = isSubscriptionActive(company);
    const trialEndsAt = effectiveTrialEndsAt(company);

    return NextResponse.json({
      companyId: company.id,
      companyName: company.name,
      subscriptionStatus: company.subscriptionStatus,
      trialDays: TRIAL_DAYS,
      trialEndsAt: trialEndsAt.toISOString(),
      subscribed,
      fullAccess,
      locked,
      superAdminExempt,
      msRemaining:
        !superAdminExempt && tenantHasAccess && Date.now() < trialEndsAt.getTime() && !subscribed
          ? msUntilTrialEnd(company)
          : 0,
      paymentProviderConfigured: isPaymentProviderConfigured(),
    });
  }

  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (!canAccessCompany(auth.dbUser, companyId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canManageBilling(auth.dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      createdAt: true,
    },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const subscribed = isSubscriptionActive(company);
  const trialEndsAt = effectiveTrialEndsAt(company);
  const superAdminExempt = auth.dbUser.role === UserRole.SUPER_ADMIN;
  const tenantHasAccess = companyHasFullAccess(company);
  const fullAccess = superAdminExempt || tenantHasAccess;
  const locked = !fullAccess;
  const msRemaining =
    !superAdminExempt && tenantHasAccess && Date.now() < trialEndsAt.getTime() && !subscribed
      ? msUntilTrialEnd(company)
      : 0;

  return NextResponse.json({
    companyId: company.id,
    companyName: company.name,
    subscriptionStatus: company.subscriptionStatus,
    trialDays: TRIAL_DAYS,
    trialEndsAt: trialEndsAt.toISOString(),
    subscribed,
    fullAccess,
    locked,
    superAdminExempt,
    msRemaining,
    paymentProviderConfigured: isPaymentProviderConfigured(),
  });
}
