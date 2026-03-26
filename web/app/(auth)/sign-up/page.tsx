import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { TRIAL_DAYS } from "@/lib/billing/access";

export default function SignUpPage() {
  return (
    <AuthLayout
      heading="Create your account"
      subheading={`New companies get a ${TRIAL_DAYS}-day full-access trial, then subscribe under Billing to stay unlocked.`}
    >
      <Suspense
        fallback={
          <div className="space-y-5">
            <div className="h-[72px] animate-pulse rounded-lg bg-hgh-border/40" />
            <div className="h-[72px] animate-pulse rounded-lg bg-hgh-border/40" />
            <div className="h-[72px] animate-pulse rounded-lg bg-hgh-border/40" />
            <div className="h-[72px] animate-pulse rounded-lg bg-hgh-border/40" />
            <div className="h-11 animate-pulse rounded-lg bg-hgh-border/40" />
          </div>
        }
      >
        <SignUpForm />
      </Suspense>
    </AuthLayout>
  );
}
