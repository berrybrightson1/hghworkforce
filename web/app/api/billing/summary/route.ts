import { NextRequest, NextResponse } from "next/server";
import { canAccessCompany, requireDbUser } from "@/lib/api-auth";
import {
  isBillingEnforced,
  isPaymentProviderConfigured,
  shouldApplyPlanLimits,
} from "@/lib/billing/enforcement";
import { effectiveLimits, limitsForTier } from "@/lib/billing/plans";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/billing/summary?companyId=
 * Plan display + limits for the selected company (billing may be bypassed).
 */
export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }
  if (!canAccessCompany(auth.dbUser, companyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      planTier: true,
      subscriptionStatus: true,
    },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const enforced = isBillingEnforced();
  const paymentReady = isPaymentProviderConfigured();
  const applyLimits = shouldApplyPlanLimits();
  const effective = effectiveLimits(company.planTier, applyLimits);
  const raw = limitsForTier(company.planTier);

  return NextResponse.json({
    companyId: company.id,
    companyName: company.name,
    planTier: company.planTier,
    subscriptionStatus: company.subscriptionStatus,
    billingEnforced: enforced,
    paymentProviderConfigured: paymentReady,
    /** When true, limits are not applied and checkout always bypasses. */
    accessBypassed: !applyLimits,
    effectiveLabel: effective.label,
    limits: {
      maxEmployeesPerCompany: effective.maxEmployeesPerCompany,
      maxPayrunsPerMonth: effective.maxPayrunsPerMonth,
    },
    /** Shown when billing is enforced but user is still on raw tier limits. */
    tierLimits: {
      maxEmployeesPerCompany: raw.maxEmployeesPerCompany,
      maxPayrunsPerMonth: raw.maxPayrunsPerMonth,
    },
  });
}
