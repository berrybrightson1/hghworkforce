import { addDays } from "date-fns";
import { NextResponse } from "next/server";
import { TRIAL_DAYS } from "@/lib/billing/access";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/onboarding
 * Body: { action: "create_company", companyName: string }
 *    or { action: "join_company", inviteCode: string }
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { authUserId: user.id },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Already onboarded
  if (dbUser.companyId) {
    return NextResponse.json({ error: "Already assigned to a company" }, { status: 400 });
  }

  const body = await req.json();

  if (body.action === "create_company") {
    const name = (body.companyName ?? "").trim();
    if (!name || name.length < 2) {
      return NextResponse.json({ error: "Company name is required (min 2 characters)" }, { status: 400 });
    }

    const trialEndsAt = addDays(new Date(), TRIAL_DAYS);
    const company = await prisma.company.create({
      data: { name, checkinLockToFirstIp: true, trialEndsAt },
    });

    // User who creates a company becomes its COMPANY_ADMIN
    // (unless they are already SUPER_ADMIN)
    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        companyId: company.id,
        role: dbUser.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "COMPANY_ADMIN",
      },
    });

    return NextResponse.json({ ok: true, companyId: company.id });
  }

  if (body.action === "join_company") {
    const code = (body.inviteCode ?? "").trim();
    if (!code) {
      return NextResponse.json({ error: "Invite code is required" }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { code },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    if (invitation.status !== "PENDING") {
      return NextResponse.json({ error: "This invitation has already been used or revoked" }, { status: 400 });
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "EXPIRED" },
      });
      return NextResponse.json({ error: "This invitation has expired" }, { status: 400 });
    }

    // Check email matches if the invitation was for a specific email
    if (invitation.email && invitation.email !== dbUser.email) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 403 },
      );
    }

    // Assign user to company with the invited role
    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        companyId: invitation.companyId,
        role: invitation.role,
      },
    });

    // Mark invitation as accepted
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "ACCEPTED" },
    });

    return NextResponse.json({ ok: true, companyId: invitation.companyId });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
