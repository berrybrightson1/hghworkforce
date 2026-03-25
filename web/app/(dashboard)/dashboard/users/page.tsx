import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { UsersClient } from "@/components/users/users-client";

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { authUserId: user.id },
  });
  if (!dbUser) redirect("/sign-in");

  if (dbUser.role !== "SUPER_ADMIN" && dbUser.role !== "COMPANY_ADMIN") {
    redirect("/dashboard");
  }

  return <UsersClient currentUserRole={dbUser.role} currentUserCompanyId={dbUser.companyId} />;
}
