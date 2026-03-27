"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Banknote,
  CalendarDays,
  Landmark,
  TrendingUp,
  ChevronDown,
  Check,
  UserPlus,
  CreditCard,
  Fingerprint,
  Clock,
  Menu,
  X,
  Activity,
  ListChecks,
  ClipboardList,
  Medal,
  DoorOpen,
  Radio,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { SidebarAccountMenu } from "@/components/dashboard/sidebar-account-menu";
import { useCompany } from "@/components/company-context";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";
import React, { useMemo } from "react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { TrialBillingBanner } from "@/components/dashboard/trial-billing-banner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  SidebarNavHintContent,
  sidebarNavTooltipSurfaceClassForPalette,
  type SidebarNavHint,
} from "@/components/ui/tooltip";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Which roles can see this nav item. If omitted, all dashboard roles can see it. */
  roles?: UserRole[];
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navigation: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      {
        href: "/dashboard/setup-wizard",
        label: "Setup wizard",
        icon: ListChecks,
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
      },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/dashboard/employees", label: "Employees", icon: Users },
      {
        href: "/dashboard/onboarding",
        label: "Onboarding",
        icon: ClipboardList,
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
      },
      {
        href: "/dashboard/performance",
        label: "Performance",
        icon: Medal,
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
      },
      {
        href: "/dashboard/exits",
        label: "Exits",
        icon: DoorOpen,
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
      },
    ],
  },
  {
    label: "Attendance",
    items: [
      {
        href: "/dashboard/attendance/live",
        label: "Live View",
        icon: Radio,
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
      },
      { href: "/dashboard/attendance", label: "Attendance", icon: Fingerprint },
      { href: "/dashboard/shifts", label: "Shifts", icon: Clock },
      { href: "/dashboard/leave", label: "Leave", icon: CalendarDays },
    ],
  },
  {
    label: "Payroll & Finance",
    items: [
      { href: "/dashboard/payroll", label: "Payroll", icon: Banknote },
      { href: "/dashboard/loans", label: "Loans", icon: Landmark },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        href: "/dashboard/reports",
        label: "Reports",
        icon: TrendingUp,
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
      },
      {
        href: "/dashboard/reports/cost-vs-revenue",
        label: "Cost vs Revenue",
        icon: BarChart3,
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        href: "/dashboard/companies",
        label: "Companies",
        icon: Building2,
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN"],
      },
      {
        href: "/dashboard/users",
        label: "Users",
        icon: UserPlus,
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN"],
      },
      {
        href: "/dashboard/settings/team",
        label: "Team",
        icon: Settings,
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN"],
      },
      {
        href: "/dashboard/billing",
        label: "Billing",
        icon: CreditCard,
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN"],
      },
      {
        href: "/dashboard/platform-health",
        label: "Platform health",
        icon: Activity,
        roles: ["SUPER_ADMIN"],
      },
    ],
  },
];

