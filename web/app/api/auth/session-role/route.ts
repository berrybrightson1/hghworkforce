import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Lightweight role probe for middleware (cookie-authenticated).
 * Returns { role: null } when unauthenticated or unknown user.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ role: null });
  }

  const dbUser = await prisma.user.findUnique({
    where: { authUserId: user.id },
    select: { role: true, isActive: true, companyId: true },
  });

  if (!dbUser?.isActive) {
    return NextResponse.json({ role: null, companyId: null });
  }

  return NextResponse.json({ role: dbUser.role, companyId: dbUser.companyId });
}
