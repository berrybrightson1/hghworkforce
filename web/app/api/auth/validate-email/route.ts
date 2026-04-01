import { NextResponse } from "next/server";
import { z } from "zod";
import { disposableEmailMessage, isDisposableEmailAddress } from "@/lib/disposable-email";

const bodySchema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/auth/validate-email — disposable-domain check for signup (field-level errors).
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const email = parsed.data.email.trim().toLowerCase();
  if (isDisposableEmailAddress(email)) {
    return NextResponse.json({
      ok: false,
      disposable: true,
      message: disposableEmailMessage(),
    });
  }
  return NextResponse.json({ ok: true });
}
