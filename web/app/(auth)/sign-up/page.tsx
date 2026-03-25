import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <AuthLayout
      heading="Create your account"
      subheading="Create your workspace, add companies, and invite your team."
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
