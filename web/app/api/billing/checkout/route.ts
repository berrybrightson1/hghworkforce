import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessCompany, canManageBilling, requireDbUser } from "@/lib/api-auth";
import { isPaymentProviderConfigured } from "@/lib/billing/enforcement";
import { prisma } from "@/lib/prisma";
import { getStripe, getStripePriceId } from "@/lib/stripe-server";

const bodySchema = z.object({
  companyId: z.string().min(1),
});

function absoluteOrigin(req: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

/**
 * POST /api/billing/checkout
 * Creates a hosted checkout session when the configured payment provider is set up (currently Stripe behind the scenes).
 */
export async function POST(req: Request) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const { companyId } = parsed.data;
  if (!canAccessCompany(auth.dbUser, companyId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canManageBilling(auth.dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, subscriptionStatus: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  if (!isPaymentProviderConfigured()) {
    return NextResponse.json({
      ok: true,
      bypassed: true,
      message:
        "Online checkout is not enabled on this server yet. Ask your administrator to activate your subscription, or try again once payments are turned on.",
      companyId: company.id,
      subscriptionStatus: company.subscriptionStatus,
    });
  }

  const stripe = getStripe();
  const priceId = getStripePriceId();
  if (!stripe || !priceId) {
    return NextResponse.json({ error: "Checkout is temporarily unavailable. Please try again later." }, { status: 500 });
  }

  const origin = absoluteOrigin(req);

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      client_reference_id: companyId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/dashboard/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/billing?checkout=cancelled`,
      metadata: { companyId },
      subscription_data: {
        metadata: { companyId },
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: "Checkout did not return a URL" }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      url: session.url,
      sessionId: session.id,
    });
  } catch (e) {
    console.error("[billing/checkout]", e);
    return NextResponse.json({ error: "Checkout failed. Please try again or contact support." }, { status: 502 });
  }
}
