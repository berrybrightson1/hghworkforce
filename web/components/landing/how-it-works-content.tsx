import Link from "next/link";
import { Building2, Network, UserPlus } from "lucide-react";

export function HowItWorksContent() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
      <div className="mx-auto mb-14 max-w-2xl text-center">
        <h1 className="mb-4 text-3xl font-bold text-hgh-navy md:text-4xl">How to get on the platform</h1>
        <p className="leading-relaxed text-hgh-muted">
          Yes — you start from this site with a normal <strong className="font-semibold text-hgh-slate">sign up</strong>.
          There isn&apos;t a separate &quot;payroll signup&quot; and &quot;check-in signup&quot;: one account, one
          workspace, with both payroll and attendance included.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-hgh-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md md:p-7">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-hgh-gold/15">
            <UserPlus className="h-6 w-6 text-hgh-gold" strokeWidth={2} aria-hidden />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-hgh-gold">Step 1</p>
          <h2 className="mb-2 text-lg font-semibold text-hgh-navy">Sign up from the landing page</h2>
          <p className="text-sm leading-relaxed text-hgh-muted">
            Use <strong className="font-medium text-hgh-slate">Create your account</strong> or{" "}
            <strong className="font-medium text-hgh-slate">Sign up</strong> in the menu. You&apos;ll verify your email
            and create a password — same entry point for everyone.
          </p>
          <Link
            href="/sign-up"
            className="mt-4 inline-flex text-sm font-semibold text-hgh-navy underline decoration-hgh-gold/50 underline-offset-2 hover:decoration-hgh-gold"
          >
            Go to sign up
          </Link>
        </div>

        <div className="rounded-xl border border-hgh-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md md:p-7">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-hgh-gold/15">
            <Building2 className="h-6 w-6 text-hgh-gold" strokeWidth={2} aria-hidden />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-hgh-gold">Step 2</p>
          <h2 className="mb-2 text-lg font-semibold text-hgh-navy">Onboarding: company or invite</h2>
          <p className="text-sm leading-relaxed text-hgh-muted">
            After you <strong className="font-medium text-hgh-slate">sign in</strong>, you&apos;ll either{" "}
            <strong className="font-medium text-hgh-slate">create your first company</strong> or{" "}
            <strong className="font-medium text-hgh-slate">join with an invite code</strong> from your administrator.
            Admins can invite HR and employees by email so they land in the right role.
          </p>
          <Link
            href="/sign-in"
            className="mt-4 inline-flex text-sm font-semibold text-hgh-navy underline decoration-hgh-gold/50 underline-offset-2 hover:decoration-hgh-gold"
          >
            Sign in
          </Link>
        </div>

        <div className="rounded-xl border border-hgh-border bg-white p-6 shadow-sm transition-shadow hover:shadow-md md:p-7">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-hgh-gold/15">
            <Network className="h-6 w-6 text-hgh-gold" strokeWidth={2} aria-hidden />
          </div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-hgh-gold">Step 3</p>
          <h2 className="mb-2 text-lg font-semibold text-hgh-navy">One product, both services</h2>
          <p className="text-sm leading-relaxed text-hgh-muted">
            You don&apos;t need to &quot;add check-in later&quot; as a second product —{" "}
            <strong className="font-medium text-hgh-slate">payroll and attendance</strong> are included in the same
            subscription once you move past the trial. HR and admins use the dashboard (insights, pay runs,
            corrections); employees use the self-service portal for check-in, leave, payslips, and onboarding tasks —
            works great on phones; you can add the site to your home screen for an app-like experience.
          </p>
        </div>
      </div>

      <p className="mx-auto mt-10 max-w-2xl text-center text-sm text-hgh-muted">
        Invited teammates should also use <strong className="font-medium text-hgh-slate">Sign up</strong> with the
        email the invite was sent to (or sign in if they already have an account) then complete onboarding with the
        code they received.
      </p>
    </div>
  );
}
