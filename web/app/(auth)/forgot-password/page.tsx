import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { firstParam, safeForgotPasswordReturnPath } from "@/lib/settings-return-path";

export const metadata: Metadata = {
  title: "Reset password — HGH WorkForce",
  description: "Reset your HGH WorkForce password with a quick workspace check.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const sp = await searchParams;
  const backHref = safeForgotPasswordReturnPath(firstParam(sp.returnTo));

  return (
    <AuthLayout
      heading="Reset your password"
      subheading="Enter your account email, answer one question about your workspaces, then set a new password. No inbox link — verification is instant when your answer matches our records."
      backHref={backHref}
      backLabel="Back"
    >
      <Suspense
        fallback={
          <div className="space-y-5">
            <div className="h-11 animate-pulse rounded-lg bg-hgh-border/40" />
            <div className="h-24 animate-pulse rounded-lg bg-hgh-border/40" />
            <div className="h-11 animate-pulse rounded-lg bg-hgh-border/40" />
          </div>
        }
      >
        <ForgotPasswordForm />
      </Suspense>
    </AuthLayout>
  );
}
