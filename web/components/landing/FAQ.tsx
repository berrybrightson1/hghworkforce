"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { TRIAL_DAYS } from "@/lib/billing/access";

const categories = ["General", "Payroll", "Check-in", "Employees", "Compliance"] as const;
type Category = (typeof categories)[number];

const faqData: Record<Category, { question: string; answer: string }[]> = {
  General: [
    {
      question: "What is HGH WorkForce?",
      answer:
        "HGH WorkForce is a unified payroll and attendance platform for organizations in Ghana. It combines payroll, check-in, shifts, leave, loans, onboarding tasks, dashboard insights, and optional automations (bank salary CSV exports and HTTPS webhooks on pay run approval) — with each customer's companies and data kept isolated.",
    },
    {
      question: "Can I run payroll for more than one company?",
      answer:
        "Yes. Add as many company workspaces as you need under your account. Each company has its own employees, attendance records, pay runs, and reports, while you manage everything from one dashboard.",
    },
    {
      question: "Who is HGH WorkForce built for?",
      answer:
        "HGH WorkForce supports four roles: Super Admins who oversee the whole platform, Company Admins who approve pay runs for their business, HR Managers who handle day-to-day payroll and attendance operations, and Employees who use self-service for check-ins, payslips, leave, and loan balances.",
    },
    {
      question: "How do trials and billing work?",
      answer: `There is a single product for everyone — no feature tiers. Each new company workspace gets a ${TRIAL_DAYS}-day free trial with full access to payroll, attendance, portal, and exports. When the trial ends, that workspace locks until a company admin completes subscription under Dashboard → Billing. Super admins can also grant paid access for support cases.`,
    },
    {
      question: "How do I get started?",
      answer:
        "Create an account with your work email, then add your organization and companies. Your workspace trial starts when the company is created. Invite teammates with the right roles, import employees individually or bulk-import via CSV, turn on check-in options that fit your business (portal, kiosk, IP rules, face verification), configure payroll settings (including optional Ghana Tier 2 pension on basic and webhooks if you use them), and start tracking attendance and drafting pay runs. If you already have an account, sign in and pick the company you want to work in.",
    },
    {
      question: "Can I install HGH WorkForce on my phone?",
      answer:
        "The dashboard and portal are mobile-friendly web apps. On many phones and tablets you can use your browser's Add to Home Screen option for an app-like shortcut (PWA). You still sign in securely through the same accounts as on desktop.",
    },
  ],
  Payroll: [
    {
      question: "How does the payrun workflow work?",
      answer:
        "HR creates a draft pay run, and the system auto-calculates gross pay, SSNIT, optional Tier 2 pension on basic (if enabled for the company), PAYE, and net pay. HR reviews line items, submits for approval, and the Company Admin approves or rejects — optionally adding an approval note. Approved pay runs lock and become immutable.",
    },
    {
      question: "Can I override individual payroll calculations?",
      answer:
        "Yes. During the review stage, HR can override individual line items with a reason note. All overrides are logged in the audit trail for compliance purposes. Once a payrun is approved and locked, no further changes can be made.",
    },
    {
      question: "What happens after a payrun is approved?",
      answer:
        "Once approved, the pay run is locked with a timestamp and becomes immutable. Branded PDF payslips are generated for each employee. Admins can bulk-download payslips as a ZIP; employees download their own from the self-service portal. If your environment has transactional email configured, admins may also send payslips by email from the product — otherwise use PDF download.",
    },
    {
      question: "How are payslips generated and distributed?",
      answer:
        "Payslips are branded PDFs with earnings, components, deductions, SSNIT, PAYE, Tier 2 (when applicable), and net pay. Distribution is primarily PDF download: individually, as a bulk ZIP for admins, or via the employee portal. Email delivery is available when your deployment has email provider credentials configured.",
    },
    {
      question: "Can I export a bank file for salary payments?",
      answer:
        "Yes. After a pay run is approved, Company Admins can download a bank-ready salary CSV from the pay run detail page to upload to your bank or treasury workflow (format is suited to batch salary disbursements).",
    },
    {
      question: "What are pay run webhooks?",
      answer:
        "Company Admins can register HTTPS endpoints in Settings. When a pay run is approved, the system POSTs a signed payload to your endpoint so finance or internal tools can react automatically — for example updating an ERP or notifying treasury.",
    },
  ],
  "Check-in": [
    {
      question: "How does employee check-in work?",
      answer:
        "Employees can check in from the self-service portal (signed in) or from an office kiosk link: they enter name and employee code, then confirm with a face match against their enrolled profile. Companies can add enterprise controls such as IP allowlists and optional audit sessions. Tardiness and overtime follow assigned shift rules, and attendance feeds payroll in real time.",
    },
    {
      question: "What if someone needs to correct a check-in or clock-out?",
      answer:
        "Employees can submit an attendance correction request from the portal (with a reason). Managers review those requests on the dashboard Attendance experience alongside the daily log and summaries, so fixes stay auditable instead of ad-hoc spreadsheet edits.",
    },
    {
      question: "Can I set up shift schedules and kiosk hours?",
      answer:
        "Yes. HR managers can create shift templates, assign employees to shifts, and manage rosters by department. Company admins can configure office kiosk open/close windows, cut-off times for new clock-ins, time zone, and optional IP rules and face verification. The system tracks scheduled versus actual hours, flags late arrivals (with a 5-minute grace period), detects early departures, and calculates overtime automatically.",
    },
    {
      question: "How does attendance connect to payroll?",
      answer:
        "When HR creates a payrun, the system pulls attendance data for the pay period automatically. Hours worked, overtime, and absences are factored into gross pay calculations before SSNIT and PAYE deductions are applied. No manual imports or reconciliation needed.",
    },
    {
      question: "What attendance reports are available?",
      answer:
        "You can view a daily attendance log with status filters and search, or switch to a summary view showing per-employee stats over a date range - including total hours, overtime, late count, and early departures. Reports are exportable to Excel, CSV, or PDF.",
    },
  ],
  Employees: [
    {
      question: "What can employees access through the self-service portal?",
      answer:
        "Employees can view and download their payslips from a dedicated payslip history page, check in and out from the portal (or your company’s kiosk flow in the office), submit leave requests, view leave balances via a calendar, and track loan or salary advance repayment progress - all from a mobile-friendly portal.",
    },
    {
      question: "How do leave requests work?",
      answer:
        "Employees submit leave requests through the portal, choosing the type and dates. HR or the Company Admin approves or rejects — optionally adding a note. Leave balances respect your company's leave policy (accrual and caps) where configured. Approved unpaid leave can flow into payroll as deductions on the next run.",
    },
    {
      question: "Is there onboarding tracking for new hires?",
      answer:
        "Yes. On each employee profile, HR can use the Onboarding tab to track per-person tasks (for example ID upload or contract signed) so hiring steps don't live only in email threads.",
    },
    {
      question: "How are loans and salary advances tracked?",
      answer:
        "HR creates loan or advance records with the total amount, disbursement date, and monthly installment. The system auto-generates recurring deductions for each payrun and tracks the outstanding balance. Loans auto-close when fully repaid. Employees can view their own loan status in the portal.",
    },
    {
      question: "Can employees download their own payslips?",
      answer:
        "Yes. Employees have a dedicated Payslips page in the self-service portal showing all their salary statements with period, net pay, and generation date. Any payslip can be downloaded as a branded PDF with a full earnings and deductions breakdown.",
    },
  ],
  Compliance: [
    {
      question: "How does HGH WorkForce handle Ghana tax compliance?",
      answer:
        "The system uses a built-in Ghana tax engine that calculates PAYE tax using the current GRA tiered brackets. Tax brackets are stored in the database and can be updated annually by a Super Admin when GRA publishes new rates. You can also generate and download P9A annual tax certificates for each employee as PDF documents. All calculations follow the official PAYE formula.",
    },
    {
      question: "What is SSNIT and how is it calculated?",
      answer:
        "SSNIT (Social Security and National Insurance Trust) contributions are mandatory in Ghana. The employee contributes 5.5% of basic salary and the employer contributes 13%. HGH WorkForce calculates both automatically and includes them on every payslip.",
    },
    {
      question: "What is Ghana Tier 2 pension in the product?",
      answer:
        "When enabled in company payroll settings, Tier 2 is calculated as a percentage of basic salary and shown on payslips alongside other statutory lines — useful for employers that operate Tier 2 alongside SSNIT Tier 1 in their payroll policy.",
    },
    {
      question: "Are audit trails maintained?",
      answer:
        "Yes. Every mutation in the system -employee changes, payrun approvals, salary adjustments, and more -writes an immutable record to the audit log. Audit entries include the actor, action, before/after state, and IP address. They cannot be deleted, even by a Super Admin.",
    },
    {
      question: "How is sensitive employee data protected?",
      answer:
        "Bank account numbers, SSNIT numbers, and TIN are encrypted at rest using AES-256 encryption. All API routes verify authentication and role-based permissions before any database query. Data is scoped by company using row-level security, and documents are stored with signed URLs that expire after one hour.",
    },
  ],
};

