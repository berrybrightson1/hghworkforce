import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureAppUser } from "@/lib/ensure-app-user";
import { SubscribeShell } from "./subscribe-shell";

export const metadata = {
  title: "Plans & subscription",
};

export default async function SubscribeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/subscribe");
  }

  const email = user.email ?? "";
  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    email ||
    "User";

  const dbUser = await ensureAppUser(user, displayName);

  if (dbUser.role === "EMPLOYEE") {
    redirect("/portal");
  }

  if (!dbUser.companyId && dbUser.role !== "SUPER_ADMIN") {
    redirect("/onboarding");
  }

  return <SubscribeShell userRole={dbUser.role}>{children}</SubscribeShell>;
}
