import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type LandingAuth =
  | { loggedIn: false }
  | { loggedIn: true; appHref: string; label: string };

/**
 * Read-only auth snapshot for marketing pages. Does not create or mutate users.
 * Stale or corrupted Supabase cookies (e.g. missing refresh token) must not break the page.
 */
export async function getLandingAuth(): Promise<LandingAuth> {
  let user: { id: string } | null = null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return { loggedIn: false };
    }
    user = data.user;
  } catch {
    return { loggedIn: false };
  }

  if (!user) {
    return { loggedIn: false };
  }

  const dbUser = await prisma.user.findUnique({
    where: { authUserId: user.id },
    select: { role: true, companyId: true },
  });

  if (!dbUser) {
    return { loggedIn: true, appHref: "/onboarding", label: "Continue setup" };
  }

  if (dbUser.role === UserRole.EMPLOYEE) {
    return { loggedIn: true, appHref: "/portal", label: "Open employee portal" };
  }

  if (!dbUser.companyId && dbUser.role !== UserRole.SUPER_ADMIN) {
    return { loggedIn: true, appHref: "/onboarding", label: "Continue setup" };
  }

  return { loggedIn: true, appHref: "/dashboard", label: "Go to dashboard" };
}
