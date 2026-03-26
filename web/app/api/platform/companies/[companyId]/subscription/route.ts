import { NextRequest, NextResponse } from "next/server";
import { SubscriptionStatus, UserRole } from "@prisma/client";
import { requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const ALLOWED_STATUS = new Set<SubscriptionStatus>([
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.NONE,
  SubscriptionStatus.TRIAL,
  SubscriptionStatus.PAST_DUE,
  SubscriptionStatus.CANCELED,
]);

/**
 * PATCH /api/platform/companies/[companyId]/subscription
 * Super admin only — set workspace subscription (e.g. grant full access after trial).
 * Body: { subscriptionStatus: SubscriptionStatus }
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  if (auth.dbUser.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { companyId } = await ctx.params;
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw =
    body && typeof body === "object" && "subscriptionStatus" in body
      ? (body as { subscriptionStatus: unknown }).subscriptionStatus
      : undefined;
  if (typeof raw !== "string" || !Object.values(SubscriptionStatus).includes(raw as SubscriptionStatus)) {
    return NextResponse.json({ error: "subscriptionStatus is required" }, { status: 400 });
  }
  const subscriptionStatus = raw as SubscriptionStatus;
  if (!ALLOWED_STATUS.has(subscriptionStatus)) {
    return NextResponse.json({ error: "Invalid subscriptionStatus" }, { status: 400 });
  }

  try {
    const exists = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const updated = await prisma.company.update({
      where: { id: companyId },
      data: { subscriptionStatus },
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        createdAt: true,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }
}
