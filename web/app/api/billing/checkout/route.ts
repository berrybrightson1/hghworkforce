import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessCompany, requireDbUser } from "@/lib/api-auth";
import { isPaymentProviderConfigured } from "@/lib/billing/enforcement";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  companyId: z.string().min(1),
});

/**
 * POST /api/billing/checkout
 * Placeholder for Stripe Checkout. When Stripe is not configured, returns guidance for manual / dev unlock.
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
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
        "Online payments are not connected yet. For production, configure STRIPE_SECRET_KEY and complete checkout. Until then, set this company’s subscription to ACTIVE in your database to unlock after trial.",
      companyId: company.id,
      subscriptionStatus: company.subscriptionStatus,
    });
  }

  return NextResponse.json(
    {
      ok: false,
      error:
        "Checkout session creation is not implemented yet. Wire Stripe customer + price IDs, then redirect from here.",
      code: "CHECKOUT_NOT_IMPLEMENTED",
    },
    { status: 501 },
  );
}
