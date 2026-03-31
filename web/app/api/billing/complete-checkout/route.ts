import { NextRequest, NextResponse } from "next/server";
import { SubscriptionStatus } from "@prisma/client";
import { canAccessCompany, canManageBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe-server";

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
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
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

    await prisma.company.update({
      where: { id: companyId },
      data: { subscriptionStatus: SubscriptionStatus.ACTIVE },
    });

    return NextResponse.json({ ok: true, companyId });
  } catch (e) {
    console.error("[billing/complete-checkout]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Verification failed" },
      { status: 502 },
    );
  }
}
