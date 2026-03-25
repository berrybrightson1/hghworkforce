import type { PlanTier } from "@prisma/client";

export type PlanLimits = {
  maxEmployeesPerCompany: number;
  maxPayrunsPerMonth: number;
  label: string;
};

const TIER_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    label: "Free",
    maxEmployeesPerCompany: 25,
    maxPayrunsPerMonth: 2,
  },
  STARTER: {
    label: "Starter",
    maxEmployeesPerCompany: 100,
    maxPayrunsPerMonth: 6,
  },
  GROWTH: {
    label: "Growth",
    maxEmployeesPerCompany: 500,
    maxPayrunsPerMonth: 24,
  },
  ENTERPRISE: {
    label: "Enterprise",
    maxEmployeesPerCompany: 100_000,
    maxPayrunsPerMonth: 10_000,
  },
};

/** Limits used when billing is not enforced — effectively unlimited. */
const UNLIMITED: PlanLimits = {
  label: "Full access",
  maxEmployeesPerCompany: Number.MAX_SAFE_INTEGER,
  maxPayrunsPerMonth: Number.MAX_SAFE_INTEGER,
};

export function limitsForTier(tier: PlanTier): PlanLimits {
  return TIER_LIMITS[tier] ?? TIER_LIMITS.FREE;
}

export function effectiveLimits(
  tier: PlanTier,
  applyLimits: boolean,
): PlanLimits & { bypassed: boolean } {
  if (!applyLimits) {
    return { ...UNLIMITED, bypassed: true };
  }
  return { ...limitsForTier(tier), bypassed: false };
}
