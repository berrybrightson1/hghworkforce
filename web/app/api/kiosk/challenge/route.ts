import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/kiosk/challenge?id=CHALLENGE_ID
 *
 * Polled by the kiosk to check if the employee has scanned the QR and verified their device.
 */
export async function GET(req: NextRequest) {
  const challengeId = req.nextUrl.searchParams.get("id") ?? "";
  if (!challengeId) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const challenge = await prisma.kioskChallenge.findUnique({
    where: { id: challengeId },
    select: {
      deviceVerified: true,
      consumed: true,
      expiresAt: true,
    },
  });

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  const expired = new Date() > challenge.expiresAt;

  return NextResponse.json({
    deviceVerified: challenge.deviceVerified,
    consumed: challenge.consumed,
    expired,
  });
}
