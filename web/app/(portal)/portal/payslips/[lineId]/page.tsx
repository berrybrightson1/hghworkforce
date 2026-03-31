"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useApi } from "@/lib/swr";

type PayslipPreview = {
  payslipId: string | null;
  generatedAt: string | null;
  company: { name: string; address?: string; logoUrl?: string };
  employee: { name: string; code: string; department: string; jobTitle: string };
  period: { start: string; end: string };
  earnings: { name: string; amount: number }[];
  deductions: { name: string; amount: number }[];
  summary: { grossPay: number; totalDeductions: number; netPay: number };
};

export default function PortalPayslipDetailPage() {
  const params = useParams();
  const lineId = typeof params.lineId === "string" ? params.lineId : null;
  const url = lineId ? `/api/me/payslips/${encodeURIComponent(lineId)}` : null;
  const { data, error, isLoading } = useApi<PayslipPreview>(url);

  if (!lineId) {
    return <p className="text-sm text-hgh-muted">Invalid payslip.</p>;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-hgh-offwhite" />
        <div className="h-64 animate-pulse rounded-xl border border-hgh-border bg-white" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-hgh-muted">
          <FileText className="mx-auto mb-2 h-10 w-10 opacity-40" />
          Could not load this payslip. It may not exist or you may not have access.
          <div className="mt-4">
            <Link href="/portal/payslips" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
              Back to payslips
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const fmt = (n: number) =>
    n.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/portal/payslips"
          className={cn(
            buttonVariants({ variant: "ghost", size: "sm" }),
            "text-hgh-navy -ml-2",
          )}
        >
          <ArrowLeft size={16} className="mr-1" />
          Payslips
        </Link>
      </div>

      <div>
        <h1 className="text-xl font-semibold text-hgh-navy">Payslip details</h1>
        <p className="mt-1 text-sm text-hgh-muted">
          {data.company.name} · {data.employee.name} ({data.employee.code})
        </p>
        {data.generatedAt ? (
          <p className="mt-1 text-xs text-hgh-muted">
            Generated {new Date(data.generatedAt).toLocaleString()}
          </p>
        ) : null}
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-lg">Period</CardTitle>
            <p className="mt-1 text-sm text-hgh-muted">
              {new Date(data.period.start).toLocaleDateString()} –{" "}
              {new Date(data.period.end).toLocaleDateString()}
            </p>
          </div>
          <a
            href={`/api/payslips/${lineId}/download`}
            download
            className={cn(buttonVariants({ size: "sm" }), "shrink-0 no-underline")}
          >
            <Download size={16} className="mr-1" />
            Download PDF
          </a>
        </CardHeader>
        <CardContent className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-hgh-muted">Earnings</p>
            <ul className="mt-2 space-y-1 text-sm">
              {data.earnings.map((row) => (
                <li key={row.name} className="flex justify-between gap-3">
                  <span className="text-hgh-slate">{row.name}</span>
                  <span className="tabular-nums text-hgh-navy">GHS {fmt(row.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-hgh-muted">Deductions</p>
            <ul className="mt-2 space-y-1 text-sm">
              {data.deductions.map((row) => (
                <li key={row.name} className="flex justify-between gap-3">
                  <span className="text-hgh-slate">{row.name}</span>
                  <span className="tabular-nums text-hgh-navy">GHS {fmt(row.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap justify-between gap-2 text-sm">
            <span className="text-hgh-muted">Gross pay</span>
            <span className="tabular-nums font-medium text-hgh-navy">GHS {fmt(data.summary.grossPay)}</span>
          </div>
          <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
            <span className="text-hgh-muted">Total deductions</span>
            <span className="tabular-nums font-medium text-hgh-navy">GHS {fmt(data.summary.totalDeductions)}</span>
          </div>
          <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-hgh-border pt-3 text-base">
            <span className="font-semibold text-hgh-navy">Net pay</span>
            <span className="tabular-nums font-semibold text-hgh-gold">GHS {fmt(data.summary.netPay)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
