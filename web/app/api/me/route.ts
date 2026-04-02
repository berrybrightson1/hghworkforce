import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildDashboardGreetingName } from "@/lib/greeting-name";
import { requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const full = await prisma.user.findUnique({
    where: { id: auth.dbUser.id },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      role: true,
      companyId: true,
      referralCode: true,
    },
  });

  if (!full) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const referralCount = await prisma.referralReward.count({
    where: { referrerId: full.id },
  });

  const greetingName = buildDashboardGreetingName({
    firstName: full.firstName,
    lastName: full.lastName,
    legacyName: full.name,
    email: full.email,
  });

  return NextResponse.json({
    id: full.id,
    email: full.email,
    name: full.name,
    firstName: full.firstName,
    lastName: full.lastName,
    greetingName,
    role: full.role,
    companyId: full.companyId,
    referralCode: full.referralCode,
    referralCount,
    referralMonthsEarned: referralCount,
  });
}

const patchSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100).optional(),
  lastName: z.string().min(1, "Last name is required").max(100).optional(),
  email: z.string().email("Invalid email address").optional(),
});

/**
 * PATCH /api/me — update the current user's profile.
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join(", ");
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const { firstName, lastName, email } = parsed.data;

  // Nothing to update
  if (!firstName && !lastName && !email) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  try {
    // Build DB update payload
    const data: Record<string, unknown> = {};

    if (firstName !== undefined) data.firstName = firstName.trim();
    if (lastName !== undefined) data.lastName = lastName.trim();

    // Derive full name from first + last (use existing values for missing fields)
    if (firstName !== undefined || lastName !== undefined) {
      const newFirst = (firstName?.trim() ?? auth.dbUser.firstName ?? "").trim();
      const newLast = (lastName?.trim() ?? auth.dbUser.lastName ?? "").trim();
      data.name = [newFirst, newLast].filter(Boolean).join(" ") || auth.dbUser.name;
    }

    // Handle email change via Supabase Auth
    if (email !== undefined && email !== auth.dbUser.email) {
      const supabase = await createClient();
      const { error: authError } = await supabase.auth.updateUser({ email });
      if (authError) {
        return NextResponse.json(
          { error: authError.message || "Failed to update email" },
          { status: 400 },
        );
      }
      data.email = email;
    }

    const updated = await prisma.user.update({
      where: { id: auth.dbUser.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        firstName: true,
        lastName: true,
        role: true,
        companyId: true,
      },
    });

    return NextResponse.json({
      ...updated,
      emailChanged: email !== undefined && email !== auth.dbUser.email,
    });
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
