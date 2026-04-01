import { addDays } from "date-fns";
import type { SubscriptionStatus } from "@prisma/client";

/** Match copy across billing UI and onboarding. */
export const TRIAL_DAYS = 3;

export type CompanyBillingFields = {
  subscriptionStatus: SubscriptionStatus;
  trialEndsAt: Date | null;
  createdAt: Date;
  /** Optional: stacked referral reward access window. */
  referralAccessUntil?: Date | null;
};

export function effectiveTrialEndsAt(c: CompanyBillingFields): Date {
  if (c.trialEndsAt) return c.trialEndsAt;
  return addDays(c.createdAt, TRIAL_DAYS);
}

export function isSubscriptionActive(c: CompanyBillingFields): boolean {
  return c.subscriptionStatus === "ACTIVE";
}

/** Full product access: valid paid subscription, referral credit window, or trial window. */
export function companyHasFullAccess(c: CompanyBillingFields): boolean {
  const ref = c.referralAccessUntil;
  if (ref && new Date(ref).getTime() > Date.now()) return true;
  if (isSubscriptionActive(c)) return true;
  return Date.now() < effectiveTrialEndsAt(c).getTime();
}

export function msUntilTrialEnd(c: CompanyBillingFields): number {
  return effectiveTrialEndsAt(c).getTime() - Date.now();
}
