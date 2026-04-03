import { isSubscriptionActive, msUntilTrialEnd } from "@/lib/billing/access";
import { notifyAdmins } from "@/lib/admin-notifications";
import { prisma } from "@/lib/prisma";

/** Matches AdminNotification.title — used for dedupe and client detection. */
export const TRIAL_ENDING_NOTIFICATION_TITLE = "Your free trial ends today";

export const TRIAL_ENDING_NOTIFICATION_MESSAGE =
  "Choose a plan to keep your data and access for this workspace.";

const DEDUPE_DAYS = 7;

/**
 * Ensures a single BILLING_ALERT exists for the last-day trial window so it
 * appears in the bell and survives refresh until marked read.
 */
export async function ensureTrialEndingAdminNotification(companyId: string): Promise<void> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      plan: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      createdAt: true,
      referralAccessUntil: true,
    },
  });
  if (!company) return;
  if (company.plan !== "TRIAL") return;
  if (isSubscriptionActive(company)) return;

  const ms = msUntilTrialEnd(company);
  if (ms <= 0 || ms > 24 * 60 * 60 * 1000) return;

  const since = new Date(Date.now() - DEDUPE_DAYS * 24 * 60 * 60 * 1000);
  const existing = await prisma.adminNotification.findFirst({
    where: {
      companyId,
      type: "BILLING_ALERT",
      title: TRIAL_ENDING_NOTIFICATION_TITLE,
      createdAt: { gte: since },
    },
  });
  if (existing) return;

  await notifyAdmins({
    companyId,
    type: "BILLING_ALERT",
    title: TRIAL_ENDING_NOTIFICATION_TITLE,
    message: TRIAL_ENDING_NOTIFICATION_MESSAGE,
    linkUrl: "/subscribe",
  });
}
