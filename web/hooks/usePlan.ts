"use client";

import { useMemo } from "react";
import { useCompany } from "@/components/company-context";
import { canAccess, type PlanModule, type PlanName } from "@/lib/planPermissions";

const DAY_MS = 86_400_000;

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function usePlan() {
  const { selected } = useCompany();

  return useMemo(() => {
    const plan = (selected?.plan ?? "TRIAL") as PlanName;
    const now = Date.now();
    const end = parseDate(selected?.trialEndsAt);
    const isTrialActive = plan === "TRIAL" && !!end && end.getTime() > now;
    const trialDaysLeft = end ? Math.max(0, Math.ceil((end.getTime() - now) / DAY_MS)) : 0;

    return {
      plan,
      isTrialActive,
      trialDaysLeft,
      canAccess: (module: PlanModule) => canAccess(plan, module),
    };
  }, [selected?.plan, selected?.trialEndsAt]);
}
