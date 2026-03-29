"use client";

import Link from "next/link";
import { useState } from "react";
import {
  HelpCircle,
  BookOpen,
  Users,
  Banknote,
  ShieldCheck,
  Calendar,
  ArrowRight,
  Plus,
  Minus,
  Route,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { cn } from "@/lib/utils";

const roadmapSteps: {
  step: number;
  title: string;
  summary: string;
  href?: string;
  hrefLabel?: string;
  extra?: string;
  moreLinks?: { href: string; label: string }[];
}[] = [
  {
    step: 1,
    title: "Account and email",
    summary:
      "Sign up, confirm your email from the message Supabase sends (check spam), then sign in. Without confirmation, sign-in will be blocked.",
  },
  {
    step: 2,
    title: "Create or join a workspace",
    summary:
      "On first login you complete onboarding: either create a new company or join an existing one with an invite code from your administrator.",
    href: "/onboarding",
    hrefLabel: "Open onboarding",
    extra: "If you already have a dashboard, you can skip this—you only do onboarding once per account setup.",
  },
  {
    step: 3,
    title: "Company settings, payroll add-ons, and check-in",
    summary:
      "Configure company details, Ghana tax brackets, optional Tier 2 pension on basic (if your policy uses it), HTTPS webhooks for approved pay runs, check-in mode (kiosk, portal, device binding), and office timezone for shift-based late and overtime.",
    href: "/dashboard/settings",
    hrefLabel: "Settings",
  },
  {
    step: 4,
    title: "Invite your team",
    summary:
      "Add COMPANY_ADMIN and HR users so payroll and attendance are not a single-person bottleneck. They sign in with their own accounts.",
    href: "/dashboard/users",
    hrefLabel: "Users",
  },
  {
    step: 5,
    title: "Employees and pay structure",
    summary:
      "Add employees one by one or import CSV. Enter basic salary, recurring components (allowances and deductions), and optional documents.",
    href: "/dashboard/employees",
    hrefLabel: "Employees",
  },
  {
    step: 6,
    title: "Device binding for check-in (do this early)",
    summary:
      "For each active employee, open their profile and scroll to Device binding to bind their check-in device. Staff need this before the office kiosk can verify them; it is easy to miss if you jump straight to shifts or payroll.",
    href: "/dashboard/employees",
    hrefLabel: "Employees",
    extra:
      "After adding someone new, open their record right away—we send you there with a “next step” hint. You can set up device binding from their profile page.",
    moreLinks: [{ href: "/dashboard/setup-wizard", label: "Setup wizard (guided)" }],
  },
  {
    step: 7,
    title: "Shifts and assignments",
    summary:
      "Define work shifts, then assign employees. Check-in times are compared to these shifts for tardiness and overtime.",
    href: "/dashboard/shifts",
    hrefLabel: "Shifts",
  },
  {
    step: 8,
    title: "Attendance and check-in",
    summary:
      "Employees clock in from the portal or office kiosk; they can request attendance corrections with a reason. You review the daily log, correction requests, and summaries before payroll.",
    href: "/dashboard/attendance",
    hrefLabel: "Attendance",
    extra:
      "Employee self-service is only for accounts with the EMPLOYEE role at /portal (payslips, leave, loans, check-in, corrections). Admins who sign in with a dashboard role are sent to /dashboard instead—invite staff with the employee role so they can use the portal.",
  },
  {
    step: 9,
    title: "Leave (if you use it)",
    summary:
      "Staff request leave from the portal; managers approve or reject in Leave Management with optional notes. Use the Policy tab for accrual and balance caps where you need them; the Balances tab tracks usage.",
    href: "/dashboard/leave",
    hrefLabel: "Leave",
  },
  {
    step: 10,
    title: "Payroll run",
    summary:
      "Create a pay run, generate lines (salary, components, attendance, loans, leave), review overrides, then submit for approval. After approval the run locks, payslips are available, you can download a bank salary CSV, and configured webhooks fire.",
    href: "/dashboard/payroll",
    hrefLabel: "Payroll",
  },
  {
    step: 11,
    title: "Loans, performance, insights, reports, and billing",
    summary:
      "Use the dashboard overview for headcount, attendance briefing, and payroll insights. Run performance review cycles when your team uses that module. Track staff loans if needed, export reports (PAYE, SSNIT, trends, attendance), and open Billing to see trial or subscription status—checkout when Stripe is connected, or ask your operator to activate the workspace if you are moving off trial.",
    href: "/dashboard/reports",
    hrefLabel: "Reports",
    extra:
      "Super admins switch companies from Companies; platform operators can open Platform health for cross-tenant operational checks. Information banners (for example billing notes) can be dismissed—your choice is remembered on this browser.",
    moreLinks: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/dashboard/performance", label: "Performance" },
      { href: "/dashboard/onboarding", label: "Onboarding templates" },
      { href: "/dashboard/loans", label: "Loans" },
      { href: "/dashboard/billing", label: "Billing" },
      { href: "/dashboard/companies", label: "Companies" },
      { href: "/dashboard/platform-health", label: "Platform health" },
    ],
  },
];

