import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  DEVICE_TOKEN_COOKIE,
  hashDeviceToken,
  generateDeviceToken,
} from "@/lib/kiosk-challenge";

/**
 * POST /api/kiosk/device-verify
 * Body: { challengeId }
 *
 * Called from the employee's phone after scanning the QR code.
 * - First time: binds the device (sets HttpOnly cookie + stores hash)
 * - Already bound: verifies the device token matches
 * - Wrong device: rejects
 *
 * On success: marks the challenge as device-verified and returns the 6-digit code.
 */
export async function POST(req: NextRequest) {
  let body: { challengeId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const challengeId = typeof body.challengeId === "string" ? body.challengeId : "";
  if (!challengeId) {
    return NextResponse.json({ error: "challengeId is required" }, { status: 400 });
  }

  try {
    const challenge = await prisma.kioskChallenge.findUnique({
      where: { id: challengeId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            kioskDeviceTokenHash: true,
            deviceBoundAt: true,
            user: { select: { name: true } },
          },
        },
      },
    });

    if (!challenge) {
      return NextResponse.json({ error: "Invalid or expired challenge" }, { status: 404 });
    }
    if (challenge.consumed) {
      return NextResponse.json({ error: "This challenge has already been used" }, { status: 410 });
    }
    if (new Date() > challenge.expiresAt) {
      return NextResponse.json({ error: "Challenge expired — ask the kiosk to generate a new code" }, { status: 410 });
    }

    const existingToken = req.cookies.get(DEVICE_TOKEN_COOKIE)?.value;
    const employee = challenge.employee;
    const displayName = employee.name ?? employee.user?.name ?? "Employee";

    // Case 1: Employee has a bound device
    if (employee.kioskDeviceTokenHash) {
      if (!existingToken) {
        return NextResponse.json(
          {
            error: "This is not your registered device",
            hint: "Your account is bound to another phone. Ask HR to reset your device binding if you have a new phone.",
          },
          { status: 403 },
        );
      }

      const incomingHash = hashDeviceToken(existingToken);
      if (incomingHash !== employee.kioskDeviceTokenHash) {
        return NextResponse.json(
          {
            error: "This is not your registered device",
            hint: "Your account is bound to another phone. Ask HR to reset your device binding if you have a new phone.",
          },
          { status: 403 },
        );
      }

      // Device matches — mark verified
      await prisma.kioskChallenge.update({
        where: { id: challengeId },
        data: { deviceVerified: true },
      });

      return NextResponse.json({
        code: challenge.code,
        displayName,
        message: "Device verified",
      });
    }

    // Case 2: No device bound yet — bind this one
    const newToken = existingToken ?? generateDeviceToken();
    const tokenHash = hashDeviceToken(newToken);

    await prisma.$transaction([
      prisma.employee.update({
        where: { id: employee.id },
        data: {
          kioskDeviceTokenHash: tokenHash,
          deviceBoundAt: new Date(),
        },
      }),
      prisma.kioskChallenge.update({
        where: { id: challengeId },
        data: { deviceVerified: true },
      }),
    ]);

    const res = NextResponse.json({
      code: challenge.code,
      displayName,
      message: "Device registered and verified",
      firstTime: true,
    });

    // Set HttpOnly cookie on the phone browser
    if (!existingToken) {
      res.cookies.set(DEVICE_TOKEN_COOKIE, newToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        // 10 years — effectively permanent
        maxAge: 10 * 365 * 24 * 60 * 60,
      });
    }

    return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Device verification failed" }, { status: 500 });
  }
}
