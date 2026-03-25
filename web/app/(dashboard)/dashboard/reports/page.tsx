"use client";

import { useState } from "react";
import { TrendingUp, Download, FileSpreadsheet, FileText, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { useApi } from "@/lib/swr";

interface ReportDef {
  title: string;
  description: string;
  icon: LucideIcon;
  key: string;
}

const reports: ReportDef[] = [
  {
    key: "payroll-summary",
    title: "Payroll Summary",
    description: "Monthly breakdown of gross pay, deductions, and net pay.",
    icon: FileSpreadsheet,
  },
  {
    key: "ssnit",
    title: "SSNIT Contributions",
    description: "Employee and employer SSNIT contributions for filing.",
    icon: FileText,
  },
  {
    key: "paye",
    title: "PAYE Tax Report",
    description: "Monthly PAYE deductions per employee for GRA.",
    icon: FileText,
  },
  {
    key: "bank-schedule",
    title: "Bank Schedule",
    description: "Net pay per employee for bank transfer upload.",
    icon: FileSpreadsheet,
  },
  {
    key: "leave-balances",
    title: "Leave Balances",
    description: "Current leave entitlements and usage across employees.",
    icon: FileText,
  },
  {
    key: "loan-outstanding",
    title: "Loan Outstanding",
    description: "Active loan balances and repayment schedules.",
    icon: FileText,
  },
];

const LINE_REPORT_KEYS = new Set([
  "payroll-summary",
  "ssnit",
  "paye",
  "bank-schedule",
]);

export default function ReportsPage() {
  const { selected } = useCompany();
  const { toast } = useToast();
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const { data: payruns } = useApi<{ id: string; _count?: { lines: number } }[]>(
    selected ? `/api/payruns?companyId=${selected.id}` : null,
  );
  const hasPayrollLines = payruns?.some((p) => (p._count?.lines ?? 0) > 0) ?? false;

  async function handleExport(reportKey: string, format: "excel" | "pdf") {
    if (!selected) {
      toast.warning("Select a company first.");
      return;
    }
    if (LINE_REPORT_KEYS.has(reportKey) && !hasPayrollLines) {
      toast.warning(
        "No pay run lines yet. Open Payroll → View a draft run → Calculate / refresh lines, then export.",
      );
      return;
    }

    const u = new URL(`/api/reports/${reportKey}`, window.location.origin);
    u.searchParams.set("companyId", selected.id);
    u.searchParams.set("format", format === "pdf" ? "pdf" : "csv");

    setBusyKey(`${reportKey}-${format}`);
    try {
      const res = await fetch(u.toString());
      if (format === "pdf") {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(data.error || "Could not prepare export.");
          return;
        }
        toast.info(data.message || "PDF layout is not available; use Excel (CSV) export.");
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Export failed.");
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition");
      const m = cd?.match(/filename="([^"]+)"/);
      const name = m?.[1] ?? `${reportKey}.csv`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = name;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Download started.");
    } catch {
      toast.error("Download failed.");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">Reports</h2>
          <p className="text-sm text-hgh-muted">
            {selected
              ? `Generate reports for ${selected.name}. Excel downloads CSV (opens in Excel).`
              : "Select a company to generate reports."}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => {
          const Icon = r.icon;
          const needsLines = LINE_REPORT_KEYS.has(r.key);
          const disabled = !selected || (needsLines && !hasPayrollLines);
          return (
            <Card key={r.key} className="transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-hgh-gold/10">
                  <Icon size={20} className="text-hgh-gold" />
                </div>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-sm">{r.title}</CardTitle>
                  <p className="mt-1 text-xs text-hgh-muted">{r.description}</p>
                </div>
              </CardHeader>
              <CardContent className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled || busyKey !== null}
                  onClick={() => void handleExport(r.key, "excel")}
                >
                  <Download size={16} />
                  {busyKey === `${r.key}-excel` ? "…" : "Excel"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled || busyKey !== null}
                  onClick={() => void handleExport(r.key, "pdf")}
                >
                  <Download size={16} />
                  {busyKey === `${r.key}-pdf` ? "…" : "PDF"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selected && !hasPayrollLines && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-hgh-muted">
            <TrendingUp size={32} className="mx-auto mb-3 text-hgh-border" />
            <p>
              Payroll-based reports (summary, SSNIT, PAYE, bank schedule) need at least one pay run with{" "}
              <strong>calculated lines</strong>. Leave and loan reports work as soon as you have data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
