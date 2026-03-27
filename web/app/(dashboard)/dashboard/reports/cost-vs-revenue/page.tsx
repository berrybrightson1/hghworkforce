"use client";

import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";
import { useToast } from "@/components/toast/useToast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RevenueEntry = {
  id: string;
  month: number;
  year: number;
  revenueAmount: string;
};

type TrendData = { month: string; gross: number; net: number };

function monthLabel(m: number, y: number): string {
  return new Date(y, m - 1).toLocaleDateString("en-GH", { month: "short", year: "numeric" });
}

function formatGHS(n: number): string {
  return n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CostVsRevenuePage() {
  const { selected } = useCompany();
  const { toast } = useToast();
  const { data: revenue, mutate: mutateRevenue } = useApi<RevenueEntry[]>(
    selected ? `/api/revenue-entries?companyId=${selected.id}` : null,
  );
  const { data: trends } = useApi<TrendData[]>(
    selected ? `/api/reports/payroll-trends?companyId=${selected.id}` : null,
  );

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [revenueInput, setRevenueInput] = useState("");
  const [saving, setSaving] = useState(false);

  const existingEntry = revenue?.find(
    (r) => r.month === selectedMonth && r.year === selectedYear,
  );

  const handleSaveRevenue = async () => {
    if (!selected || !revenueInput) return;
    setSaving(true);
    const res = await fetch("/api/revenue-entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyId: selected.id,
        month: selectedMonth,
        year: selectedYear,
        revenueAmount: parseFloat(revenueInput),
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(`Revenue saved for ${monthLabel(selectedMonth, selectedYear)}`);
      mutateRevenue();
      setRevenueInput("");
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to save revenue");
    }
  };

  // Build chart data for last 6 months
  const chartData: {
    name: string;
    salaryCost: number;
    revenue: number;
    month: number;
    year: number;
  }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const label = monthLabel(m, y);
    const rev = revenue?.find((r) => r.month === m && r.year === y);
    const trend = trends?.find((t) => t.month.startsWith(new Date(y, m - 1).toLocaleDateString("en-GH", { month: "short" })));
    chartData.push({
      name: label,
      salaryCost: trend?.gross ?? 0,
      revenue: rev ? Number(rev.revenueAmount) : 0,
      month: m,
      year: y,
    });
  }

  const handleExportCSV = () => {
    const headers = "Month,Revenue,Salary Cost,% of Revenue,Status\n";
    const rows = chartData
      .map((row) => {
        const pct = row.revenue > 0 ? ((row.salaryCost / row.revenue) * 100).toFixed(1) : "N/A";
        const status =
          row.revenue === 0
            ? "No revenue"
            : Number(pct) < 30
              ? "Healthy"
              : Number(pct) <= 50
                ? "Moderate"
                : "High";
        return `${row.name},${row.revenue},${row.salaryCost},${pct}%,${status}`;
      })
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cost-vs-revenue-${now.toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-hgh-navy">Staff Cost vs Revenue</h2>
        <p className="text-sm text-hgh-muted">
          Track how your salary costs compare to company revenue over time.
        </p>
      </div>

      {/* Revenue input */}
      <Card>
        <CardHeader>
          <CardTitle>Enter Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-slate">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(Number(e.target.value));
                  const entry = revenue?.find(
                    (r) => r.month === Number(e.target.value) && r.year === selectedYear,
                  );
                  setRevenueInput(entry ? String(Number(entry.revenueAmount)) : "");
                }}
                className="h-10 rounded-lg border border-hgh-border bg-white px-3 text-sm text-hgh-navy"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2000, i).toLocaleDateString("en-GH", { month: "long" })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-hgh-slate">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-10 rounded-lg border border-hgh-border bg-white px-3 text-sm text-hgh-navy"
              >
                {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-medium text-hgh-slate">
                Revenue for {monthLabel(selectedMonth, selectedYear)} (GHS)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={revenueInput || (existingEntry ? String(Number(existingEntry.revenueAmount)) : "")}
                onChange={(e) => setRevenueInput(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Button onClick={handleSaveRevenue} disabled={saving || !revenueInput}>
              {saving ? "Saving..." : "Save Revenue"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardContent className="pt-6">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value, name) => [
                    `GHS ${formatGHS(Number(value ?? 0))}`,
                    name === "salaryCost" ? "Salary Cost" : "Revenue",
                  ]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="salaryCost"
                  name="Salary Cost"
                  stroke="#C9A84C"
                  fill="#C9A84C"
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#0A1628"
                  fill="#0A1628"
                  fillOpacity={0.1}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Ratio summary */}
          {chartData.length > 0 && (() => {
            const current = chartData[chartData.length - 1];
            if (current.revenue > 0) {
              const pct = (current.salaryCost / current.revenue) * 100;
              const color =
                pct < 30
                  ? "text-hgh-success"
                  : pct <= 50
                    ? "text-hgh-gold"
                    : "text-hgh-danger";
              const label =
                pct < 30 ? "Healthy" : pct <= 50 ? "Moderate" : "High -- review staffing costs";
              return (
                <p className={`mt-4 text-sm font-medium ${color}`}>
                  Salary cost is {pct.toFixed(1)}% of revenue this month. {label}
                </p>
              );
            }
            return null;
          })()}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Monthly Breakdown</CardTitle>
          <Button variant="secondary" size="sm" onClick={handleExportCSV}>
            Export to CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-sm">
              <thead>
                <tr className="border-b border-hgh-border text-left text-xs font-medium uppercase tracking-wider text-hgh-muted">
                  <th className="px-4 py-3">Month</th>
                  <th className="px-4 py-3 text-right">Revenue</th>
                  <th className="px-4 py-3 text-right">Salary Cost</th>
                  <th className="px-4 py-3 text-right">% of Revenue</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hgh-border">
                {chartData.map((row) => {
                  const pct = row.revenue > 0 ? (row.salaryCost / row.revenue) * 100 : null;
                  const status =
                    row.revenue === 0
                      ? { text: "Revenue not entered", color: "text-hgh-muted" }
                      : pct !== null && pct < 30
                        ? { text: "Healthy", color: "text-hgh-success" }
                        : pct !== null && pct <= 50
                          ? { text: "Moderate", color: "text-hgh-gold" }
                          : { text: "High", color: "text-hgh-danger" };
                  return (
                    <tr key={row.name} className="hover:bg-hgh-offwhite/30">
                      <td className="px-4 py-3 font-medium text-hgh-navy">{row.name}</td>
                      <td className="px-4 py-3 text-right text-hgh-slate">
                        {row.revenue > 0 ? `GHS ${formatGHS(row.revenue)}` : "--"}
                      </td>
                      <td className="px-4 py-3 text-right text-hgh-slate">
                        {row.salaryCost > 0 ? `GHS ${formatGHS(row.salaryCost)}` : "--"}
                      </td>
                      <td className="px-4 py-3 text-right text-hgh-slate">
                        {pct !== null ? `${pct.toFixed(1)}%` : "--"}
                      </td>
                      <td className={`px-4 py-3 text-sm font-medium ${status.color}`}>
                        {status.text}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
