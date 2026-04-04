"use client";

import Link from "next/link";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";


type ExitRow = {
  id: string;
  exitType: string;
  noticeDate: string;
  lastWorkingDay: string;
  status: string;
  employee: {
    id: string;
    name: string | null;
    employeeCode: string;
    department: string;
  };
  _count: { clearanceItems: number };
};

const statusVariant: Record<string, "default" | "success" | "warning"> = {
  INITIATED: "default",
  IN_PROGRESS: "warning",
  CLEARED: "warning",
  COMPLETED: "success",
};

export default function ExitsPage() {
  const { selected } = useCompany();
  const { data: rows } = useApi<ExitRow[]>(
    selected ? `/api/exits?companyId=${selected.id}` : null,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">Exit management</h2>
          <p className="text-sm text-hgh-muted">Offboarding, clearance checklist, and key dates.</p>
        </div>
        <Link href="/dashboard/exits/new">
          <Button>New exit case</Button>
        </Link>
      </div>

      {!rows ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-hgh-border/30" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-hgh-muted">
          No exit cases yet. Start one when an employee gives notice or leaves.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-hgh-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-hgh-border bg-hgh-offwhite/50 text-left text-xs font-medium uppercase tracking-wider text-hgh-muted">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Last day</th>
                  <th className="px-4 py-3">Clearance</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hgh-border">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-hgh-offwhite/30">
                    <td className="px-4 py-3">
                      <div className="font-medium text-hgh-navy">{r.employee.name ?? "—"}</div>
                      <div className="text-xs text-hgh-muted">
                        {r.employee.employeeCode} · {r.employee.department}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-hgh-slate">{r.exitType.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-hgh-slate">
                      {new Date(r.lastWorkingDay).toLocaleDateString("en-GH")}
                    </td>
                    <td className="px-4 py-3 text-hgh-slate">{r._count.clearanceItems} items</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[r.status] ?? "default"}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/exits/${r.id}`}
                        className="text-xs font-medium text-hgh-gold hover:underline"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
