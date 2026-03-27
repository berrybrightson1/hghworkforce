"use client";

import { useState } from "react";
import Link from "next/link";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type OnboardingRow = {
  id: string;
  employeeId: string;
  startDate: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE";
  employee: { name: string | null; employeeCode: string };
  tasks: { id: string; status: string; isRequired: boolean }[];
};

const statusVariant: Record<string, "default" | "success" | "warning" | "danger"> = {
  PENDING: "default",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  OVERDUE: "danger",
};

export default function OnboardingListPage() {
  const { selected } = useCompany();
  const [filter, setFilter] = useState<string>("");
  const { data } = useApi<OnboardingRow[]>(
    selected
      ? `/api/onboarding-tracker?companyId=${selected.id}${filter ? `&status=${filter}` : ""}`
      : null,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">Employee Onboarding</h2>
          <p className="text-sm text-hgh-muted">Track new hire onboarding progress.</p>
        </div>
        <Link href="/dashboard/onboarding/templates/new">
          <Button>Create Template</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {["", "PENDING", "IN_PROGRESS", "COMPLETED", "OVERDUE"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === s
                ? "bg-hgh-navy text-white"
                : "bg-hgh-border/30 text-hgh-muted hover:bg-hgh-border/50"
            }`}
          >
            {s || "All"}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-hgh-border/30" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <p className="py-10 text-center text-sm text-hgh-muted">
          No onboarding records yet. Create a template and assign it when adding new employees.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-hgh-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-hgh-border bg-hgh-offwhite/50 text-left text-xs font-medium uppercase tracking-wider text-hgh-muted">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Start Date</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hgh-border">
                {data.map((row) => {
                  const total = row.tasks.length;
                  const done = row.tasks.filter(
                    (t) => t.status === "COMPLETED" || t.status === "WAIVED",
                  ).length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

                  return (
                    <tr key={row.id} className="hover:bg-hgh-offwhite/30">
                      <td className="px-4 py-3">
                        <p className="font-medium text-hgh-navy">
                          {row.employee.name ?? row.employee.employeeCode}
                        </p>
                        <p className="text-xs text-hgh-muted">{row.employee.employeeCode}</p>
                      </td>
                      <td className="px-4 py-3 text-hgh-slate">
                        {new Date(row.startDate).toLocaleDateString("en-GH")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-hgh-border">
                            <div
                              className="h-full rounded-full bg-hgh-gold transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-hgh-muted">
                            {done}/{total}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant[row.status] ?? "default"}>
                          {row.status.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/dashboard/onboarding/${row.employeeId}`}
                          className="text-xs font-medium text-hgh-gold hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Templates link */}
      <div className="rounded-xl border border-hgh-border bg-white p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-hgh-navy">Onboarding Templates</p>
            <p className="text-xs text-hgh-muted">Manage reusable onboarding checklists.</p>
          </div>
          <Link href="/dashboard/onboarding/templates/new">
            <Button variant="secondary" size="sm">
              Manage Templates
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
