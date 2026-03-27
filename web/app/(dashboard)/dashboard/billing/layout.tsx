import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/dashboard/billing");

  const dbUser = await prisma.user.findUnique({
    where: { authUserId: user.id },
    select: { role: true, isActive: true },
  });
  if (!dbUser?.isActive) redirect("/sign-in?next=/dashboard/billing");

  if (dbUser.role !== UserRole.SUPER_ADMIN && dbUser.role !== UserRole.COMPANY_ADMIN) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
