import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata: Metadata = {
  title: "Sign in — HGH WorkForce",
  description:
    "Sign in to HGH WorkForce for payroll, attendance, and employee self-service for Ghana teams.",
};

export default function SignInPage() {
  return (
    <AuthLayout
      heading="Welcome back"
      subheading="Sign in to your HGH WorkForce account to continue."
    >
      <Suspense
        fallback={
          <div className="space-y-5">
            <div className="h-[72px] animate-pulse rounded-lg bg-hgh-border/40" />
            <div className="h-[72px] animate-pulse rounded-lg bg-hgh-border/40" />
            <div className="h-11 animate-pulse rounded-lg bg-hgh-border/40" />
          </div>
        }
      >
        <SignInForm />
      </Suspense>
    </AuthLayout>
  );
}
