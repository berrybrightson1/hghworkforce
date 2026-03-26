"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";
import { cn } from "@/lib/utils";
import type { SettingsSectionId } from "./types";
import { useSettingsPreviewNav } from "./settings-preview-context";

const BASE = "/dashboard/settings";

const navLinkClass =
  "block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900";

export function SettingsSubNav() {
  const pathname = usePathname();
  const { selected } = useCompany();
  const { data: me } = useApi<{ role: string }>("/api/me");
  const { setPreviewSection } = useSettingsPreviewNav();

  const checkinSettingsUrl =
    selected &&
    (me?.role === "SUPER_ADMIN" || me?.role === "COMPANY_ADMIN" || me?.role === "HR")
      ? `/api/companies/${selected.id}/checkin-settings`
      : null;
  const { data: checkinSettings } = useApi<unknown>(checkinSettingsUrl);

  const canCompanyPayrollSettings =
    me?.role === "SUPER_ADMIN" || me?.role === "COMPANY_ADMIN";
  const payrollSettingsUrl =
    selected && canCompanyPayrollSettings
      ? `/api/companies/${selected.id}/payroll-settings`
      : null;
  const { data: payrollSettings } = useApi<{ tier2PensionEnabled: boolean }>(payrollSettingsUrl);

  const canEditCheckin =
    me?.role === "SUPER_ADMIN" ||
    me?.role === "COMPANY_ADMIN" ||
    me?.role === "HR";

  const items = useMemo(() => {
    const out: { href: string; label: string; section: SettingsSectionId }[] = [
      { href: `${BASE}/taxes`, label: "PAYE brackets", section: "taxes" },
    ];
    if (canEditCheckin && selected) {
      out.push({
        href: `${BASE}/office-kiosk`,
        label: "Office kiosk",
        section: "office-kiosk",
      });
      if (checkinSettings) {
        out.push({
          href: `${BASE}/checkin-security`,
          label: "Check-in security",
          section: "checkin-security",
        });
      }
    }
    out.push(
      { href: `${BASE}/ssnit`, label: "SSNIT rates", section: "ssnit" },
      { href: `${BASE}/audit`, label: "Audit log", section: "audit" },
      { href: `${BASE}/roles`, label: "Roles & access", section: "roles" },
    );
    if (selected && canCompanyPayrollSettings && payrollSettings) {
      out.push({
        href: `${BASE}/tier2-pension`,
        label: "Tier 2 pension",
        section: "tier2-pension",
      });
    }
    if (selected && canCompanyPayrollSettings) {
      out.push({ href: `${BASE}/webhooks`, label: "Webhooks", section: "webhooks" });
    }
    out.push({ href: `${BASE}/account`, label: "Account security", section: "account" });
    return out;
  }, [
    canEditCheckin,
    selected,
    checkinSettings,
    canCompanyPayrollSettings,
    payrollSettings,
  ]);

  return (
    <aside
      className={cn(
        "shrink-0 lg:sticky lg:top-20 lg:z-10 lg:w-52 lg:self-start xl:w-56",
        "lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:overflow-x-hidden",
        "border-b border-zinc-200/80 pb-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8",
      )}
    >
      <nav
        aria-label="Settings sections"
        className="flex flex-row gap-1 overflow-x-auto pb-0.5 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0"
      >
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                navLinkClass,
                "whitespace-nowrap lg:whitespace-normal",
                active && "bg-zinc-100 font-medium text-zinc-900",
              )}
              onMouseEnter={() => setPreviewSection(item.section)}
              onFocus={() => setPreviewSection(item.section)}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
