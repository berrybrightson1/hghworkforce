import Link from "next/link";
import { FAQ } from "@/components/landing/FAQ";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingFooter } from "@/components/landing/landing-footer";
import { LandingHero } from "@/components/landing/landing-hero";
import { getLandingAuth } from "@/lib/landing-auth";
import { FeaturesShowcase } from "@/components/landing/features-showcase";
import { RolesShowcase } from "@/components/landing/roles-showcase";
import { ServicesShowcase } from "@/components/landing/services-showcase";
import {
  Award,
  Banknote,
  CheckCircle2,
  Download,
  Edit,
  Fingerprint,
  LogIn,
  Monitor,
  Rocket,
  UserPlus,
} from "lucide-react";
import { TRIAL_DAYS } from "@/lib/billing/access";

const services = [
  {
    icon: "payroll" as const,
    title: "Payroll Management",
    description:
      "End-to-end payroll for Ghana-based teams: PAYE, SSNIT, optional Tier 2 pension on basic salary, P9A certificates, components, and multi-company workspaces — GRA-aligned with approval gates and audit-friendly exports.",
    highlights: [
      "Automated PAYE, SSNIT, and optional Ghana Tier 2 on basic",
      "Branded PDF payslips (portal + admin download; bulk ZIP)",
      "Bank-ready salary CSV after approval; HTTPS webhooks on approve",
      "Pay run and leave approvals can include reviewer notes",
      "P9A annual tax certificates and filing-friendly exports",
      "Leave, loans, and recurring components roll into each run",
    ],
    accentColor: "gold" as const,
  },
  {
    icon: "checkin" as const,
    title: "Employee Check-in",
    description:
      "Attendance that feeds payroll: office kiosk with device binding, shift-based late and overtime, portal Attendance and correction requests, and exports your ops team already use.",
    highlights: [
      "Office kiosk: shared device with name, code, and device binding",
      "Portal Attendance: today's log + correction requests (punch only at kiosk)",
      "Enterprise options: audit sessions and device binding",
      "Automatic overtime and tardiness vs assigned shifts",
      "Shift scheduling and roster management",
      "Daily log, summaries, and Excel/CSV/PDF exports",
    ],
    accentColor: "success" as const,
  },
];

const features = [
  {
    icon: "payroll" as const,
    title: "Automated Payroll",
    description:
      "Run payroll for multiple companies with one click. PAYE, SSNIT, and all statutory deductions calculated automatically.",
  },
  {
    icon: "attendance" as const,
    title: "Attendance Tracking",
    description:
      "Clock in from the portal or the office kiosk. Tardiness and overtime follow shift rules; managers get daily and summary views that feed payroll.",
  },
  {
    icon: "taxCompliance" as const,
    title: "Ghana Tax Compliance",
    description:
      "Built-in GRA tax brackets, SSNIT contribution rates, and downloadable P9A annual tax certificates - always up to date.",
  },
  {
    icon: "multiCompany" as const,
    title: "Multi-Company Support",
    description:
      "Add every company you operate from one account. Each workspace keeps data isolated and scoped to that business.",
  },
  {
    icon: "payslip" as const,
    title: "Payslip Generation",
    description:
      "Branded PDF payslips with full earnings and deductions. Employees download from the portal; admins bulk-ZIP from approved runs.",
  },
  {
    icon: "selfService" as const,
    title: "Employee Self-Service",
    description:
      "Payslips, Attendance and correction requests, leave, loan balances, documents, and onboarding task checklists — mobile-friendly; add to home screen like an app.",
  },
  {
    icon: "shifts" as const,
    title: "Shift & Roster Management",
    description:
      "Create and assign shifts, manage rosters, and track overtime hours automatically. Late arrivals and early departures are flagged and flow into payrun calculations.",
  },
  {
    icon: "reports" as const,
    title: "Reports & Analytics",
    description:
      "SSNIT and PAYE summaries, payroll cost trends, headcount charts, attendance exports — plus dashboard insights at a glance.",
  },
  {
    icon: "integrations" as const,
    title: "Exports & automations",
    description:
      "Bank salary CSV from approved pay runs, signed webhooks when payroll locks, Tier 2 toggles per company — fewer spreadsheets, fewer manual handoffs.",
  },
  {
    icon: "leave" as const,
    title: "Leave management",
    description:
      "Staff request leave from the portal; managers approve with notes. Policies and balances stay visible; approved leave can flow straight into the next pay run.",
  },
  {
    icon: "loans" as const,
    title: "Loans & advances",
    description:
      "Track salary loans and advances with scheduled installments. Deductions roll into pay runs automatically until balances are cleared.",
  },
  {
    icon: "audit" as const,
    title: "Approvals & audit trail",
    description:
      "Pay runs move from draft to approval with optional reviewer notes, then lock. Key actions are logged so your team stays accountable.",
  },
];

