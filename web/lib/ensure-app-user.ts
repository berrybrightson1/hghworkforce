import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateUniqueReferralCode } from "@/lib/referral-code";

/**
 * Ensures a row exists in `User` for this Supabase account.
 * Also auto-accepts pending invitations matching the user's email.
 * Returns the database user so layouts can check role/company.
 *
 * New self-serve accounts default to COMPANY_ADMIN (not EMPLOYEE) so a paying
 * owner can use the dashboard and complete onboarding without being treated as
 * portal-only staff. Pending invitations still override role + company on first load.
 */
export async function ensureAppUser(
  supabaseUser: SupabaseUser,
  displayName: string,
): Promise<User> {
  const email =
    supabaseUser.email?.trim() || `${supabaseUser.id}@auth.placeholder`;

  const userCountBefore = await prisma.user.count();

  // findFirst: tolerate rare duplicate rows in DB (findUnique can throw P2002).
  const byAuth = await prisma.user.findFirst({
    where: { authUserId: supabaseUser.id },
  });
  const byEmail =
    byAuth == null
      ? await prisma.user.findFirst({
          where: { email },
          orderBy: { createdAt: "asc" },
        })
      : null;

  /** Another row holds this email; free it so the signed-in user can use it. */
  async function releaseEmailIfBlockedByOtherRow(forUserId: string) {
    const blocker = await prisma.user.findFirst({
      where: { email, NOT: { id: forUserId } },
      orderBy: { createdAt: "asc" },
    });
    if (blocker) {
      await prisma.user.update({
        where: { id: blocker.id },
        data: {
          email: `${blocker.id}-superseded@auth.placeholder`,
        },
      });
    }
  }

  let row: User;
  if (byAuth) {
    if (byAuth.email !== email) {
      await releaseEmailIfBlockedByOtherRow(byAuth.id);
    }
    row = await prisma.user.update({
      where: { id: byAuth.id },
      data: { email, name: displayName },
    });
  } else if (byEmail) {
    // Same email, new Supabase auth user (re-signup / auth user recreated)
    row = await prisma.user.update({
      where: { id: byEmail.id },
      data: { authUserId: supabaseUser.id, email, name: displayName },
    });
  } else {
    for (const stray of await prisma.user.findMany({
      where: { email },
      select: { id: true },
    })) {
      await prisma.user.update({
        where: { id: stray.id },
        data: { email: `${stray.id}-superseded@auth.placeholder` },
      });
    }
    row = await prisma.user.create({
      data: {
        authUserId: supabaseUser.id,
        email,
        name: displayName,
        role: UserRole.COMPANY_ADMIN,
        companyId: null,
      },
    });
  }

  // First ever user becomes SUPER_ADMIN
  if (userCountBefore === 0 && row.role !== UserRole.SUPER_ADMIN) {
    row = await prisma.user.update({
      where: { id: row.id },
      data: { role: UserRole.SUPER_ADMIN },
    });
  }

  // If the user has no company yet, check for a pending invitation
  if (!row.companyId && row.role !== UserRole.SUPER_ADMIN) {
    const invitation = await prisma.invitation.findFirst({
      where: {
        email,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (invitation) {
      row = await prisma.user.update({
        where: { id: row.id },
        data: {
          companyId: invitation.companyId,
          role: invitation.role,
        },
      });

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: "ACCEPTED" },
      });
    }
  }

  const patch: {
    referralCode?: string;
    firstName?: string | null;
    lastName?: string | null;
  } = {};

  if (!row.referralCode) {
    patch.referralCode = await generateUniqueReferralCode();
  }

  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts[0] && !row.firstName) {
    patch.firstName = parts[0];
  }
  if (parts.length > 1 && !row.lastName) {
    patch.lastName = parts.slice(1).join(" ");
  }

  if (Object.keys(patch).length > 0) {
    row = await prisma.user.update({
      where: { id: row.id },
      data: patch,
    });
  }

  return row;
}
