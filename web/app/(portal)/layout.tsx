import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ensureAppUser } from "@/lib/ensure-app-user";
import { createClient } from "@/lib/supabase/server";
import { CompanyProvider } from "@/components/company-context";
import { PortalShell } from "@/components/portal/portal-shell";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/portal");
  }

  const email = user.email ?? "";
  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    email ||
    "User";

  const dbUser = await ensureAppUser(user, displayName);

  if (dbUser.role !== "EMPLOYEE") {
    redirect("/dashboard");
  }

  if (!dbUser.companyId) {
    redirect("/onboarding");
  }

  const company = await prisma.company.findUnique({
    where: { id: dbUser.companyId },
    select: { id: true, name: true },
  });

  if (!company) {
    redirect("/onboarding");
  }

  return (
    <CompanyProvider lockedCompany={{ id: company.id, name: company.name }}>
      <PortalShell userEmail={email} userDisplayName={displayName}>
        {children}
      </PortalShell>
    </CompanyProvider>
  );
}
