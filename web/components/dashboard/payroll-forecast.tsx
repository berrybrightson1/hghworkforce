"use client";

import { useState } from "react";
import Link from "next/link";
import { Hourglass, CheckCircle, AlertTriangle } from "lucide-react";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";

type ForecastData = {
  totalMonthlyLiability: number;
  activeEmployeeCount: number;
  daysUntilNextPayrun: number;
  lastPayrun: {
    id: string;
    periodEnd: string;
    isPaid: boolean;
    paidAt: string | null;
  } | null;
  breakdown: { name: string; basic: number; allowances: number; gross: number }[];
  month: string;
};

function formatGHS(amount: number): string {
  return amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PayrollForecast() {
  const { selected } = useCompany();
  const { data } = useApi<ForecastData>(
    selected ? `/api/dashboard/forecast?companyId=${selected.id}` : null,
  );
  const [showBreakdown, setShowBreakdown] = useState(false);

  if (!data) return null;

  const countdownColor =
    data.daysUntilNextPayrun <= 7
      ? "text-hgh-danger"
      : data.daysUntilNextPayrun <= 14
        ? "text-hgh-gold"
        : "text-hgh-muted";

  return (
    <>
      <div className="rounded-2xl border border-hgh-gold/30 bg-hgh-navy p-5 shadow-md shadow-hgh-navy/20 lg:p-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-center lg:gap-0">
          <div className="min-w-0 lg:border-r lg:border-white/10 lg:pr-6">
            <p className="text-[11px] font-medium uppercase tracking-wide text-hgh-gold/90">
              Payroll Forecast &mdash; {data.month}
            </p>
            <p className="mt-1 w-full max-w-none break-words text-3xl font-bold tabular-nums tracking-tight text-white sm:text-4xl">
              GHS {formatGHS(data.totalMonthlyLiability)}
            </p>
            <p className="mt-1.5 text-xs text-white/55">
              Estimated total liability for {data.activeEmployeeCount} active employee
              {data.activeEmployeeCount !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex min-w-0 flex-col justify-center gap-3 lg:pl-6">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className={`flex items-center gap-1.5 ${countdownColor}`}>
                <Hourglass size={18} className="shrink-0" />
                Next payrun in {data.daysUntilNextPayrun} day{data.daysUntilNextPayrun !== 1 ? "s" : ""}
              </span>

              {data.lastPayrun && (
                <span className="flex min-w-0 items-center gap-1.5">
                  {data.lastPayrun.isPaid ? (
                    <>
                      <CheckCircle size={18} className="shrink-0 text-hgh-success" />
                      <span className="text-hgh-success">
                        {new Date(data.lastPayrun.periodEnd).toLocaleDateString("en-GH", { month: "long" })} salaries paid
                      </span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={18} className="shrink-0 text-amber-300" />
                      <Link
                        href={`/dashboard/payroll/${data.lastPayrun.id}`}
                        className="min-w-0 text-amber-200 underline underline-offset-2 hover:text-amber-100"
                      >
                        {new Date(data.lastPayrun.periodEnd).toLocaleDateString("en-GH", { month: "long" })} salaries not marked as paid
                      </Link>
                    </>
                  )}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="w-fit text-left text-xs font-medium text-hgh-gold/90 underline underline-offset-2 hover:text-hgh-gold"
            >
              {showBreakdown ? "Hide breakdown" : "View breakdown"}
            </button>
          </div>
        </div>
      </div>

      {showBreakdown && (
        <div className="overflow-hidden rounded-xl border border-hgh-border bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b border-hgh-border bg-hgh-offwhite/50 text-left text-xs font-medium uppercase tracking-wider text-hgh-muted">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3 text-right">Basic</th>
                  <th className="px-4 py-3 text-right">Allowances</th>
                  <th className="px-4 py-3 text-right">Gross</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hgh-border">
                {data.breakdown.map((row) => (
                  <tr key={row.name} className="hover:bg-hgh-offwhite/30">
                    <td className="px-4 py-3 font-medium text-hgh-navy">{row.name}</td>
                    <td className="px-4 py-3 text-right text-hgh-slate">GHS {formatGHS(row.basic)}</td>
                    <td className="px-4 py-3 text-right text-hgh-slate">GHS {formatGHS(row.allowances)}</td>
                    <td className="px-4 py-3 text-right font-medium text-hgh-navy">GHS {formatGHS(row.gross)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
