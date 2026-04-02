import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { firstParam, safeSettingsReturnPath } from "@/lib/settings-return-path";

export const metadata: Metadata = {
  title: "Change password — HGH WorkForce",
  description: "Update your HGH WorkForce account password.",
};

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const sp = await searchParams;
  const settingsPath = safeSettingsReturnPath(firstParam(sp.returnTo));

  return (
    <AuthLayout
      heading="Change your password"
      subheading="Enter your current password, then choose a new one. If you’ve forgotten your password, use Forgot below."
      backHref={settingsPath}
      backLabel="Back"
    >
      <Suspense
        fallback={
          <div className="space-y-5">
            <div className="h-11 animate-pulse rounded-lg bg-hgh-border/40" />
            <div className="h-11 animate-pulse rounded-lg bg-hgh-border/40" />
            <div className="h-11 animate-pulse rounded-lg bg-hgh-border/40" />
          </div>
        }
      >
        <UpdatePasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