export function FAQ() {
  const [activeTab, setActiveTab] = useState<Category>("General");
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleTabChange = (tab: Category) => {
    setActiveTab(tab);
    setOpenIndex(null);
  };

  const toggleQuestion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="bg-hgh-offwhite py-16 md:py-24">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        {/* Heading — larger typography on desktop only */}
        <div className="mb-8 text-center md:mb-10">
          <div className="mb-4 flex justify-center" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-hgh-gold" />
          </div>
          <h2 className="mb-3 text-2xl font-bold tracking-tight text-hgh-navy md:mb-4 md:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-hgh-muted md:text-lg">
            Everything you need to know about running compliant payroll and
            tracking attendance with HGH WorkForce.
          </p>
        </div>

        {/* Tabs — mobile: HGH card; md+: muted rail + white pill (shadcn-style) */}
        <div className="mb-8 md:mb-12 md:flex md:justify-center">
          <div
            className={cn(
              "mx-auto flex w-full max-w-md flex-wrap justify-center gap-2 rounded-2xl border border-hgh-border bg-white p-2 shadow-sm",
              "md:mx-0 md:inline-flex md:w-auto md:max-w-none md:flex-nowrap md:rounded-full md:border md:border-hgh-border md:bg-hgh-offwhite md:p-1 md:shadow-none",
            )}
            role="tablist"
            aria-label="FAQ categories"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={activeTab === cat ? "true" : "false"}
                onClick={() => handleTabChange(cat)}
                className={cn(
                  "min-h-11 min-w-[calc(50%-4px)] flex-1 rounded-xl px-3 py-2.5 text-center text-xs font-medium transition-all duration-200 md:min-h-0 md:min-w-0 md:flex-none md:rounded-full md:px-5 md:py-2 md:text-sm",
                  activeTab === cat
                    ? "bg-hgh-navy text-white shadow-sm md:bg-white md:font-semibold md:text-hgh-navy md:shadow-md"
                    : "text-hgh-slate hover:text-hgh-navy md:bg-transparent md:font-medium md:text-hgh-muted md:shadow-none md:hover:text-hgh-navy",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Accordion — mobile: bordered card; md+: dividers only, no side box */}
        <div
          className={cn(
            "divide-y divide-hgh-border rounded-xl border border-hgh-border bg-white px-1",
            "md:rounded-none md:border-0 md:bg-transparent md:px-0 md:shadow-none md:divide-neutral-200",
          )}
        >
          {faqData[activeTab].map((item, index) => (
            <div key={`${activeTab}-${index}`} className="px-3 md:px-0">
              <button
                type="button"
                onClick={() => toggleQuestion(index)}
                className="group flex w-full items-start gap-3 py-5 text-left md:gap-4 md:py-5"
                aria-expanded={openIndex === index ? "true" : "false"}
              >
                <span
                  className={cn(
                    "min-w-0 flex-1 text-sm font-medium leading-snug transition-colors md:text-base",
                    openIndex === index ? "text-hgh-navy" : "text-hgh-slate",
                    "group-hover:text-hgh-navy md:text-neutral-900 md:group-hover:text-neutral-950",
                    openIndex === index && "md:text-neutral-950",
                  )}
                >
                  {item.question}
                </span>
                <ChevronDown
                  className={cn(
                    "mt-0.5 shrink-0 text-hgh-muted transition-transform duration-200 md:mt-0 md:text-neutral-400",
                    openIndex === index && "rotate-180",
                  )}
                  size={20}
                  aria-hidden
                />
              </button>
              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-in-out",
                  openIndex === index ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <p className="break-words pb-5 pr-1 text-sm leading-relaxed text-hgh-muted md:pb-5 md:pr-10 md:text-neutral-600">
                    {item.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
