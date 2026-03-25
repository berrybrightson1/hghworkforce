import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy",
  description: "How HGH WorkForce handles your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-hgh-offwhite">
      <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">
        <Link href="/" className="text-sm font-medium text-hgh-gold hover:text-hgh-gold/80">
          ← Back to home
        </Link>
        <h1 className="mt-8 text-3xl font-bold text-hgh-navy">Privacy policy</h1>
        <p className="mt-4 text-sm text-hgh-muted">Last updated: {new Date().getFullYear()}</p>

        <div className="mt-10 space-y-4 text-sm leading-relaxed text-hgh-slate">
          <h2 className="text-lg font-semibold text-hgh-navy">What we collect</h2>
          <p>
            We store account and workforce data you provide or import — for example company details, employee records,
            payroll and attendance information — to operate HGH WorkForce. Authentication is handled by our identity
            provider; we associate your login with your workspace according to your role.
          </p>

          <h2 className="pt-6 text-lg font-semibold text-hgh-navy">How we use it</h2>
          <p>
            Data is used to deliver payroll, attendance, reporting, and self-service features you enable for your
            organization. We do not sell personal data. Replace this section with your legal counsel–reviewed policy
            before production.
          </p>

          <h2 className="pt-6 text-lg font-semibold text-hgh-navy">Retention & security</h2>
          <p>
            Technical and organizational measures (including encryption of sensitive fields where implemented, access
            control by role, and audit logging) help protect data. Retention periods should match your jurisdiction and
            contractual obligations — document them here.
          </p>

          <h2 className="pt-6 text-lg font-semibold text-hgh-navy">Contact</h2>
          <p>
            For privacy requests, contact your organization administrator or the email address you publish for HGH
            WorkForce support.
          </p>
        </div>
      </div>
    </div>
  );
}
