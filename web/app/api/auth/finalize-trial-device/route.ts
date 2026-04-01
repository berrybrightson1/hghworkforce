import { NextResponse } from "next/server";
import { z } from "zod";
import { requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { verifySignupTicket } from "@/lib/signup-ticket";

const bodySchema = z.object({
  ticket: z.string().min(10),
  fingerprint: z.string().min(32).max(128),
});

/**
 * POST /api/auth/finalize-trial-device
 * Records trial device usage after Supabase sign-up (session required).
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
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const verified = verifySignupTicket(parsed.data.ticket);
  if (!verified) {
    return NextResponse.json({ error: "Invalid or expired sign-up ticket. Try again." }, { status: 400 });
  }

  const email = auth.dbUser.email.trim().toLowerCase();
  if (verified.email !== email) {
    return NextResponse.json({ error: "Ticket does not match this account." }, { status: 403 });
  }

  const fingerprint = parsed.data.fingerprint.trim().toLowerCase();
  if (verified.fingerprint !== fingerprint) {
    return NextResponse.json({ error: "Device mismatch. Start sign-up again." }, { status: 403 });
  }

  const row = await prisma.trialDevice.findUnique({ where: { fingerprint } });
  if (row?.blockedAt) {
    return NextResponse.json({ error: "This device can no longer start trials." }, { status: 403 });
  }

  const emailsUsed = row?.emailsUsed ?? [];
  if (!emailsUsed.includes(email) && emailsUsed.length >= 2) {
    return NextResponse.json({ error: "This device can no longer start trials." }, { status: 403 });
  }

  if (!row) {
    await prisma.trialDevice.create({
      data: { fingerprint, emailsUsed: [email] },
    });
  } else if (!emailsUsed.includes(email)) {
    await prisma.trialDevice.update({
      where: { fingerprint },
      data: { emailsUsed: { push: email } },
    });
  }

  return NextResponse.json({ ok: true });
}
