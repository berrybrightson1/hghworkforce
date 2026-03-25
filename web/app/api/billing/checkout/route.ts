import { NextResponse } from "next/server";
import { z } from "zod";
import { canAccessCompany, requireDbUser } from "@/lib/api-auth";
import { shouldApplyPlanLimits } from "@/lib/billing/enforcement";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  companyId: z.string().min(1),
  targetTier: z.enum(["STARTER", "GROWTH", "ENTERPRISE"]).optional(),
});

/**
 * POST /api/billing/checkout
 * Placeholder for Stripe Checkout. Until payment is configured or billing is enforced,
 * requests succeed with bypass so the UI can flow without blocking users.
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

  const { companyId, targetTier } = parsed.data;
  if (!canAccessCompany(auth.dbUser, companyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true, planTier: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  // Until limits + Stripe are both on, never block checkout UX.
  if (!shouldApplyPlanLimits()) {
    return NextResponse.json({
      ok: true,
      bypassed: true,
      message:
        "Payment is not configured yet. You have full access during early access. We will enable upgrades here when billing goes live.",
      companyId: company.id,
      currentTier: company.planTier,
      requestedTier: targetTier ?? null,
    });
  }

  // Enforced + Stripe present — real checkout would go here.
  return NextResponse.json(
    {
      ok: false,
      error: "Checkout session creation is not implemented yet. Configure STRIPE_SECRET_KEY and checkout creation.",
      code: "CHECKOUT_NOT_IMPLEMENTED",
    },
    { status: 501 },
  );
}
