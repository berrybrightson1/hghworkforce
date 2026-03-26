"use client";

import { useDeferredValue, useMemo, useState } from "react";
import type { SubscriptionStatus } from "@prisma/client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PlatformCompanySubscriptionActions } from "@/components/dashboard/platform-company-subscription-actions";

export type PlatformCompanyAccessRow = {
  id: string;
  name: string;
  subscriptionStatus: SubscriptionStatus;
  trialEndsAtIso: string | null;
  createdAtIso: string;
  employeeCount: number;
};

export function PlatformCompaniesAccessBrowser({ companies }: { companies: PlatformCompanyAccessRow[] }) {
  const [query, setQuery] = useState("");
  const deferredQ = useDeferredValue(query.trim().toLowerCase());

  const filtered = useMemo(() => {
    if (!deferredQ) return companies;
    return companies.filter((c) => {
      if (c.name.toLowerCase().includes(deferredQ)) return true;
      if (c.id.toLowerCase().includes(deferredQ)) return true;
      return false;
    });
  }, [companies, deferredQ]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hgh-muted"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Search by workspace name or ID…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9"
          autoComplete="off"
          aria-label="Filter workspaces"
        />
      </div>
      <p className="text-xs text-hgh-muted">
        Showing <span className="tabular-nums font-medium text-hgh-navy">{filtered.length}</span> of{" "}
        <span className="tabular-nums font-medium text-hgh-navy">{companies.length}</span> workspaces
      </p>
      <div className="max-h-[min(70vh,520px)] overflow-auto rounded-lg border border-hgh-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-hgh-offwhite/95 backdrop-blur-sm">
            <tr className="border-b border-hgh-border text-left">
              <th className="px-4 py-2 font-medium text-hgh-muted">Name</th>
              <th className="px-4 py-2 font-medium text-hgh-muted">ID</th>
              <th className="px-4 py-2 font-medium text-hgh-muted">Trial ends</th>
              <th className="px-4 py-2 font-medium text-hgh-muted">Subscription</th>
              <th className="px-4 py-2 font-medium text-hgh-muted">Employees</th>
              <th className="px-4 py-2 font-medium text-hgh-muted">Created</th>
              <th className="px-4 py-2 font-medium text-hgh-muted">Access</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-hgh-muted">
                  No workspaces match your search.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b border-hgh-border last:border-0">
                  <td className="px-4 py-2 font-medium text-hgh-navy">{c.name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-hgh-muted" title={c.id}>
                    {c.id.length > 12 ? `${c.id.slice(0, 12)}…` : c.id}
                  </td>
                  <td className="px-4 py-2 text-hgh-muted">
                    {c.trialEndsAtIso ? new Date(c.trialEndsAtIso).toLocaleString() : "—"}
                  </td>
                  <td className="px-4 py-2">{c.subscriptionStatus}</td>
                  <td className="px-4 py-2 tabular-nums">{c.employeeCount}</td>
                  <td className="px-4 py-2 text-hgh-muted">{new Date(c.createdAtIso).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <PlatformCompanySubscriptionActions
                      companyId={c.id}
                      companyName={c.name}
                      subscriptionStatus={c.subscriptionStatus}
                      trialEndsAtIso={c.trialEndsAtIso}
                      createdAtIso={c.createdAtIso}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
