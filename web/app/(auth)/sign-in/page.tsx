import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SignInForm } from "@/components/auth/sign-in-form";

export default function SignInPage() {
  return (
    <AuthLayout
      heading="Welcome back"
      subheading="Sign in to your HGH Payroll account to continue."
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
