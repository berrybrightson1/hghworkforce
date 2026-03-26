"use client";

import Link from "next/link";
import { Fingerprint } from "lucide-react";
import { useApi } from "@/lib/swr";

type ListEmployee = {
  id: string;
  employeeCode: string;
  name?: string | null;
  status: string;
  hasFaceEnrolled?: boolean;
};

export function EmployeeSetupReminder({ companyId }: { companyId: string | null }) {
  const { data: employees, isLoading } = useApi<ListEmployee[]>(
    companyId ? `/api/employees?companyId=${companyId}&status=ACTIVE` : null,
  );

  if (!companyId || isLoading || !employees?.length) return null;

  const missing = employees.filter((e) => e.status === "ACTIVE" && !e.hasFaceEnrolled);
  if (missing.length === 0) return null;

  const preview = missing.slice(0, 3);
  const more = missing.length - preview.length;

  return (
    <div className="flex gap-3 rounded-xl border border-hgh-gold/35 bg-gradient-to-r from-hgh-gold/12 to-transparent px-4 py-3 text-sm text-hgh-navy shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-hgh-navy/90 text-hgh-gold">
        <Fingerprint className="h-5 w-5" aria-hidden />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="font-semibold text-hgh-navy">
          {missing.length} active employee{missing.length === 1 ? "" : "s"} still need a face profile for kiosk check-in
        </p>
        <p className="text-xs leading-relaxed text-hgh-slate">
          Open each person’s profile → <strong>Check-in & kiosk face profile</strong> → register their face. New hires
          are linked there automatically after you add them.
        </p>
        <ul className="flex flex-wrap gap-2 pt-1">
          {preview.map((e) => (
            <li key={e.id}>
              <Link
                href={`/dashboard/employees/${e.id}?setup=face`}
                className="inline-flex rounded-md bg-white px-2 py-0.5 text-xs font-medium text-hgh-navy ring-1 ring-hgh-border transition-colors hover:bg-hgh-offwhite"
              >
                {e.name?.trim() || e.employeeCode}
              </Link>
            </li>
          ))}
          {more > 0 ? <li className="self-center text-xs text-hgh-muted">+{more} more</li> : null}
        </ul>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-xs">
          <Link
            href="/dashboard/setup-wizard"
            className="font-semibold text-hgh-gold underline-offset-2 hover:underline"
          >
            Run setup wizard
          </Link>
          <span className="text-hgh-muted">·</span>
          <Link href="/dashboard/employees" className="font-semibold text-hgh-navy/80 underline-offset-2 hover:underline">
            All employees
          </Link>
          <span className="text-hgh-muted">·</span>
          <Link
            href="/dashboard/help"
            className="font-semibold text-hgh-muted underline-offset-2 hover:text-hgh-navy hover:underline"
          >
            Setup guide
          </Link>
        </div>
      </div>
    </div>
  );
}
