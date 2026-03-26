import Link from "next/link";
import { Lock } from "lucide-react";

export default function PortalSubscriptionRequiredPage() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-hgh-border bg-white p-6 shadow-sm">
      <div className="flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
          <Lock className="h-7 w-7 text-amber-800" aria-hidden />
        </div>
        <h1 className="text-lg font-semibold text-hgh-navy">Workspace access is paused</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Your organization&apos;s 3-day full-access trial has ended and there isn&apos;t an active subscription yet.
          Employee portal features stay unavailable until a company admin subscribes.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          Please contact your HR or payroll administrator and ask them to open{" "}
          <strong className="font-medium text-foreground">Dashboard → Billing</strong> to continue.
        </p>
        <p className="mt-6 text-xs text-muted-foreground">
          If you manage payroll for this company, sign in with an admin account (not the employee portal) to complete
          billing.
        </p>
        <Link
          href="/sign-in"
          className="mt-6 text-sm font-medium text-hgh-navy underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
