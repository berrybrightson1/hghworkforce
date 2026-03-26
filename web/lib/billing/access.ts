import { addDays } from "date-fns";
import type { SubscriptionStatus } from "@prisma/client";

/** Match copy across billing UI and onboarding. */
export const TRIAL_DAYS = 3;

export type CompanyBillingFields = {
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  createdAt: Date;
};

export function effectiveTrialEndsAt(c: CompanyBillingFields): Date {
  if (c.trialEndsAt) return c.trialEndsAt;
  return addDays(c.createdAt, TRIAL_DAYS);
}

export function isSubscriptionActive(c: CompanyBillingFields): boolean {
  return c.subscriptionStatus === "ACTIVE";
}

/** Full product access: valid paid subscription, or still within the trial window. */
export function companyHasFullAccess(c: CompanyBillingFields): boolean {
  if (isSubscriptionActive(c)) return true;
  return Date.now() < effectiveTrialEndsAt(c).getTime();
}

export function msUntilTrialEnd(c: CompanyBillingFields): number {
  return effectiveTrialEndsAt(c).getTime() - Date.now();
}
