import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Rocket } from "lucide-react";
import { ensureAppUser } from "@/lib/ensure-app-user";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { TRIAL_DAYS } from "@/lib/billing/access";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/onboarding");
  }

  const email = user.email ?? "";
  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name) ||
    email ||
    "User";

  const dbUser = await ensureAppUser(user, displayName);

  // Already onboarded - go to dashboard
  if (dbUser.companyId || dbUser.role === "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hgh-offwhite px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-hgh-gold">
            <Rocket className="h-7 w-7 text-hgh-navy" strokeWidth={2} aria-hidden />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-hgh-navy">
            Welcome to HGH WorkForce
          </h1>
          <p className="mt-2 text-sm text-hgh-muted">
            Hi {displayName}! Create your first company to start a {TRIAL_DAYS}-day full-access trial; subscribe later
            under Billing when you are ready to continue past the trial.
          </p>
        </div>

        <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-hgh-border/30" />}>
          <OnboardingForm />
        </Suspense>
      </div>
    </div>
  );
}