const sections = [
  {
    title: "Getting Started",
    icon: BookOpen,
    color: "text-blue-500",
    bg: "bg-blue-50",
    description: "New to HGH Workforce? Learn the basics of setting up your company and onboarding your first employees.",
    links: [
      {
        title: "Hover hints and dismissible tips",
        content:
          "Throughout the dashboard, many links, buttons, and table headers show a short cream tooltip when you hover—use them for quick context. Some informational banners (such as on Billing or an employee profile) include a dismiss control; hiding one only affects your current browser.",
      },
      {
        title: "Production: ENCRYPTION_KEY and employee creation",
        content:
          "Hosted deployments must set ENCRYPTION_KEY (64 hex characters, from openssl rand -hex 32) in the server environment. If creating an employee fails with a configuration error, add that variable on your host (e.g. Vercel project settings), redeploy, then try again. Local development uses a dev-only fallback when the key is unset.",
      },
      {
        title: "Setting up your company profile",
        content: "Go to the Companies page and click 'Add Company'. You'll need to provide your company name, registration number, and office address. You can also upload your company logo for branded payslips."
      },
      {
        title: "Inviting HR and Admin users",
        content: "Navigate to the 'Users' page. Click 'Invite User', enter their email address and select a role (COMPANY_ADMIN or HR). They will receive an email with a link to join your organization."
      },
      {
        title: "Configuring tax brackets",
        content: "HGH Workforce comes with default Ghana GRA tax brackets. If you need custom brackets, go to Settings -> Tax Brackets to adjust the rates and thresholds for different income levels."
      },
      {
        title: "Tier 2 pension, webhooks, and security notes",
        content: "In Settings, enable optional Ghana Tier 2 on basic salary when your payroll policy requires it, register HTTPS webhook URLs to receive signed payloads when a pay run is approved, and review the security summary for how sensitive fields are protected."
      },
    ],
  },
  {
    title: "Employee Management",
    icon: Users,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    description: "Manage your workforce efficiently. Learn how to handle employee profiles, documents, and recurring salary components.",
    links: [
      {
        title: "Adding and importing employees",
        content: "You can add employees manually via the 'Add Employee' button or use the 'Import CSV' tool to upload a bulk list. Ensure your CSV matches the required column headers provided in the upload dialog."
      },
      {
        title: "Managing salary components",
        content: "Open an employee's profile and click the 'Components' tab. Here you can add recurring allowances (like Housing or Transport) and deductions (like Provident Fund) that will be applied automatically every month."
      },
      {
        title: "Uploading employee documents",
        content: "In the 'Docs' tab of an employee profile, you can upload ID cards, contracts, and certificates. Files are stored securely using Vercel Blob storage."
      },
      {
        title: "Onboarding checklist per employee",
        content: "Use the Onboarding tab on an employee profile to create and track tasks (for example contract signed or bank details captured) so new-hire steps stay visible to HR."
      },
      {
        title: "Suspend, exit workflow, and ending employment",
        content:
          "HR and admins can use the ··· menu on the employee list row or on the profile header: open the full record, temporarily suspend (payroll and check-in pause until reactivate), start an exit case under Exits for structured offboarding, or end employment after a confirmation dialog—terminated staff no longer appear on new pay runs, but history and payslips stay. If duplicate rows exist, “End by code” on the employee list ends the correct record by payroll code.",
      },
      {
        title: "Exits (offboarding cases)",
        content:
          "Open Exits to create or continue an exit case: link the employee, capture last working day and reasons, and track clearance-style steps alongside payroll. This complements payroll and attendance; ending employment from the employee menu is the hard cut-over when you are ready.",
      },
    ],
  },
  {
    title: "Payroll Processing",
    icon: Banknote,
    color: "text-amber-500",
    bg: "bg-amber-50",
    description: "Process monthly payroll with ease. Understand how gross pay, SSNIT, and PAYE are calculated automatically.",
    links: [
      {
        title: "Creating a new pay run",
        content: "Go to the Payroll page and click 'New Pay Run'. Select the start and end dates. Once created, click 'Calculate lines' to automatically generate payroll data for all active employees based on their basic salary and recurring components."
      },
      {
        title: "Approving and locking payroll",
        content: "After reviewing the lines, click 'Submit for approval'. A COMPANY_ADMIN can then review and 'Approve' the run. This locks the data and prevents further changes."
      },
      {
        title: "Generating and downloading payslips",
        content: "Once a pay run is approved, branded PDF payslips are generated. Employees download from the portal; admins bulk-download from the pay run detail page. Email delivery is available only when your deployment has email configured."
      },
      {
        title: "Bank salary CSV after approval",
        content: "From an approved pay run, use Bank CSV on the detail page to download a file formatted for batch salary uploads to your bank or internal treasury tooling."
      },
      {
        title: "Approval notes and webhooks",
        content: "Approvers can attach an optional note when locking a run. If webhooks are configured in Settings, approving triggers a signed POST to your endpoint for downstream automation."
      },
    ],
  },
  {
    title: "Leave & Attendance",
    icon: Calendar,
    color: "text-purple-500",
    bg: "bg-purple-50",
    description: "Track team availability. Manage leave requests, check-ins, and shift assignments in one place.",
    links: [
      {
        title: "Approving leave requests",
        content: "Leave requests show up in Leave Management. Admins approve or reject with an optional note. Approved days update balances according to your rules."
      },
      {
        title: "Leave policy and balances",
        content: "Use the Policy tab for accrual and maximum balance caps where your organization needs them. The Balances tab shows entitled vs. used days by leave type."
      },
      {
        title: "Managing employee shifts",
        content: "Set up work shifts (e.g., Morning, Night) in the 'Shifts' page and assign employees to them. This allows the system to calculate lateness and overtime during check-ins."
      },
      {
        title: "Attendance corrections",
        content: "Employees submit correction requests from the portal with a reason. Review and resolve them from the dashboard Attendance view alongside normal clock events so payroll reflects approved adjustments."
      },
    ],
  },
];

