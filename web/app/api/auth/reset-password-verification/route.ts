import { NextResponse } from "next/server";
import { z } from "zod";
import { newPasswordValueSchema } from "@/lib/auth-password-policy";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceSwitcherCountForUser } from "@/lib/workspace-switcher-count";
import { prisma } from "@/lib/prisma";

const GENERIC_ERROR = "We couldn’t reset that password. Check your email, answer, and password rules, then try again.";

const apiBodySchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    workspaceCountAnswer: z.coerce.number().int().min(0).max(500_000),
    password: newPasswordValueSchema,
    confirm: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "Passwords don’t match",
    path: ["confirm"],
  });

/**
 * Unauthenticated password reset: correct email + workspace-count answer (matches account).
 * Uses Supabase Admin API — requires SUPABASE_SERVICE_ROLE_KEY.
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = apiBodySchema.safeParse(json);
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().fieldErrors.email?.[0]
      ?? parsed.error.flatten().fieldErrors.password?.[0]
      ?? parsed.error.flatten().fieldErrors.confirm?.[0]
      ?? parsed.error.flatten().fieldErrors.workspaceCountAnswer?.[0]
      ?? "Invalid request";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { email, password, workspaceCountAnswer } = parsed.data;
  const normalized = email.trim().toLowerCase();

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          "Password reset isn’t configured on this server yet (missing SUPABASE_SERVICE_ROLE_KEY). Contact support.",
      },
      { status: 503 },
    );
  }

  const dbUser = await prisma.user.findFirst({
    where: { email: { equals: normalized, mode: "insensitive" } },
  });

  if (!dbUser || !dbUser.isActive) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const expected = await getWorkspaceSwitcherCountForUser(dbUser);
  if (workspaceCountAnswer !== expected) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const { error } = await admin.auth.admin.updateUserById(dbUser.authUserId, {
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
