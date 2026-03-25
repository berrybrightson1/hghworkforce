"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";
import { useMemo } from "react";

const routeLabels: Record<string, string> = {
  dashboard: "Overview",
  employees: "Employees",
  companies: "Companies",
  payroll: "Payroll",
  leave: "Leave",
  loans: "Loans",
  attendance: "Attendance",
  shifts: "Shifts",
  reports: "Reports",
  users: "Users",
  billing: "Billing",
  settings: "Settings",
  help: "Help & Guide",
};

export function Breadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    let currentPath = "";

    return parts.map((part, index) => {
      currentPath += `/${part}`;
      
      // Try to get a friendly label, otherwise capitalize the ID or segment
      let label = routeLabels[part] || part.charAt(0).toUpperCase() + part.slice(1);
      
      // If it looks like a CUID or UUID, label it as "Details" or similar 
      // (Simplified check for now)
      if (part.length > 20 && index === parts.length - 1) {
        label = "Details";
      }

      return {
        label,
        href: currentPath,
        active: index === parts.length - 1,
      };
    });
  }, [pathname]);

  if (breadcrumbs.length === 0 || (breadcrumbs.length === 1 && breadcrumbs[0].label === "Overview")) {
    return (
      <nav className="flex items-center space-x-1 text-xs font-medium text-hgh-muted">
        <Link
          href="/"
          className="flex items-center transition-colors hover:text-hgh-gold"
        >
          <Home size={14} className="mr-1" />
          <span className="text-hgh-navy">Overview</span>
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex items-center space-x-1 text-xs font-medium text-hgh-muted">
      <Link
        href="/"
        className="flex items-center transition-colors hover:text-hgh-gold"
      >
        <Home size={14} />
      </Link>

      {breadcrumbs.map((crumb) => (
        <div key={crumb.href} className="flex items-center space-x-1">
          <ChevronRight size={12} className="opacity-50" />
          {crumb.active ? (
            <span className="text-hgh-navy">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="transition-colors hover:text-hgh-gold"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
