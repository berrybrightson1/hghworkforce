"use client";

import Link from "next/link";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";


type Cycle = {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: "DRAFT" | "ACTIVE" | "CLOSED";
  _count: { reviews: number };
};

const statusVariant: Record<string, "default" | "success" | "warning"> = {
  DRAFT: "default",
  ACTIVE: "warning",
  CLOSED: "success",
};

export default function PerformancePage() {
  const { selected } = useCompany();
  const { data: cycles } = useApi<Cycle[]>(
    selected ? `/api/performance/cycles?companyId=${selected.id}` : null,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">Performance Management</h2>
          <p className="text-sm text-hgh-muted">Manage review cycles, goals, and ratings.</p>
        </div>
        <Link href="/dashboard/performance/cycles/new">
          <Button>New Cycle</Button>
        </Link>
      </div>

      {!cycles ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-hgh-border/30" />
          ))}
        </div>
      ) : cycles.length === 0 ? (
        <p className="py-10 text-center text-sm text-hgh-muted">
          No performance cycles yet. Create one to get started.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-hgh-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-hgh-border bg-hgh-offwhite/50 text-left text-xs font-medium uppercase tracking-wider text-hgh-muted">
                  <th className="px-4 py-3">Cycle</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Reviews</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hgh-border">
                {cycles.map((cycle) => (
                  <tr key={cycle.id} className="hover:bg-hgh-offwhite/30">
                    <td className="px-4 py-3 font-medium text-hgh-navy">{cycle.name}</td>
                    <td className="px-4 py-3 text-hgh-slate">
                      {new Date(cycle.periodStart).toLocaleDateString("en-GH")} &ndash;{" "}
                      {new Date(cycle.periodEnd).toLocaleDateString("en-GH")}
                    </td>
                    <td className="px-4 py-3 text-hgh-slate">{cycle._count.reviews}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant[cycle.status] ?? "default"}>
                        {cycle.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/performance/cycles/${cycle.id}`}
                        className="text-xs font-medium text-hgh-gold hover:underline"
                      >
                        View
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