const workflow = [
  {
    step: "01",
    icon: Monitor,
    title: "Check In",
    description:
      "Employees punch at the office kiosk (QR device-verified from their phone). Shift-based late and overtime rules apply automatically.",
  },
  {
    step: "02",
    icon: Edit,
    title: "Create Payrun",
    description: "HR drafts a payrun - the system pulls attendance data and auto-calculates gross, SSNIT, PAYE, and net pay.",
  },
  {
    step: "03",
    icon: CheckCircle2,
    title: "Approve & Lock",
    description:
      "Company admin reviews with an optional approval note. Once locked, the run is immutable; configured webhooks fire for downstream systems.",
  },
  {
    step: "04",
    icon: Download,
    title: "Payslips & bank file",
    description:
      "PDF payslips go to the portal and admin bulk download; download a bank-ready salary CSV for the approved run.",
  },
];

const roles = [
  {
    icon: "superAdmin" as const,
    role: "Super Admin",
    access: [
      "All companies overview and platform health (ops)",
      "GRA tax bracket editor",
      "Full audit log viewer",
      "Cross-company payroll trends and headcount analytics",
    ],
  },
  {
    icon: "companyAdmin" as const,
    role: "Company Admin",
    access: [
      "Company data, Tier 2, webhooks, check-in, and kiosk settings",
      "Approve or reject pay runs (with optional notes)",
      "Attendance oversight, corrections, and summary reports",
      "Reports, P9A, and bank CSV from approved runs",
    ],
  },
  {
    icon: "hrManager" as const,
    role: "HR Manager",
    access: [
      "Create pay run drafts and payroll lines",
      "Employees, onboarding tasks, shifts, and documents",
      "Leave policy, calendar, balances, and loans",
      "Bulk CSV import and attendance exports",
    ],
  },
  {
    icon: "employee" as const,
    role: "Employee",
    access: [
      "View Attendance and request fixes; clock in/out at the office kiosk",
      "View and download payslips",
      "Request leave and follow onboarding checklists",
      "Track loan balance from self-service",
    ],
  },
];

