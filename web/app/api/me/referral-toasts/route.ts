import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/me/referral-toasts — pending in-app notification for referrer (not yet dismissed).
 */
export async function GET() {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const pending = await prisma.referralReward.findFirst({
    where: { referrerId: auth.dbUser.id, toastShownAt: null },
    orderBy: { awardedAt: "desc" },
    select: {
      id: true,
      refereeDisplayName: true,
    },
  });

  if (!pending) {
    return NextResponse.json({ pending: null });
  }

  const name = pending.refereeDisplayName?.trim() || "Someone";
  const message = `${name} subscribed using your referral. You have earned 1 free month.`;

  return NextResponse.json({
    pending: {
      id: pending.id,
      message,
    },
  });
}

const postSchema = z.object({
  id: z.string().min(1),
});

/**
 * POST /api/me/referral-toasts — mark toast as shown after UI displays it.
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
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updated = await prisma.referralReward.updateMany({
    where: {
      id: parsed.data.id,
      referrerId: auth.dbUser.id,
      toastShownAt: null,
    },
    data: { toastShownAt: new Date() },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
