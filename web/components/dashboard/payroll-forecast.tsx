"use client";

import { useState } from "react";
import Link from "next/link";
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
      <div className="rounded-2xl border border-hgh-gold/20 bg-hgh-navy p-6">
        <p className="text-sm text-hgh-muted">Payroll Forecast &mdash; {data.month}</p>
        <p className="mt-2 text-4xl font-bold text-white">GHS {formatGHS(data.totalMonthlyLiability)}</p>
        <p className="mt-1 text-sm text-hgh-muted">
          Estimated total liability for {data.activeEmployeeCount} active employee{data.activeEmployeeCount !== 1 ? "s" : ""}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
          <span className={countdownColor}>
            <span className="material-symbols-outlined mr-1 align-middle" style={{ fontSize: 18 }}>
              hourglass_empty
            </span>
            Next payrun in {data.daysUntilNextPayrun} day{data.daysUntilNextPayrun !== 1 ? "s" : ""}
          </span>

          {data.lastPayrun && (
            <span className="flex items-center gap-1">
              {data.lastPayrun.isPaid ? (
                <>
                  <span className="material-symbols-outlined text-hgh-success" style={{ fontSize: 18 }}>
                    check_circle
                  </span>
                  <span className="text-hgh-success">
                    {new Date(data.lastPayrun.periodEnd).toLocaleDateString("en-GH", { month: "long" })} salaries paid
                  </span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-hgh-gold" style={{ fontSize: 18 }}>
                    warning
                  </span>
                  <Link
                    href={`/dashboard/payroll/${data.lastPayrun.id}`}
                    className="text-hgh-gold underline underline-offset-2 hover:text-hgh-gold-light"
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
          className="mt-3 text-xs font-medium text-hgh-gold underline underline-offset-2 hover:text-hgh-gold-light"
        >
          {showBreakdown ? "Hide breakdown" : "View breakdown"}
        </button>
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
