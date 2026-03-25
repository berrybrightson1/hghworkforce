import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "Terms for using HGH WorkForce.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-hgh-offwhite">
      <div className="mx-auto max-w-2xl px-6 py-16 md:py-24">
        <Link href="/" className="text-sm font-medium text-hgh-gold hover:text-hgh-gold/80">
          ← Back to home
        </Link>
        <h1 className="mt-8 text-3xl font-bold text-hgh-navy">Terms of service</h1>
        <p className="mt-4 text-sm text-hgh-muted">Last updated: {new Date().getFullYear()}</p>

        <div className="mt-10 space-y-4 text-sm leading-relaxed text-hgh-slate">
          <h2 className="text-lg font-semibold text-hgh-navy">Agreement</h2>
          <p>
            By using HGH WorkForce, you agree to these terms. This is a starter template: have qualified counsel review
            and replace it with terms appropriate for your entity, jurisdictions, and liability posture before going
            live with customers.
          </p>

          <h2 className="pt-6 text-lg font-semibold text-hgh-navy">The service</h2>
          <p>
            HGH WorkForce provides software for payroll, attendance, and related workflows. Features may change; we aim
            to give reasonable notice of material changes where practical.
          </p>

          <h2 className="pt-6 text-lg font-semibold text-hgh-navy">Your responsibilities</h2>
          <p>
            You are responsible for the accuracy of data you enter, compliance with employment and tax law in your
            jurisdictions, and for maintaining the security of your accounts and devices.
          </p>

          <h2 className="pt-6 text-lg font-semibold text-hgh-navy">Disclaimer</h2>
          <p>
            The service is provided “as is” to the extent permitted by law. Payroll and tax outputs depend on correct
            configuration and inputs — validate results with qualified professionals.
          </p>
        </div>
      </div>
    </div>
  );
}
