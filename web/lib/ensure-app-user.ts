import type { User as SupabaseUser } from "@supabase/supabase-js";
import type { User } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Ensures a row exists in `User` for this Supabase account.
 * Also auto-accepts pending invitations matching the user's email.
 * Returns the database user so layouts can check role/company.
 */
export async function ensureAppUser(
  supabaseUser: SupabaseUser,
  displayName: string,
): Promise<User> {
  const email =
    supabaseUser.email?.trim() || `${supabaseUser.id}@auth.placeholder`;

  const userCountBefore = await prisma.user.count();

  let row = await prisma.user.upsert({
    where: { authUserId: supabaseUser.id },
    create: {
      authUserId: supabaseUser.id,
      email,
      name: displayName,
      role: UserRole.EMPLOYEE,
      companyId: null,
    },
    update: {
      email,
      name: displayName,
    },
  });

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

  return row;
}