export default async function LandingPage() {
  const auth = await getLandingAuth();

  return (
    <div className="min-h-screen bg-hgh-offwhite">
      {/* Navigation */}
      <LandingNav auth={auth} />

      <LandingHero auth={auth} />

      {/* Services */}
      <section
        id="services"
        className="border-t border-hgh-border bg-white py-16 shadow-[0_1px_0_rgba(10,22,40,0.04)] md:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <div className="mb-5 flex justify-center" aria-hidden>
              <span className="h-px w-12 bg-hgh-gold" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-hgh-navy">
              Two services, one seamless platform
            </h2>
            <p className="text-base leading-relaxed text-hgh-muted">
              HGH WorkForce combines payroll management and employee check-in into a single system. Attendance feeds
              directly into pay calculations — no imports, no reconciliation.
            </p>
          </div>

          <ServicesShowcase services={services} />
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="border-t border-hgh-border bg-hgh-offwhite py-16 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <div className="mb-4 flex justify-center" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-hgh-gold" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-hgh-navy">
              Everything you need to manage your workforce
            </h2>
            <p className="leading-relaxed text-hgh-muted">
              From automated tax calculations to real-time attendance tracking,
              HGH WorkForce handles the complexity so your HR team can focus on
              people.
            </p>
          </div>

          <FeaturesShowcase features={features} />
        </div>
      </section>

      <section className="border-t border-hgh-border bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-bold text-hgh-navy">Choose only what your business needs</h2>
            <p className="mt-3 text-sm leading-relaxed text-hgh-muted">
              Not every business needs every feature. Start with what matters most — add more when you&apos;re ready.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-hgh-border bg-hgh-offwhite/50 p-5">
              <Banknote size={24} className="text-hgh-gold" aria-hidden />
              <h3 className="mt-2 text-lg font-semibold text-hgh-navy">Payroll Only</h3>
              <p className="mt-2 text-sm leading-relaxed text-hgh-muted">
                Run payroll, calculate Ghana PAYE and SSNIT, generate payslips, and give staff access to their pay
                history — without the attendance module.
              </p>
            </div>
            <div className="rounded-xl border border-hgh-border bg-hgh-offwhite/50 p-5">
              <Fingerprint size={24} className="text-hgh-gold" aria-hidden />
              <h3 className="mt-2 text-lg font-semibold text-hgh-navy">Attendance Only</h3>
              <p className="mt-2 text-sm leading-relaxed text-hgh-muted">
                Set up your office kiosk, track clock-ins and clock-outs, manage corrections, and monitor attendance —
                without payroll.
              </p>
            </div>
            <div className="rounded-xl border border-hgh-gold/35 bg-hgh-offwhite/50 p-5">
              <div className="flex items-center justify-between gap-2">
                <Award size={24} className="text-hgh-gold" aria-hidden />
                <span className="rounded-md bg-hgh-gold/15 px-2 py-0.5 text-[11px] font-medium text-hgh-gold">
                  Most Popular
                </span>
              </div>
              <h3 className="mt-2 text-lg font-semibold text-hgh-navy">Everything with Pro</h3>
              <p className="mt-2 text-sm leading-relaxed text-hgh-muted">
                Payroll, attendance, leave, loans, and advanced reports — all connected, all in one dashboard.
              </p>
            </div>
          </div>
          <div className="mt-8 text-center">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center rounded-full bg-hgh-navy px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-hgh-navy/20 transition hover:bg-hgh-navy-light"
            >
              Start your free 3-day trial — no card required
            </Link>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="relative overflow-hidden border-t border-hgh-navy-light bg-hgh-navy py-16 md:py-24">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_75%_55%_at_50%_0%,rgba(201,168,76,0.14),transparent_52%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-16 max-w-2xl text-center">
            <div className="mb-4 flex justify-center" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-hgh-gold" />
            </div>
            <h2 className="mb-4 text-3xl font-bold text-white">
              From check-in to payslip in four steps
            </h2>
            <p className="leading-relaxed text-white/55">
              Attendance and payroll connected end-to-end, with built-in
              approval gates and audit trails at every stage.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {workflow.map((item, index) => (
              <div key={item.step} className="relative">
                {index < workflow.length - 1 && (
                  <div className="absolute left-[calc(50%+40px)] top-12 hidden h-px w-[calc(100%-80px)] bg-hgh-gold/25 lg:block" />
                )}
                <div className="rounded-xl border border-hgh-gold/15 bg-hgh-navy-light/80 p-7 shadow-lg shadow-black/20 backdrop-blur-sm transition-all hover:border-hgh-gold/35">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-hgh-gold/15 ring-1 ring-hgh-gold/25">
                      <item.icon className="text-hgh-gold" size={22} />
                    </div>
                    <span className="font-mono text-sm text-hgh-gold/50">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-white/55">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Roles */}
      <section className="border-t border-hgh-border bg-white py-16 md:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-16">
            <div className="mb-4 flex justify-center" aria-hidden>
              <span className="h-1 w-10 rounded-full bg-hgh-gold" />
            </div>
            <h2 className="mb-3 text-2xl font-bold text-hgh-navy sm:mb-4 sm:text-3xl">
              Built for every role
            </h2>
            <p className="text-sm leading-relaxed text-hgh-muted sm:text-base">
              Role-based access ensures everyone sees exactly what they need -
              nothing more, nothing less.
            </p>
          </div>

          <RolesShowcase roles={roles} />
        </div>
      </section>

      {/* FAQ */}
      <div className="border-t border-hgh-border">
        <FAQ />
      </div>

      {/* CTA */}
      <section className="border-t border-hgh-border bg-hgh-navy py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-hgh-gold" aria-hidden />
          <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-hgh-gold shadow-lg shadow-hgh-gold/25">
            <Rocket className="text-hgh-navy" size={32} />
          </div>
          {auth.loggedIn ? (
            <>
              <h2 className="mb-4 text-3xl font-bold text-white">Continue in HGH WorkForce</h2>
              <p className="mx-auto mb-10 max-w-xl leading-relaxed text-white/55">
                Pick up payroll, attendance, insights, and exports — everything stays scoped to your workspace.
              </p>
              <Link
                href={auth.appHref}
                className="inline-flex items-center gap-2 rounded-full bg-hgh-gold px-10 py-4 text-lg font-semibold text-hgh-navy shadow-lg shadow-hgh-gold/25 transition-all hover:bg-hgh-gold/90"
              >
                {auth.label}
              </Link>
            </>
          ) : (
            <>
              <h2 className="mb-4 text-3xl font-bold text-white">
                Ready to unify your workforce operations?
              </h2>
              <p className="mx-auto mb-10 max-w-xl leading-relaxed text-white/55">
                Create an account to add companies, track attendance, and run compliant payroll — one platform for the
                whole cycle. New workspaces get a {TRIAL_DAYS}-day trial with every feature; subscribe from Billing to
                stay unlocked after that.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 rounded-full bg-hgh-gold px-10 py-4 text-lg font-semibold text-hgh-navy shadow-lg shadow-hgh-gold/25 transition-all hover:bg-hgh-gold/90"
                >
                  <UserPlus size={22} />
                  Start {TRIAL_DAYS}-day trial
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/5 px-8 py-4 text-lg font-medium text-white backdrop-blur-sm transition-all hover:border-hgh-gold/40 hover:bg-white/10"
                >
                  <LogIn size={22} />
                  Sign in
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
