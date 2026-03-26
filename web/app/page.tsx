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
  CheckCircle2,
  Download,
  Edit,
  LogIn,
  Monitor,
  Rocket,
  UserPlus,
} from "lucide-react";

const services = [
  {
    icon: "payroll" as const,
    title: "Payroll Management",
    description:
      "End-to-end payroll processing for Ghana-based teams. Automated PAYE, SSNIT, P9A certificates, salary components, and multi-company support - all GRA-compliant out of the box.",
    highlights: [
      "Automated PAYE and SSNIT calculations",
      "Branded PDF payslip generation and email delivery",
      "Multi-company payrun workflow with approval gates",
      "P9A annual tax certificate generation",
      "Leave, loan, and salary component tracking",
      "Excel/CSV export for GRA filing",
    ],
    accentColor: "gold" as const,
  },
  {
    icon: "checkin" as const,
    title: "Employee Check-in",
    description:
      "Attendance that ties straight into payroll. Employees check in from the employee portal (signed-in) or your on-site office kiosk with face verification, optional IP controls, and shift-based late and overtime rules.",
    highlights: [
      "Office kiosk: shared device with name, code, and face match",
      "Portal check-in for employees on their own accounts",
      "Enterprise options: IP allowlists, audit sessions, face verification",
      "Automatic overtime and tardiness vs assigned shifts",
      "Shift scheduling and roster management",
      "Attendance summaries and reports exportable to Excel/CSV/PDF",
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
      "Branded PDF payslips generated instantly with full earnings and deductions breakdown. Bulk download as ZIP or email directly to employees.",
  },
  {
    icon: "selfService" as const,
    title: "Employee Self-Service",
    description:
      "Employees view payslips, check in from the portal, request leave, track loans, and access documents from a mobile-friendly workspace.",
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
      "SSNIT reports, PAYE summaries, payroll cost trends, headcount charts, attendance summaries, and exportable Excel/CSV/PDF reports.",
  },
];

const workflow = [
  {
    step: "01",
    icon: Monitor,
    title: "Check In",
    description:
      "Employees use the portal or the office kiosk (face-verified). Shift-based late and overtime rules apply automatically.",
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
    description: "Company admin reviews and approves. Once locked, records become immutable for audit compliance.",
  },
  {
    step: "04",
    icon: Download,
    title: "Generate & Distribute",
    description: "Branded PDF payslips are generated with full breakdowns and can be downloaded or emailed to employees.",
  },
];

const roles = [
  {
    icon: "superAdmin" as const,
    role: "Super Admin",
    access: [
      "All companies overview",
      "GRA tax bracket editor",
      "Full audit log viewer",
      "Payroll trend and headcount analytics",
    ],
  },
  {
    icon: "companyAdmin" as const,
    role: "Company Admin",
    access: [
      "Company data, check-in security, and kiosk settings",
      "Approve or reject payruns",
      "Attendance oversight with summary reports",
      "Company-level reports and P9A certificates",
    ],
  },
  {
    icon: "hrManager" as const,
    role: "HR Manager",
    access: [
      "Create payrun drafts",
      "Manage employees, shifts, and documents",
      "Leave calendar and loan management",
      "Bulk CSV import and attendance reports",
    ],
  },
  {
    icon: "employee" as const,
    role: "Employee",
    access: [
      "Clock in and out from the portal or kiosk flow",
      "View and download payslips",
      "Request leave and view calendar",
      "Track loan balance",
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
                Pick up payroll, attendance, and reports — everything stays synced to your account.
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
                Create an account to add your companies, track attendance, and run compliant payroll - all from one
                platform.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2 rounded-full bg-hgh-gold px-10 py-4 text-lg font-semibold text-hgh-navy shadow-lg shadow-hgh-gold/25 transition-all hover:bg-hgh-gold/90"
                >
                  <UserPlus size={22} />
                  Get started free
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
