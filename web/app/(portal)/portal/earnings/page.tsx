"use client";

import { Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/lib/swr";

type YtdPayload = {
  year: number;
  currency: string;
  payCount: number;
  grossPayYtd: number;
  netPayYtd: number;
  totalDeductionsYtd: number;
  lines: Array<{
    payrunId: string;
    periodStart: string;
    periodEnd: string;
    grossPay: string;
    netPay: string;
    totalDeductions: string;
  }>;
};

function money(n: number) {
  return n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PortalEarningsPage() {
  const year = new Date().getFullYear();
  const { data, isLoading } = useApi<YtdPayload>(`/api/me/payroll-ytd?year=${year}`);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hgh-gold/15 text-hgh-gold">
          <Wallet size={22} aria-hidden />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-hgh-navy">Earnings ({year})</h1>
          <p className="mt-1 text-sm text-hgh-muted">
            Year-to-date totals from approved payrolls (period start in this calendar year).
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-hgh-muted">Gross YTD</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-hgh-navy">
              {isLoading ? "…" : `GHS ${money(data?.grossPayYtd ?? 0)}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-hgh-muted">Deductions YTD</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-hgh-navy">
              {isLoading ? "…" : `GHS ${money(data?.totalDeductionsYtd ?? 0)}`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-hgh-muted">Net pay YTD</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums text-hgh-success">
              {isLoading ? "…" : `GHS ${money(data?.netPayYtd ?? 0)}`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Approved pay periods</CardTitle>
          <p className="text-sm font-normal text-hgh-muted">
            {data != null ? `${data.payCount} run(s) in ${year}.` : null}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-10 animate-pulse rounded bg-hgh-offwhite" />
              <div className="h-10 animate-pulse rounded bg-hgh-offwhite" />
            </div>
          ) : !data?.lines.length ? (
            <p className="text-sm text-hgh-muted">No approved payroll lines for this year yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-hgh-border text-left">
                    <th className="pb-2 font-medium text-hgh-muted">Period</th>
                    <th className="pb-2 font-medium text-hgh-muted text-right">Gross</th>
                    <th className="pb-2 font-medium text-hgh-muted text-right">Deductions</th>
                    <th className="pb-2 font-medium text-hgh-muted text-right">Net</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((row) => (
                    <tr key={`${row.payrunId}-${row.periodStart}`} className="border-b border-hgh-border/80">
                      <td className="py-2 text-hgh-navy">
                        {new Date(row.periodStart).toLocaleDateString("en-GB", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        –{" "}
                        {new Date(row.periodEnd).toLocaleDateString("en-GB", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {Number(row.grossPay).toLocaleString("en-GH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {Number(row.totalDeductions).toLocaleString("en-GH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="py-2 text-right tabular-nums font-medium text-hgh-success">
                        {Number(row.netPay).toLocaleString("en-GH", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
