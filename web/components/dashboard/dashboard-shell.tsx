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
  Smartphone,
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
  Inbox,
  Briefcase,
  Info,
  type LucideIcon,
  Rocket,
} from "lucide-react";
import { SidebarAccountMenu } from "@/components/dashboard/sidebar-account-menu";
import { SidebarTrialUsageCard } from "@/components/dashboard/sidebar-trial-usage-card";
import { NotificationPanel } from "@/components/dashboard/notification-panel";
import { NotificationTrialPeek } from "@/components/dashboard/notification-trial-peek";
import { VerifiedIcon, VerifiedHeaderBadge } from "@/components/dashboard/verified-badge";
import { useCompany } from "@/components/company-context";
import { usePlan } from "@/hooks/usePlan";
import type { PlanModule } from "@/lib/planPermissions";
import { useApi } from "@/lib/swr";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";
import React, { useMemo } from "react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";
import { TrialBillingBanner } from "@/components/dashboard/trial-billing-banner";
import { ReferralToastListener } from "@/components/dashboard/referral-toast-listener";
import { HintTooltip } from "@/components/ui/hint-tooltip";
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
  module?: PlanModule;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navigation: NavGroup[] = [
  {
    label: "Home",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      {
        href: "/dashboard/inbox",
        label: "Inbox",
        icon: Inbox,
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
      },
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
      { href: "/dashboard/employees", label: "Employees", icon: Users, module: "staff_portal_full" },
      {
        href: "/dashboard/onboarding",
        label: "Onboarding",
        icon: ClipboardList,
        module: "staff_portal_full",
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
      },
      {
        href: "/dashboard/performance",
        label: "Performance",
        icon: Medal,
        module: "staff_portal_full",
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
      },
      {
        href: "/dashboard/exits",
        label: "Exits",
        icon: DoorOpen,
        module: "staff_portal_full",
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
      },
      {
        href: "/dashboard/workplace",
        label: "Workplace",
        icon: Briefcase,
        module: "staff_portal_full",
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
      { href: "/dashboard/attendance", label: "Attendance", icon: Smartphone, module: "attendance" },
      { href: "/dashboard/shifts", label: "Shifts", icon: Clock, module: "attendance" },
      { href: "/dashboard/leave", label: "Leave", icon: CalendarDays, module: "leave" },
    ],
  },
  {
    label: "Payroll & Finance",
    items: [
      { href: "/dashboard/payroll", label: "Payroll", icon: Banknote, module: "payroll" },
      { href: "/dashboard/loans", label: "Loans", icon: Landmark, module: "loans" },
    ],
  },
  {
    label: "Reports",
    items: [
      {
        href: "/dashboard/reports",
        label: "Reports",
        icon: TrendingUp,
        module: "reports_basic",
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"],
      },
      {
        href: "/dashboard/reports/cost-vs-revenue",
        label: "Cost vs Revenue",
        icon: BarChart3,
        module: "reports_advanced",
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN"],
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
  "/dashboard/inbox": {
    palette: "amber",
    body: "Approve or reject pending leave requests and attendance corrections for the selected workspace in one place.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/setup-wizard": {
    palette: "teal",
    body: "Follow a guided checklist to finish the basics—company details, employees, tax settings, and office kiosk setup—so payroll and attendance work end to end.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/employees": {
    palette: "indigo",
    body: "Add and maintain your team here: names, salaries, bank and tax details, documents, and kiosk device binding for clock-in. Payroll uses this information on every run.",
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
  "/dashboard/workplace": {
    palette: "teal",
    body: "Hub for workplace HR tools: public holidays, lateness policies and warning letters, notices and pay queries, probation and contract dates on employee records, and optional celebration highlights.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/attendance/live": {
    palette: "emerald",
    body: "Watch who is clocked in right now from kiosk punches—useful for reception or HR when you need a live picture of today's attendance.",
    learnHref: "/dashboard/help",
  },
  "/dashboard/attendance": {
    palette: "sky",
    body: "Review kiosk clock-in/out history, hours, late flags, and employee correction requests so payroll stays fair and auditable.",
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

/** Same rich tooltip treatment as nav links — distinct palette for workspace / company context. */
const WORKSPACE_SIDEBAR_HINT: SidebarNavHint = {
  palette: "sky",
  title: "Workspace",
  body: "The company you have selected right now is your workspace. Employees, payroll, attendance, billing, and reports all follow this choice. Use the switcher below to change company without signing out.",
  learnHref: "/dashboard/help",
};

function navItemIsActive(item: NavItem, pathname: string): boolean {
  return (
    pathname === item.href ||
    (item.href !== "/dashboard" &&
      item.href !== "/dashboard/attendance" &&
      item.href !== "/dashboard/reports" &&
      pathname.startsWith(item.href))
  );
}

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
    const active = navItemIsActive(item, pathname);

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

function CollapsibleNavSection({
  label,
  items,
  pathname,
  expanded,
  onToggle,
  onNavigate,
  showNavHints,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  expanded: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  showNavHints?: boolean;
}) {
  const hasActive = items.some((item) => navItemIsActive(item, pathname));

  return (
    <div className="rounded-lg">
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          "flex w-full min-h-10 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold tracking-wide transition-colors outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold/40",
          hasActive ? "text-hgh-gold" : "text-white/55 hover:bg-white/5 hover:text-white/85",
        )}
      >
        <span>{label}</span>
        <ChevronDown
          size={16}
          className={cn("shrink-0 opacity-70 transition-transform duration-200", expanded && "rotate-180")}
          aria-hidden
        />
      </button>
      {expanded ? (
        <div className="ml-2 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
          {items.map((item) => (
            <SidebarItem
              key={item.href}
              item={item}
              pathname={pathname}
              onNavigate={onNavigate}
              showNavHints={showNavHints}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SidebarCollapsibleNav({
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
  const activeGroupLabel = useMemo(() => {
    const g = groups.find((gr) => gr.items.some((item) => navItemIsActive(item, pathname)));
    return g?.label ?? null;
  }, [groups, pathname]);

  const [openLabel, setOpenLabel] = useState<string | null>(activeGroupLabel);

  useEffect(() => {
    setOpenLabel(activeGroupLabel);
  }, [activeGroupLabel]);

  const toggleSection = (label: string) => {
    setOpenLabel((prev) => (prev === label ? null : label));
  };

  return (
    <nav
      className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-2 py-3"
      aria-label="Dashboard sections"
    >
      {groups.map((group) => (
        <CollapsibleNavSection
          key={group.label}
          label={group.label}
          items={group.items}
          pathname={pathname}
          expanded={openLabel === group.label}
          onToggle={() => toggleSection(group.label)}
          onNavigate={onNavigate}
          showNavHints={showNavHints}
        />
      ))}
    </nav>
  );
}

function SidebarFooterNav({ onNavigate }: { onNavigate?: () => void }) {
  const row =
    "flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/75 transition-colors hover:bg-white/5 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold/40";
  return (
    <div className="shrink-0 space-y-0.5 border-t border-white/10 px-2 pb-1 pt-2">
      <HintTooltip
        content="Workspace preferences: taxes, kiosk, webhooks, and more."
        side="right"
        contentClassName="max-w-[16rem]"
      >
        <Link href="/dashboard/settings" className={row} onClick={() => onNavigate?.()}>
          <Settings size={18} className="shrink-0 text-white/70" aria-hidden />
          Settings
        </Link>
      </HintTooltip>
    </div>
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

function getPlanVisibleNavigation(groups: NavGroup[], hasModule: (m?: PlanModule) => boolean): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasModule(item.module)),
    }))
    .filter((group) => group.items.length > 0);
}

function SidebarStarterUpgradeBanner() {
  const { plan } = usePlan();
  if (plan !== "STARTER_PAYROLL" && plan !== "STARTER_ATTENDANCE") return null;
  return (
    <div className="mx-2 mb-2 mt-1 rounded-lg border border-hgh-gold/35 bg-hgh-gold/10 p-3">
      <div className="flex items-start gap-2">
        <Rocket size={20} className="text-hgh-gold" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-white/85">Upgrade to Pro to unlock all features.</p>
          <Link
            href="/subscribe"
            className="mt-2 inline-flex items-center rounded-md bg-hgh-gold/20 px-2.5 py-1 text-xs font-medium text-hgh-gold hover:bg-hgh-gold/30"
          >
            Upgrade
          </Link>
        </div>
      </div>
    </div>
  );
}

function WorkspaceLabelWithHint() {
  return (
    <div className="flex items-center gap-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Workspace</p>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="inline-flex rounded-md p-0.5 text-white/40 outline-none transition hover:bg-white/10 hover:text-hgh-gold focus-visible:ring-2 focus-visible:ring-hgh-gold/40"
            aria-label="What is a workspace?"
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          align="start"
          sideOffset={8}
          className={cn(
            "max-w-[min(20rem,calc(100vw-2rem))] p-0",
            sidebarNavTooltipSurfaceClassForPalette(WORKSPACE_SIDEBAR_HINT.palette),
          )}
        >
          <SidebarNavHintContent navLabel="Workspace" hint={WORKSPACE_SIDEBAR_HINT} />
        </TooltipContent>
      </Tooltip>
    </div>
  );
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
          <VerifiedIcon subscriptionStatus={selected?.subscriptionStatus} />
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
                <VerifiedIcon subscriptionStatus={c.subscriptionStatus} className="text-hgh-gold/80" />
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
        <WorkspaceLabelWithHint />
      </div>
      <div className="mt-2">
        <CompanySwitcher />
      </div>
    </div>
  );
}

function HeaderVerifiedBadge() {
  const { selected } = useCompany();
  return <VerifiedHeaderBadge subscriptionStatus={selected?.subscriptionStatus} />;
}

/** Reactive header user info — updates when profile is changed without a full page reload. */
function HeaderUserInfo({ fallbackName, fallbackEmail }: { fallbackName: string; fallbackEmail: string }) {
  const { data: me } = useApi<{ name: string; email: string }>("/api/me");
  const displayName = me?.name || fallbackName;
  const email = me?.email || fallbackEmail;
  return (
    <div className="text-right">
      <p className="text-sm font-medium text-hgh-navy">{displayName}</p>
      <p className="max-w-[200px] truncate text-xs text-hgh-muted">{email}</p>
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
  const { canAccess } = usePlan();
  const groups = useMemo(() => {
    const roleGroups = getVisibleNavigation(userRole);
    return getPlanVisibleNavigation(roleGroups, (module) => !module || canAccess(module));
  }, [userRole, canAccess]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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
            "absolute inset-y-0 left-0 flex w-[min(17.5rem,calc(100vw-1.5rem))] max-w-sm min-w-0 flex-col overflow-x-hidden overflow-y-hidden border-r border-hgh-border bg-hgh-navy text-white shadow-xl transition-transform duration-200 ease-out",
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
            <div className="mb-2">
              <WorkspaceLabelWithHint />
            </div>
            <CompanySwitcher />
          </div>
          <SidebarCollapsibleNav
            groups={groups}
            pathname={pathname}
            onNavigate={() => setMobileNavOpen(false)}
            showNavHints={false}
          />
          <SidebarTrialUsageCard userRole={userRole} onNavigate={() => setMobileNavOpen(false)} />
          <SidebarStarterUpgradeBanner />
          <SidebarFooterNav onNavigate={() => setMobileNavOpen(false)} />
          <SidebarAccountMenu email={userEmail} displayName={userDisplayName} />
        </aside>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 min-w-0 shrink-0 flex-col overflow-x-hidden overflow-y-hidden border-r border-hgh-border bg-hgh-navy text-white md:flex">
        <SidebarBrandingBlock />
        <SidebarCollapsibleNav groups={groups} pathname={pathname} showNavHints />
        <SidebarTrialUsageCard userRole={userRole} />
        <SidebarStarterUpgradeBanner />
        <SidebarFooterNav />
        <SidebarAccountMenu email={userEmail} displayName={userDisplayName} />
      </aside>

      {/* Main area */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 shrink-0 border-b border-hgh-border bg-white/95 px-4 py-3 backdrop-blur-md supports-[backdrop-filter]:bg-white/85 md:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2">
              <HintTooltip
                content="Open the sidebar menu to jump to another section on small screens."
                side="bottom"
                contentClassName="max-w-[16rem]"
              >
                <button
                  type="button"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-hgh-border bg-hgh-offwhite text-hgh-navy hover:bg-hgh-border/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hgh-gold/40 md:hidden"
                  aria-controls="dashboard-mobile-drawer"
                  aria-haspopup="dialog"
                  aria-label="Open navigation menu"
                  onClick={() => setMobileNavOpen(true)}
                >
                  <Menu size={20} />
                </button>
              </HintTooltip>
              <div className="min-w-0 flex-1">
                <div className="max-w-full overflow-x-auto [-webkit-overflow-scrolling:touch]">
                  <Breadcrumbs />
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
              <div className="relative flex shrink-0 items-center">
                <NotificationTrialPeek
                  userRole={userRole}
                  notificationsOpen={notificationsOpen}
                  onOpenNotifications={() => setNotificationsOpen(true)}
                />
                <NotificationPanel
                  userRole={userRole}
                  open={notificationsOpen}
                  onOpenChange={setNotificationsOpen}
                />
              </div>
              <HintTooltip
                content="Your permission level in this workspace. Admins configure payroll, attendance, and access; HR-focused roles manage people workflows."
                side="bottom"
                contentClassName="max-w-[18rem]"
              >
                <span className="max-w-[min(160px,45vw)] truncate rounded-md bg-hgh-gold/10 px-2.5 py-1 text-xs font-medium text-hgh-gold sm:max-w-none cursor-help">
                  {userRole.replace("_", " ")}
                </span>
              </HintTooltip>
              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <HeaderUserInfo fallbackName={userDisplayName} fallbackEmail={userEmail} />
                <HeaderVerifiedBadge />
              </div>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 md:p-8">
          <ReferralToastListener />
          <TrialBillingBanner userRole={userRole} />
          {children}
        </main>
      </div>
    </div>
    </TooltipProvider>
  );
}
