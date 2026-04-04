import { redirect } from "next/navigation";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { CompanyProvider } from "@/components/company-context";
import { ensureAppUser } from "@/lib/ensure-app-user";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/dashboard");
  }

  const email = user.email ?? "";
  let displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    email ||
    "User";

  const dbUser = await ensureAppUser(user, displayName);

  if (dbUser.role === "SUPER_ADMIN") {
    const t = displayName.trim();
    if (!t || t === "User" || t === email) {
      displayName = "Berry Brightson";
    }
  }

  // Employees must use /portal, not /dashboard
  if (dbUser.role === "EMPLOYEE") {
    redirect("/portal");
  }

  // Users without a company assignment need onboarding first
  // SUPER_ADMIN is exempt (they manage all companies)
  if (!dbUser.companyId && dbUser.role !== "SUPER_ADMIN") {
    redirect("/onboarding");
  }

  return (
    <CompanyProvider>
      <DashboardShell
        userEmail={email}
        userDisplayName={displayName}
        userRole={dbUser.role}
      >
        {children}
      </DashboardShell>
    </CompanyProvider>
  );
}
