import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { disposableEmailMessage, isDisposableEmailAddress } from "@/lib/disposable-email";
import { createSignupTicket, signupTicketSecretConfigured } from "@/lib/signup-ticket";

const bodySchema = z.object({
  email: z.string().email(),
  fingerprint: z.string().min(32).max(128),
});

const TRIAL_TOAST =
  "Trial access from this device has been used. Please subscribe to continue.";

/**
 * POST /api/auth/signup-precheck
 * Validates disposable email + trial-per-device rules; returns a short-lived ticket for finalize step.
 */
export async function POST(req: Request) {
  if (!signupTicketSecretConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Sign-up is not configured on the server." },
      { status: 500 },
    );
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request" }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const fingerprint = parsed.data.fingerprint.trim().toLowerCase();

  if (isDisposableEmailAddress(email)) {
    return NextResponse.json({
      ok: false,
      fieldErrors: { email: disposableEmailMessage() },
    });
  }

  const existing = await prisma.trialDevice.findUnique({
    where: { fingerprint },
  });

  if (existing?.blockedAt) {
    return NextResponse.json(
      { ok: false, code: "TRIAL_DEVICE_BLOCKED", toast: TRIAL_TOAST },
      { status: 403 },
    );
  }

  const emailsUsed = existing?.emailsUsed ?? [];

  if (!emailsUsed.includes(email) && emailsUsed.length >= 2) {
    await prisma.trialDevice.updateMany({
      where: { fingerprint, blockedAt: null },
      data: { blockedAt: new Date() },
    });
    return NextResponse.json(
      { ok: false, code: "TRIAL_DEVICE_BLOCKED", toast: TRIAL_TOAST },
      { status: 403 },
    );
  }

  if (!emailsUsed.includes(email) && emailsUsed.length === 1) {
    console.info("[signup-precheck] second distinct trial email on same device fingerprint", {
      fingerprintPrefix: fingerprint.slice(0, 12),
    });
  }

  let ticket: string;
  try {
    ticket = createSignupTicket(email, fingerprint);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Sign-up is not configured on the server." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ticket });
}
