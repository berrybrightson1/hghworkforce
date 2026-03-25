"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const categories = ["General", "Payroll", "Check-in", "Employees", "Compliance"] as const;
type Category = (typeof categories)[number];

const faqData: Record<Category, { question: string; answer: string }[]> = {
  General: [
    {
      question: "What is HGH WorkForce?",
      answer:
        "HGH WorkForce is a unified payroll and attendance platform for organizations in Ghana. It combines payroll processing, employee check-in tracking, shift management, and self-service into a single system - with each customer's companies and data kept isolated.",
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
      question: "How do I get started?",
      answer:
        "Create an account with your work email, then add your organization and companies. Invite teammates with the right roles, import employees individually or bulk-import via CSV, configure your office geofence, and start tracking attendance and drafting pay runs. If you already have an account, sign in and pick the company you want to work in.",
    },
  ],
  Payroll: [
    {
      question: "How does the payrun workflow work?",
      answer:
        "HR creates a draft payrun, and the system auto-calculates gross pay, SSNIT contributions, PAYE tax, and net pay for every employee. HR reviews the calculations, submits for approval, and the Company Admin either approves or rejects it. Approved payruns are locked and become immutable.",
    },
    {
      question: "Can I override individual payroll calculations?",
      answer:
        "Yes. During the review stage, HR can override individual line items with a reason note. All overrides are logged in the audit trail for compliance purposes. Once a payrun is approved and locked, no further changes can be made.",
    },
    {
      question: "What happens after a payrun is approved?",
      answer:
        "Once approved, the payrun is locked with a timestamp and becomes immutable. Branded PDF payslips are automatically generated for each employee and can be bulk-downloaded as a ZIP file or emailed directly to employees via the system.",
    },
    {
      question: "How are payslips generated and distributed?",
      answer:
        "Payslips are generated as branded PDF documents using the HGH template - including earnings breakdown, salary components (allowances and deductions), SSNIT contributions, PAYE, and net pay. They can be downloaded individually, bulk-exported as a ZIP, or emailed to employees.",
    },
  ],
  "Check-in": [
    {
      question: "How does employee check-in work?",
      answer:
        "Employees clock in and out from any device - mobile or desktop. Each check-in is verified against your company's GPS geofence, so you know whether the employee was within the office area. Tardiness and overtime are calculated automatically based on assigned shifts. All attendance data syncs in real time and feeds directly into payroll calculations.",
    },
    {
      question: "Can I set up shift schedules and geofences?",
      answer:
        "Yes. HR managers can create shift templates, assign employees to shifts, and manage rosters by department. Company admins can also configure a GPS geofence by setting an office location and radius. The system tracks scheduled versus actual hours, flags late arrivals (with a 5-minute grace period), detects early departures, and calculates overtime automatically.",
    },
    {
      question: "How does attendance connect to payroll?",
      answer:
        "When HR creates a payrun, the system pulls attendance data for the pay period automatically. Hours worked, overtime, and absences are factored into gross pay calculations before SSNIT and PAYE deductions are applied. No manual imports or reconciliation needed.",
    },
    {
      question: "What attendance reports are available?",
      answer:
        "You can view a daily attendance log with status filters and search, or switch to a summary view showing per-employee stats over a date range - including total hours, overtime, late count, early departures, and geofence violations. Reports are exportable to Excel, CSV, or PDF.",
    },
  ],
  Employees: [
    {
      question: "What can employees access through the self-service portal?",
      answer:
        "Employees can view and download their payslips from a dedicated payslip history page, check in and out with GPS verification, submit leave requests, view leave balances via a calendar, and track loan or salary advance repayment progress - all from a mobile-friendly portal.",
    },
    {
      question: "How do leave requests work?",
      answer:
        "Employees submit leave requests through the portal, specifying the type (Annual, Sick, Maternity, Paternity, Compassionate, or Unpaid) and dates. HR or the Company Admin reviews and approves or rejects the request. Approved unpaid leave automatically creates a deduction in the next payrun.",
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
        "SSNIT (Social Security and National Insurance Trust) contributions are mandatory in Ghana. The employee contributes 5.5% of basic salary and the employer contributes 13%. HGH Payroll calculates both automatically and includes them on every payslip.",
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
