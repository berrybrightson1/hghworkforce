import { redirect } from "next/navigation";
import { HintLink } from "@/components/ui/hint-link";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { canManageTeam } from "@/lib/api-auth";
import { UsersClient } from "@/components/users/users-client";

export default async function SettingsTeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/dashboard/settings/team");

  const dbUser = await prisma.user.findUnique({
    where: { authUserId: user.id },
  });
  if (!dbUser) redirect("/sign-in");

  if (!canManageTeam(dbUser.role)) {
    redirect("/dashboard/settings");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">Team</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Invite people to this workspace and assign Company Admin, HR, or Employee roles. For full-page
          access, you can also use{" "}
          <HintLink
            href="/dashboard/users"
            hint="Open the full Users page to invite colleagues and assign Company Admin, HR, or Employee roles."
            className="font-medium text-hgh-gold underline underline-offset-2"
          >
            Users
          </HintLink>{" "}
          in the sidebar.
        </p>
      </div>
      <UsersClient currentUserRole={dbUser.role} currentUserCompanyId={dbUser.companyId} />
    </div>
  );
}
