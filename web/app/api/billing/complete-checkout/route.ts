import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { SubscriptionStatus } from "@prisma/client";
import { canAccessCompany, canManageBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe-server";
import { normalizeReferralCodeInput } from "@/lib/referral-code";

/**
 * POST /api/billing/complete-checkout
 * After Stripe redirect: verify session and set workspace subscription to ACTIVE (MVP — add webhooks for renewals).
 */
export async function POST(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (!canManageBilling(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { sessionId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sessionId = body.sessionId?.trim();
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Payment verification is not available." }, { status: 503 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const companyId = session.metadata?.companyId ?? session.client_reference_id;
    if (!companyId) {
      return NextResponse.json({ error: "Session missing company metadata" }, { status: 400 });
    }

    if (!canAccessCompany(auth.dbUser, companyId)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (session.payment_status !== "paid") {
      return NextResponse.json(
        { error: "Payment not completed yet", paymentStatus: session.payment_status },
        { status: 409 },
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.company.update({
        where: { id: companyId },
        data: { subscriptionStatus: SubscriptionStatus.ACTIVE },
      });

      const referee = await tx.user.findUnique({
        where: { id: auth.dbUser.id },
        select: {
          id: true,
          name: true,
          pendingReferralCode: true,
          companyId: true,
        },
      });

      if (!referee?.pendingReferralCode || referee.companyId !== companyId) {
        return;
      }

      const code = normalizeReferralCodeInput(referee.pendingReferralCode);
      const referrer = await tx.user.findFirst({
        where: { referralCode: code },
        select: { id: true, companyId: true },
      });

      if (!referrer?.companyId || referrer.id === referee.id) {
        await tx.user.update({
          where: { id: referee.id },
          data: { pendingReferralCode: null },
        });
        return;
      }

      const existing = await tx.referralReward.findUnique({
        where: { refereeId: referee.id },
      });
      if (existing) {
        await tx.user.update({
          where: { id: referee.id },
          data: { pendingReferralCode: null },
        });
        return;
      }

      const refCompany = await tx.company.findUnique({
        where: { id: referrer.companyId },
        select: { referralAccessUntil: true },
      });

      const anchorMs =
        refCompany?.referralAccessUntil && refCompany.referralAccessUntil.getTime() > Date.now()
          ? refCompany.referralAccessUntil.getTime()
          : Date.now();
      const referralAccessUntil = addDays(new Date(anchorMs), 30);

      await tx.company.update({
        where: { id: referrer.companyId },
        data: { referralAccessUntil },
      });

      await tx.referralReward.create({
        data: {
          referrerId: referrer.id,
          refereeId: referee.id,
          refereeDisplayName: referee.name,
          appliedToSubscription: true,
        },
      });

      await tx.user.update({
        where: { id: referee.id },
        data: {
          pendingReferralCode: null,
          referredByUserId: referrer.id,
        },
      });
    });

    return NextResponse.json({ ok: true, companyId });
  } catch (e) {
    console.error("[billing/complete-checkout]", e);
    return NextResponse.json({ error: "Could not verify payment. Please contact support if this persists." }, { status: 502 });
  }
}
