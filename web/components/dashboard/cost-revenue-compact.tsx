"use client";

import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";

type RevenueEntry = { month: number; year: number; revenueAmount: string };
type TrendData = { month: string; gross: number };

function monthLabel(m: number, y: number): string {
  return new Date(y, m - 1).toLocaleDateString("en-GH", { month: "short" });
}

export function CostRevenueCompact() {
  const { selected } = useCompany();
  const { data: revenue } = useApi<RevenueEntry[]>(
    selected ? `/api/revenue-entries?companyId=${selected.id}` : null,
  );
  const { data: trends } = useApi<TrendData[]>(
    selected ? `/api/reports/payroll-trends?companyId=${selected.id}` : null,
  );

  if (!revenue || !trends || trends.length === 0) return null;

  // Build last 3 months of combined data
  const now = new Date();
  const chartData: { name: string; salary: number; revenue: number }[] = [];

  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const label = monthLabel(m, y);
    const rev = revenue.find((r) => r.month === m && r.year === y);
    const trend = trends.find((t) => t.month.startsWith(label));
    chartData.push({
      name: label,
      salary: trend?.gross ?? 0,
      revenue: rev ? Number(rev.revenueAmount) : 0,
    });
  }

  return (
    <div className="rounded-2xl border border-hgh-border bg-white p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-hgh-navy">Staff Cost vs Revenue</p>
          <p className="text-xs text-hgh-muted">Last 3 months</p>
        </div>
        <Link
          href="/dashboard/reports/cost-vs-revenue"
          className="text-xs font-medium text-hgh-gold hover:underline"
        >
          Full report
        </Link>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip
              formatter={(value) =>
                `GHS ${Number(value ?? 0).toLocaleString("en-GH", { minimumFractionDigits: 2 })}`
              }
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="salary" name="Salary Cost" fill="#C9A84C" radius={[4, 4, 0, 0]} />
            <Bar dataKey="revenue" name="Revenue" fill="#ffffff" stroke="#0A1628" strokeWidth={1} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
