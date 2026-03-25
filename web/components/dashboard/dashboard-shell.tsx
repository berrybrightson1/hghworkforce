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
  Settings,
  ChevronDown,
  Check,
  UserPlus,
  CreditCard,
  Fingerprint,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { SidebarAccountMenu } from "@/components/dashboard/sidebar-account-menu";
import { useCompany } from "@/components/company-context";
import { cn } from "@/lib/utils";
import type { UserRole } from "@prisma/client";
import React, { useMemo } from "react";
import { Breadcrumbs } from "@/components/dashboard/breadcrumbs";

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
    items: [{ href: "/dashboard", label: "Overview", icon: LayoutDashboard }],
  },
  {
    label: "Workforce & Ops",
    items: [
      { href: "/dashboard/employees", label: "Employees", icon: Users },
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
    label: "Administration",
    items: [
      {
        href: "/dashboard/companies",
        label: "Companies",
        icon: Building2,
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN"],
      },
      {
        href: "/dashboard/reports",
        label: "Reports",
        icon: TrendingUp,
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN"],
      },
      {
        href: "/dashboard/users",
        label: "Users",
        icon: UserPlus,
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN"],
      },
      {
        href: "/dashboard/billing",
        label: "Billing",
        icon: CreditCard,
        roles: ["SUPER_ADMIN", "COMPANY_ADMIN"],
      },
    ],
  },
];

const SidebarItem = React.memo(({ item, pathname }: { item: NavItem; pathname: string }) => {
  const Icon = item.icon;
  const active =
    pathname === item.href ||
    (item.href !== "/dashboard" && pathname.startsWith(item.href));
    
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
        active
          ? "bg-white/10 text-hgh-gold"
          : "text-white/80 hover:bg-white/5 hover:text-white",
      )}
    >
      <Icon size={18} className="shrink-0" />
      {item.label}
    </Link>
  );
});
SidebarItem.displayName = "SidebarItem";

function getVisibleNavigation(role: UserRole): NavGroup[] {
  return navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || item.roles.includes(role)),
    }))
    .filter((group) => group.items.length > 0);
}

function pageTitle(pathname: string, groups: NavGroup[]): string {
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
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/10 bg-hgh-navy-light px-3 py-2 text-left text-sm text-white transition hover:bg-hgh-navy-light/90"
      >
        <span className="flex items-center gap-2 truncate">
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
        <div className="absolute left-0 right-0 top-full z-50 mt-1 animate-in rounded-lg border border-white/10 bg-hgh-navy-light shadow-xl">
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
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-white/5",
                  c.id === selected?.id ? "text-hgh-gold" : "text-white/80",
                )}
              >
                {c.id === selected?.id ? (
                  <Check size={14} className="shrink-0" />
                ) : (
                  <span className="w-[14px]" />
                )}
                <span className="truncate">{c.name}</span>
                <span className="ml-auto text-xs text-white/40">
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

  return (
    <div className="flex h-screen overflow-hidden bg-hgh-offwhite">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-hgh-border bg-hgh-navy text-white md:flex">
        {/* Top: branding + company switcher */}
        <div className="border-b border-white/10 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-hgh-gold">
            HGH WorkForce
          </p>
          <div className="mt-3">
            <CompanySwitcher />
          </div>
        </div>

        {/* Middle: nav links grouped */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
          {groups.map((group) => (
            <div key={group.label} className="space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-white/40">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarItem key={item.href} item={item} pathname={pathname} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom: account menu */}
        <SidebarAccountMenu
          email={userEmail}
          displayName={userDisplayName}
        />
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <header className="flex items-center justify-between border-b border-hgh-border bg-white px-4 py-3 md:px-8">
          <div>
            <Breadcrumbs />
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-hgh-gold/10 px-2.5 py-1 text-xs font-medium text-hgh-gold">
              {userRole.replace("_", " ")}
            </span>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-hgh-navy">{userDisplayName}</p>
              <p className="max-w-[200px] truncate text-xs text-hgh-muted">{userEmail}</p>
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
