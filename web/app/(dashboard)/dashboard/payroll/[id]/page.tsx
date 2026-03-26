"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calculator, Check, Download, RefreshCw, Send, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/toast/useToast";
import { useApi } from "@/lib/swr";
import { employeeDisplayName } from "@/lib/employee-display";

interface Line {
  id: string;
  grossPay: string;
  ssnitEmployee: string;
  ssnitEmployer: string;
  taxablePay: string;
  payeTax: string;
  provident: string;
  loanDeductions: string;
  otherDeductions: string;
  totalDeductions: string;
  netPay: string;
  employee: {
    employeeCode: string;
    name?: string | null;
    department: string;
    jobTitle: string;
    user?: { name: string } | null;
  };
}

interface PayrunDetail {
  id: string;
  status: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED";
  periodStart: string;
  periodEnd: string;
  note: string | null;
  rejectionNote: string | null;
  approvalNote: string | null;
  company: { name: string };
  lines: Line[];
  _count: { lines: number };
}

interface Me {
  role: "SUPER_ADMIN" | "COMPANY_ADMIN" | "HR" | "EMPLOYEE";
}

const statusBadge = {
  DRAFT: "default",
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
} as const;

export default function PayrunDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [approveNote, setApproveNote] = useState("");

  const url = id ? `/api/payruns/${id}` : null;
  const { data: payrun, mutate, isLoading, error } = useApi<PayrunDetail>(url);
  const { data: me } = useApi<Me>("/api/me");

  const canManage = me && ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"].includes(me.role);
  const canApprove = me && ["SUPER_ADMIN", "COMPANY_ADMIN"].includes(me.role);

  async function postAction(action: string, body?: Record<string, string>) {
    setBusy(action);
    try {
      const res = await fetch(`/api/payruns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      toast.success(
        action === "submit"
          ? "Submitted for approval."
          : action === "approve"
            ? "Pay run approved."
            : action === "reject"
              ? "Pay run rejected."
              : action === "reopen"
                ? "Moved back to draft."
                : "Updated.",
      );
      mutate();
      setRejectOpen(false);
      setRejectNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function generateLines() {
    setBusy("gen");
    try {
      const res = await fetch(`/api/payruns/${id}/generate-lines`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(
        data.created === 0
          ? "No active employees to pay — lines cleared."
          : `Generated ${data.created} payroll line(s).`,
      );
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  if (error) {
    return (
      <div className="rounded-xl border border-hgh-border bg-white p-8 text-center text-sm text-hgh-danger">
        Could not load this pay run. It may have been removed or you may not have access.
        <div className="mt-4">
          <Button variant="secondary" onClick={() => router.push("/dashboard/payroll")}>
            Back to payroll
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !payrun) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-hgh-border" />
        <div className="h-64 animate-pulse rounded-xl border border-hgh-border bg-white" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/payroll")}>
            <ArrowLeft size={18} />
            Back
          </Button>
          <div>
            <h2 className="text-xl font-semibold text-hgh-navy">Pay run</h2>
            <p className="text-sm text-hgh-muted">
              {payrun.company.name} &middot;{" "}
              {new Date(payrun.periodStart).toLocaleDateString()} &ndash;{" "}
              {new Date(payrun.periodEnd).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Badge variant={statusBadge[payrun.status]}>{payrun.status}</Badge>
      </div>

      {payrun.note && (
        <p className="text-sm text-hgh-slate">
          <span className="font-medium">Note:</span> {payrun.note}
        </p>
      )}
      {payrun.status === "REJECTED" && payrun.rejectionNote && (
        <p className="text-sm text-hgh-danger">
          <span className="font-medium">Rejection reason:</span> {payrun.rejectionNote}
        </p>
      )}
      {payrun.status === "APPROVED" && payrun.approvalNote && (
        <p className="text-sm text-emerald-800">
          <span className="font-medium">Approval note:</span> {payrun.approvalNote}
        </p>
      )}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Actions</CardTitle>
          <div className="flex flex-wrap gap-2">
            {canManage && payrun.status === "DRAFT" && (
              <Button
                variant="secondary"
                size="sm"
                disabled={busy !== null}
                onClick={() => generateLines()}
              >
                <Calculator size={16} />
                {busy === "gen" ? "Working…" : "Calculate / refresh lines"}
              </Button>
            )}
            {canManage && payrun.status === "DRAFT" && payrun._count.lines > 0 && (
              <Button
                size="sm"
                disabled={busy !== null}
                onClick={() => postAction("submit")}
              >
                <Send size={16} />
                {busy === "submit" ? "…" : "Submit for approval"}
              </Button>
            )}
            {canApprove && payrun.status === "PENDING" && (
              <>
                <Button
                  size="sm"
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                  disabled={busy !== null}
                  onClick={() => setApproveOpen(true)}
                >
                  <Check size={16} />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={busy !== null}
                  onClick={() => setRejectOpen(true)}
                >
                  <XCircle size={16} />
                  Reject
                </Button>
              </>
            )}
            {canApprove && payrun.status === "REJECTED" && (
              <Button
                size="sm"
                variant="secondary"
                disabled={busy !== null}
                onClick={() => postAction("reopen")}
              >
                <RefreshCw size={16} />
                Reopen as draft
              </Button>
            )}
            {canManage && payrun.status === "APPROVED" && payrun.lines.length > 0 && (
              <>
                <a
                  href={`/api/payruns/${id}/bank-export`}
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                    "inline-flex no-underline",
                  )}
                >
                  <Download size={16} />
                  Bank CSV
                </a>
                <a
                  href={`/api/payruns/${id}/payslips-zip`}
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                    "inline-flex no-underline",
                  )}
                >
                  <Download size={16} />
                  Payslips (ZIP)
                </a>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="text-xs text-hgh-muted">
          Draft: calculate lines for all <strong>active</strong> employees (basic + allowances, deductions,
          active loans). Submit sends to an approver. Approved runs are locked; use reports to export.
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Lines ({payrun.lines.length})</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-hgh-border text-left">
                <th className="px-4 py-2 font-medium text-hgh-muted">Employee</th>
                <th className="px-4 py-2 font-medium text-hgh-muted">Gross</th>
                <th className="px-4 py-2 font-medium text-hgh-muted">SSNIT EE</th>
                <th className="px-4 py-2 font-medium text-hgh-muted">PAYE</th>
                <th className="px-4 py-2 font-medium text-hgh-muted">Loans</th>
                <th className="px-4 py-2 font-medium text-hgh-muted">Net</th>
              </tr>
            </thead>
            <tbody>
              {payrun.lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-hgh-muted">
                    No lines yet. Use <strong>Calculate / refresh lines</strong> while in draft.
                  </td>
                </tr>
              ) : (
                payrun.lines.map((l) => (
                  <tr key={l.id} className="border-b border-hgh-border last:border-0">
                    <td className="px-4 py-2">
                      <span className="font-medium text-hgh-navy">{employeeDisplayName(l.employee)}</span>
                      <span className="block text-xs text-hgh-muted">
                        {l.employee.employeeCode} &middot; {l.employee.jobTitle}
                      </span>
                    </td>
                    <td className="px-4 py-2 tabular-nums">
                      {Number(l.grossPay).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 tabular-nums">
                      {Number(l.ssnitEmployee).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 tabular-nums">
                      {Number(l.payeTax).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 tabular-nums">
                      {Number(l.loanDeductions).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-2 tabular-nums font-medium text-hgh-navy">
                      {Number(l.netPay).toLocaleString("en-GH", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={approveOpen} onClose={() => setApproveOpen(false)} title="Approve pay run">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-hgh-slate">
            Optional note (audit / approver comment)
          </label>
          <Input value={approveNote} onChange={(e) => setApproveNote(e.target.value)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setApproveOpen(false)}>
            Cancel
          </Button>
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            disabled={busy !== null}
            onClick={async () => {
              await postAction("approve", { approvalNote: approveNote });
              setApproveOpen(false);
              setApproveNote("");
            }}
          >
            Confirm approve
          </Button>
        </div>
      </Dialog>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject pay run">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-hgh-slate">Reason (optional)</label>
          <Input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRejectOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            disabled={busy !== null}
            onClick={() => postAction("reject", { rejectionNote: rejectNote })}
          >
            Reject
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