export default function HelpPage() {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const toggleItem = (title: string) => {
    setExpandedItem(expandedItem === title ? null : title);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Hero Section */}
      <div className="rounded-2xl bg-hgh-navy p-8 text-center text-white md:p-12">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
          <HelpCircle size={32} className="text-hgh-gold" />
        </div>
        <h1 className="text-3xl font-bold">How can we help you?</h1>
        <p className="mt-4 text-white/70">
          New here? Start with the roadmap below—then dive into the topic guides for more detail. Hover many controls in
          the app for quick cream tooltips on what each action does.
        </p>
      </div>

      {/* End-to-end roadmap */}
      <Card className="overflow-hidden border-hgh-navy/15 shadow-sm">
        <CardHeader className="border-b border-hgh-border bg-hgh-offwhite/80 pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hgh-navy text-hgh-gold">
                <Route size={22} aria-hidden />
              </div>
              <div>
                <CardTitle className="text-lg text-hgh-navy">How to use the app (start to finish)</CardTitle>
                <p className="mt-1 text-sm text-hgh-muted leading-relaxed">
                  Use this as your default path: account → workspace → settings → employees and shifts → attendance →
                  leave (optional) → payroll → reports and insights. Skip what you do not use yet.
                </p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <ol className="space-y-0">
            {roadmapSteps.map((item, index) => (
              <li
                key={item.step}
                className={cn(
                  "flex gap-3 sm:gap-4",
                  index < roadmapSteps.length - 1 && "border-b border-hgh-border/70 pb-6 mb-6",
                )}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-hgh-gold/15 text-sm font-bold tabular-nums text-hgh-navy"
                  aria-hidden
                >
                  {item.step}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <h2 className="text-base font-semibold text-hgh-navy">{item.title}</h2>
                  <p className="text-sm leading-relaxed text-hgh-muted">{item.summary}</p>
                  {item.extra ? (
                    <p className="text-xs leading-relaxed text-hgh-muted">{item.extra}</p>
                  ) : null}
                  {item.step === 8 ? (
                    <p className="text-sm">
                      <HintTooltip content="Staff sign-in for payslips, leave, loans, and check-in—not the admin dashboard.">
                        <Link
                          href="/portal"
                          className="font-medium text-hgh-gold underline decoration-hgh-gold/40 underline-offset-2 hover:text-hgh-gold/80"
                        >
                          Open employee portal (staff sign-in)
                        </Link>
                      </HintTooltip>
                    </p>
                  ) : null}
                  {item.href ? (
                    <HintTooltip content={`Jump to ${item.hrefLabel} in your workspace.`} side="right">
                      <Link
                        href={item.href}
                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-hgh-gold transition-colors hover:text-hgh-gold/80"
                      >
                        Go to {item.hrefLabel}
                        <ArrowRight size={15} className="shrink-0" aria-hidden />
                      </Link>
                    </HintTooltip>
                  ) : null}
                  {item.moreLinks?.length ? (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1 text-xs">
                      {item.moreLinks.map((l) => (
                        <HintTooltip key={l.href} content={`Open: ${l.label}.`} side="top">
                          <Link
                            href={l.href}
                            className="font-medium text-hgh-navy/80 underline decoration-hgh-border underline-offset-2 hover:text-hgh-gold"
                          >
                            {l.label}
                          </Link>
                        </HintTooltip>
                      ))}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Categories Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="overflow-hidden h-fit transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-center gap-4 border-b border-hgh-border bg-hgh-offwhite/50 pb-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${section.bg}`}>
                  <Icon size={24} className={section.color} />
                </div>
                <div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="mb-6 text-sm text-hgh-muted leading-relaxed">
                  {section.description}
                </p>
                <div className="space-y-2">
                  {section.links.map((link) => (
                    <div key={link.title} className="border-b border-hgh-border last:border-0">
                      <button
                        onClick={() => toggleItem(link.title)}
                        className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-hgh-navy hover:text-hgh-gold transition-colors"
                      >
                        <span className="pr-4">{link.title}</span>
                        {expandedItem === link.title ? (
                          <Minus size={16} className="shrink-0 text-hgh-gold" />
                        ) : (
                          <Plus size={16} className="shrink-0 text-hgh-muted" />
                        )}
                      </button>
                      
                      <div
                        className={cn(
                          "overflow-hidden transition-all duration-200 ease-in-out",
                          expandedItem === link.title ? "max-h-[min(32rem,70vh)] pb-4 opacity-100" : "max-h-0 opacity-0"
                        )}
                      >
                        <p className="text-xs text-hgh-muted leading-relaxed bg-hgh-offwhite/50 p-3 rounded-lg border border-hgh-border/50">
                          {link.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Support Section */}
      <Card className="border-hgh-gold/20 bg-hgh-gold/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-6 py-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-hgh-gold text-hgh-navy">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-hgh-navy">Still need assistance?</h3>
              <p className="text-sm text-hgh-muted">Our support team is available Monday to Friday, 8am - 5pm.</p>
            </div>
          </div>
          <HintTooltip content="Reach your administrator or HGH operator—wire this button to mail/support when ready.">
            <Button className="bg-hgh-navy text-white hover:bg-hgh-navy/90">
              Contact Support
              <ArrowRight size={16} className="ml-2" aria-hidden />
            </Button>
          </HintTooltip>
        </CardContent>
      </Card>
    </div>
  );
}
