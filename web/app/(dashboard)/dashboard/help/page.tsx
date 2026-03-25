"use client";

import { useState } from "react";
import {
  HelpCircle,
  BookOpen,
  Users,
  Banknote,
  ShieldCheck,
  Calendar,
  ChevronDown,
  ArrowRight,
  Plus,
  Minus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const sections = [
  {
    title: "Getting Started",
    icon: BookOpen,
    color: "text-blue-500",
    bg: "bg-blue-50",
    description: "New to HGH Workforce? Learn the basics of setting up your company and onboarding your first employees.",
    links: [
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
        content: "Once a pay run is approved, branded PDF payslips are automatically generated. Employees can download these from their portal, or admins can download them from the pay run details page."
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
        content: "Leave requests show up in the Leave Management page. Admins can approve or reject requests. Approved days are automatically deducted from the employee's remaining balance."
      },
      {
        title: "Tracking leave balances",
        content: "The 'Balances' tab shows a breakdown of entitled vs. used days for each employee across different leave types (Annual, Sick, Maternity, etc.)."
      },
      {
        title: "Managing employee shifts",
        content: "Set up work shifts (e.g., Morning, Night) in the 'Shifts' page and assign employees to them. This allows the system to calculate lateness and overtime during check-ins."
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
          Search our knowledge base or browse the categories below to learn how HGH Workforce works.
        </p>
      </div>

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
                          expandedItem === link.title ? "max-h-[200px] pb-4 opacity-100" : "max-h-0 opacity-0"
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
          <Button className="bg-hgh-navy text-white hover:bg-hgh-navy/90">
            Contact Support
            <ArrowRight size={16} className="ml-2" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