/** Hover hints (desktop sidebar): short explanations before navigation, no images. */
const SIDEBAR_NAV_HINTS: Partial<Record<string, SidebarNavHint>> = {
  "/dashboard": {
    palette: "brand",
    body: "See a quick snapshot of your company: headcount, pending leave, loans, and other items that may need your attention today.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/setup-wizard": {
    palette: "teal",
    body: "Follow a guided checklist to finish the basics—company details, employees, tax settings, and check-in—so payroll and attendance work end to end.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/employees": {
    palette: "indigo",
    body: "Add and maintain your team here: names, salaries, bank and tax details, documents, and check-in profile. Payroll uses this information on every run.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/onboarding": {
    palette: "violet",
    body: "Track new hires with templates and tasks so HR and managers know what is done or still pending before someone starts.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/performance": {
    palette: "rose",
    body: "Run review periods, goals, and ratings in one place so feedback between managers and staff stays clear and consistent.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/exits": {
    palette: "amber",
    body: "Record departures, last working days, reasons, and clearance steps so offboarding and final pay stay organised.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/attendance/live": {
    palette: "emerald",
    body: "Watch who is clocked in right now—useful for reception or HR when you need a live picture of today’s attendance.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/attendance": {
    palette: "sky",
    body: "Review clock-in and clock-out history, hours, and corrections so you can answer questions and fix mistakes fairly.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/shifts": {
    palette: "fuchsia",
    body: "Set when people are expected to work so the system can measure late arrivals, early departures, and overtime.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/leave": {
    palette: "cyan",
    body: "Submit, approve, or track leave requests and balances according to your company’s leave types and rules.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/payroll": {
    palette: "orange",
    body: "Create pay runs for a period, calculate Ghana deductions and tax, submit for approval, and mark salaries as paid when money goes out.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/loans": {
    palette: "slate",
    body: "Record staff loans or advances and see balances so repayments can be taken smoothly through payroll.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/reports": {
    palette: "blue",
    body: "Open summaries and exports for payroll, tax, and workforce data—for finance, audits, or management reviews.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/reports/cost-vs-revenue": {
    palette: "pink",
    title: "Cost vs revenue",
    body: "Enter monthly revenue and compare it to payroll cost so you can see people spend against income at a glance.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/companies": {
    palette: "red",
    body: "Create additional companies or switch administrative context when you manage more than one workspace.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/users": {
    palette: "lime",
    body: "Invite colleagues, choose their role (admin, HR, or employee), and control who can sign in to this company.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/settings/team": {
    palette: "warm",
    body: "Manage who belongs to this company and their roles—same idea as Users, opened from Settings for administrators.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/billing": {
    palette: "cool",
    body: "View trial or subscription status and handle plan billing for this workspace.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/platform-health": {
    palette: "deep",
    body: "Technical status and diagnostics for platform operators—most teams never need this screen.",
  },
};

const SidebarItem = React.memo(
  ({
    item,
    pathname,
    onNavigate,
    showNavHints,
  }: {
    item: NavItem;
    pathname: string;
    onNavigate?: () => void;
    showNavHints?: boolean;
  }) => {
    const Icon = item.icon;
    const active =
      pathname === item.href ||
      (item.href !== "/dashboard" &&
        item.href !== "/dashboard/attendance" &&
        item.href !== "/dashboard/reports" &&
        pathname.startsWith(item.href));

    const hint = SIDEBAR_NAV_HINTS[item.href];
    const link = (
      <Link
        href={item.href}
        onClick={() => onNavigate?.()}
        className={cn(
          "flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors outline-none",
          active
            ? "bg-white/10 text-hgh-gold"
            : "text-white/80 hover:bg-white/5 hover:text-white",
        )}
      >
        <Icon size={18} className="shrink-0" />
        {item.label}
      </Link>
    );

    if (!showNavHints || !hint) {
      return link;
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent
          side="right"
          align="start"
          className={cn(
            "max-w-[min(20rem,calc(100vw-2rem))] p-0",
            sidebarNavTooltipSurfaceClassForPalette(hint.palette),
          )}
        >
          <SidebarNavHintContent navLabel={item.label} hint={hint} />
        </TooltipContent>
      </Tooltip>
    );
  },
);
SidebarItem.displayName = "SidebarItem";

function SidebarNav({
  groups,
  pathname,
  onNavigate,
  showNavHints,
}: {
  groups: NavGroup[];
  pathname: string;
  onNavigate?: () => void;
  showNavHints?: boolean;
}) {
  return (
    <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-2 py-4">
      {groups.map((group) => (
        <div key={group.label} className="space-y-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-white/40">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <SidebarItem
                key={item.href}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
                showNavHints={showNavHints}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function getVisibleNavigation(role: UserRole): NavGroup[] {
  return navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);
}

function pageTitle(pathname: string, groups: NavGroup[]): string {
  if (pathname.startsWith("/dashboard/settings")) {
    const parts = pathname.split("/").filter(Boolean);
    const leaf = parts[parts.length - 1];
    const map: Record<string, string> = {
      settings: "Settings",
      taxes: "PAYE brackets",
      "office-kiosk": "Office kiosk",
      "checkin-security": "Check-in security",
      ssnit: "SSNIT rates",
      audit: "Audit log",
      roles: "Roles & access",
      "tier2-pension": "Tier 2 pension",
      webhooks: "Webhooks",
      account: "Account security",
      team: "Team",
    };
    if (leaf && map[leaf]) return map[leaf];
    return "Settings";
  }
  for (const group of groups) {
    const match = group.items.find(
      (n) =>
        pathname === n.href ||
        (n.href !== "/dashboard" && pathname.startsWith(n.href)),
    );
    if (match) return match.label;
  }
  return "Dashboard";
}

function CompanySwitcher() {
  const { companies, selected, select, loading } = useCompany();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full min-h-11 items-center justify-between gap-2 rounded-lg border border-white/10 bg-hgh-navy-light px-3 py-2 text-left text-sm text-white transition hover:bg-hgh-navy-light/90"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Building2 size={16} className="shrink-0 text-hgh-gold" />
          <span className="truncate">
            {loading ? "Loading..." : selected?.name ?? "Select company"}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={cn("shrink-0 opacity-70 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-[min(50vh,20rem)] animate-in overflow-y-auto rounded-lg border border-white/10 bg-hgh-navy-light shadow-xl">
          {companies.length === 0 ? (
            <p className="px-3 py-2 text-xs text-white/50">No companies yet</p>
          ) : (
            companies.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  select(c.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-white/5",
                  c.id === selected?.id ? "text-hgh-gold" : "text-white/80",
                )}
              >
                {c.id === selected?.id ? (
                  <Check size={14} className="shrink-0" />
                ) : (
                  <span className="w-[14px]" />
                )}
                <span className="min-w-0 truncate">{c.name}</span>
                <span className="ml-auto shrink-0 text-xs text-white/40">
                  {c._count?.employees ?? 0}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SidebarBrandingBlock() {
  return (
    <div className="border-b border-white/10 px-4 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-hgh-gold">
        HGH WorkForce
      </p>
      <div className="mt-3">
        <CompanySwitcher />
      </div>
    </div>
  );
}

export function DashboardShell({
  children,
  userEmail,
  userDisplayName,
  userRole,
}: {
  children: React.ReactNode;
  userEmail: string;
  userDisplayName: string;
  userRole: UserRole;
}) {
  const pathname = usePathname();
  const groups = useMemo(() => getVisibleNavigation(userRole), [userRole]);
  const title = useMemo(() => pageTitle(pathname, groups), [pathname, groups]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!mobileNavOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  return (
    <TooltipProvider delayDuration={450} skipDelayDuration={180}>
    <div className="flex h-[100dvh] max-h-[100dvh] overflow-hidden bg-hgh-offwhite">
      {/* Mobile navigation drawer */}
      <div
        className={cn("fixed inset-0 z-50 md:hidden", !mobileNavOpen && "pointer-events-none")}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity",
            mobileNavOpen ? "opacity-100" : "opacity-0",
          )}
          aria-label="Close navigation"
          tabIndex={mobileNavOpen ? 0 : -1}
          onClick={() => setMobileNavOpen(false)}
        />
        <aside
          id="dashboard-mobile-drawer"
          aria-label="Dashboard navigation"
          className={cn(
            "absolute inset-y-0 left-0 flex w-[min(17.5rem,calc(100vw-1.5rem))] max-w-sm flex-col border-r border-hgh-border bg-hgh-navy text-white shadow-xl transition-transform duration-200 ease-out",
            mobileNavOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-hgh-gold">
              Menu
            </p>
            <button
              type="button"
              className="rounded-lg p-2 text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold/50"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
            >
              <X size={22} />
            </button>
          </div>
          <div className="shrink-0 border-b border-white/10 px-4 py-3">
            <CompanySwitcher />
          </div>
          <SidebarNav
            groups={groups}
            pathname={pathname}
            onNavigate={() => setMobileNavOpen(false)}
            showNavHints={false}
          />
          <SidebarAccountMenu email={userEmail} displayName={userDisplayName} />
        </aside>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-hgh-border bg-hgh-navy text-white md:flex">
        <SidebarBrandingBlock />
        <SidebarNav groups={groups} pathname={pathname} showNavHints />
        <SidebarAccountMenu email={userEmail} displayName={userDisplayName} />
      </aside>

      {/* Main area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 shrink-0 border-b border-hgh-border bg-white/95 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-white/85 md:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-2">
              <button
                type="button"
                className="mt-0.5 shrink-0 rounded-lg border border-hgh-border bg-hgh-offwhite p-2 text-hgh-navy hover:bg-hgh-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold/40 md:hidden"
                aria-controls="dashboard-mobile-drawer"
                aria-haspopup="dialog"
                aria-label="Open navigation menu"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0 flex-1">
                <div className="max-w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
                  <Breadcrumbs />
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-hgh-navy md:hidden">{title}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              <span
                className="max-w-[min(160px,45vw)] truncate rounded-md bg-hgh-gold/10 px-2.5 py-1 text-xs font-medium text-hgh-gold sm:max-w-none"
                title={userRole.replace("_", " ")}
              >
                {userRole.replace("_", " ")}
              </span>
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-hgh-navy">{userDisplayName}</p>
                <p className="max-w-[200px] truncate text-xs text-hgh-muted">{userEmail}</p>
              </div>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 md:p-8">
          <TrialBillingBanner userRole={userRole} />
          {children}
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}
