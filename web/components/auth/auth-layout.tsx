import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  Building2,
  Landmark,
  Shield,
  Users,
  Wallet,
} from "lucide-react";

const features: { icon: LucideIcon; text: string }[] = [
  { icon: Wallet, text: "Automated payroll calculations" },
  { icon: Shield, text: "GRA tax compliance built in" },
  { icon: Building2, text: "Multi-company support" },
  { icon: Users, text: "Employee self-service portal" },
];

export function AuthLayout({
  children,
  heading,
  subheading,
}: {
  children: React.ReactNode;
  heading: string;
  subheading: string;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left branding panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-hgh-navy p-12 lg:flex">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(201,168,76,0.12),_transparent_60%)]" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-hgh-gold">
            <Landmark className="h-[22px] w-[22px] text-hgh-navy" strokeWidth={2} aria-hidden />
          </div>
          <span className="text-lg font-semibold tracking-tight text-white">HGH WorkForce</span>
        </div>

        {/* Center content */}
        <div className="relative max-w-md">
          <h2 className="text-3xl font-bold leading-tight text-white">Payroll built for teams across Ghana</h2>
          <p className="mt-4 text-base leading-relaxed text-white/50">
            Automated PAYE, SSNIT, payslips, approvals, and employee self-service — multi-company,
            tenant-isolated, and ready when you sign up.
          </p>

          <div className="mt-10 space-y-4">
            {features.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.text} className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-hgh-gold/10">
                    <Icon className="h-[18px] w-[18px] text-hgh-gold" strokeWidth={2} aria-hidden />
                  </div>
                  <span className="text-sm text-white/70">{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="relative text-sm text-white/30">HGH WorkForce · Multi-tenant · Ghana workforce compliance</div>
      </div>

      {/* Right form panel */}
      <div className="flex w-full flex-col items-center justify-center bg-hgh-offwhite px-6 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Back to home + mobile logo */}
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-hgh-muted transition-colors hover:text-hgh-navy"
          >
            <ArrowLeft className="h-[18px] w-[18px]" aria-hidden />
            Back to home
          </Link>

          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-hgh-gold">
              <Landmark className="h-5 w-5 text-hgh-navy" strokeWidth={2} aria-hidden />
            </div>
            <span className="text-lg font-semibold tracking-tight text-hgh-navy">HGH WorkForce</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-hgh-navy">{heading}</h1>
            <p className="mt-2 text-sm text-hgh-muted">{subheading}</p>
          </div>

          {children}

          <p className="mt-8 text-center text-xs text-hgh-muted">
            By continuing, you agree to our{" "}
            <Link
              href="/terms"
              className="font-medium text-hgh-navy underline underline-offset-2 hover:text-hgh-gold"
            >
              Terms
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="font-medium text-hgh-navy underline underline-offset-2 hover:text-hgh-gold"
            >
              Privacy policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
