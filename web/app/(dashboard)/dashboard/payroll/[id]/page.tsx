"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Banknote, Calculator, Check, CheckCircle, Download, RefreshCw, Send, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DismissibleCallout } from "@/components/ui/dismissible-callout";
import { HintTooltip } from "@/components/ui/hint-tooltip";
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
  isPaid: boolean;
  paidAt: string | null;
  scheduledPayDate: string | null;
  markedPaidBy: string | null;
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

const PAYRUN_ACTIONS_HINT_KEY = "hgh-dismiss-payrun-detail-actions-hint";

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
  const [payDate, setPayDate] = useState("");
  const [showActionsHint, setShowActionsHint] = useState(true);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && localStorage.getItem(PAYRUN_ACTIONS_HINT_KEY) === "1") {
        setShowActionsHint(false);
      }
    } catch {
      /* ignore */
    }
  }, []);

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

  async function patchMarkPaid(
    busyKey: string,
    body: Record<string, unknown>,
    { onOk, errMsg }: { onOk: () => void; errMsg: string },
  ) {
    setBusy(busyKey);
    try {
      const res = await fetch(`/api/payruns/${id}/mark-paid`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        onOk();
        mutate();
      } else {
        toast.error(errMsg);
      }
    } finally {
      setBusy(null);
    }
  }

  if (error) {
    return (
      <div className="rounded-xl border border-hgh-border bg-white p-8 text-center text-sm text-hgh-danger">
        Could not load this pay run. It may have been removed or you may not have access.
        <div className="mt-4">
          <HintTooltip content="Return to the payroll list.">
            <Button variant="secondary" onClick={() => router.push("/dashboard/payroll")}>
              Back to payroll
            </Button>
          </HintTooltip>
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
          <HintTooltip content="Return to the payroll list for this workspace.">
            <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/payroll")}>
              <ArrowLeft size={18} />
              Back
            </Button>
          </HintTooltip>
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
              <HintTooltip content="Build or refresh one line per active employee from their current salary and components.">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => generateLines()}
                >
                  <Calculator size={16} />
                  {busy === "gen" ? "Working…" : "Generate payroll lines"}
                </Button>
              </HintTooltip>
            )}
            {canManage && payrun.status === "DRAFT" && payrun._count.lines > 0 && (
              <HintTooltip content="Send this draft to an approver. Lines must be generated first.">
                <Button
                  size="sm"
                  disabled={busy !== null}
                  onClick={() => postAction("submit")}
                >
                  <Send size={16} />
                  {busy === "submit" ? "…" : "Submit for approval"}
                </Button>
              </HintTooltip>
            )}
            {canApprove && payrun.status === "PENDING" && (
              <>
                <HintTooltip content="Lock this run as approved. Exports and payslips stay available.">
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    disabled={busy !== null}
                    onClick={() => setApproveOpen(true)}
                  >
                    <Check size={16} />
                    Approve
                  </Button>
                </HintTooltip>
                <HintTooltip content="Send the run back with a reason. It can be edited and resubmitted.">
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={busy !== null}
                    onClick={() => setRejectOpen(true)}
                  >
                    <XCircle size={16} />
                    Reject
                  </Button>
                </HintTooltip>
              </>
            )}
            {canApprove && payrun.status === "REJECTED" && (
              <HintTooltip content="Move this run back to draft so lines can be fixed and submitted again.">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busy !== null}
                  onClick={() => postAction("reopen")}
                >
                  <RefreshCw size={16} />
                  Reopen as draft
                </Button>
              </HintTooltip>
            )}
            {canManage && payrun.status === "APPROVED" && payrun.lines.length > 0 && (
              <>
                <HintTooltip content="Download a CSV formatted for bulk salary bank uploads.">
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
                </HintTooltip>
                <HintTooltip content="Download all payslip PDFs for this run in one ZIP file.">
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
                </HintTooltip>
              </>
            )}
          </div>
        </CardHeader>
        {showActionsHint ? (
          <CardContent className="pr-2 text-xs text-hgh-muted">
            <DismissibleCallout
              storageKey={PAYRUN_ACTIONS_HINT_KEY}
              className="items-start space-y-2"
              onDismiss={() => setShowActionsHint(false)}
            >
              <>
                <p>
                  <strong className="text-hgh-slate">Salaries are not picked per pay run.</strong> Each line uses that
                  employee&apos;s <strong className="text-hgh-slate">basic salary</strong> and recurring components from{" "}
                  <HintTooltip content="Edit staff salaries and recurring pay items; payroll lines read from those records.">
                    <Link href="/dashboard/employees" className="font-medium text-hgh-navy underline-offset-2 hover:underline">
                      Employees
                    </Link>
                  </HintTooltip>
                  . Click <strong className="text-hgh-slate">Generate payroll lines</strong> to build or refresh lines for
                  every <strong className="text-hgh-slate">active</strong> staff member. After you change someone&apos;s pay,
                  open this draft again and generate again before submitting.
                </p>
                <p>Submit sends to an approver. Approved runs are locked; use exports below for bank file and payslips.</p>
              </>
            </DismissibleCallout>
          </CardContent>
        ) : null}
      </Card>

      {/* Payment tracking — APPROVED payruns only */}
      {canManage && payrun.status === "APPROVED" && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-4 rounded-xl border p-4",
            payrun.isPaid
              ? "border-hgh-success/20 bg-hgh-success/5"
              : "border-hgh-gold/20 bg-hgh-gold/5",
          )}
        >
          {payrun.isPaid ? (
            <>
              <CheckCircle size={22} className="text-hgh-success" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-hgh-navy">
                  Salaries paid on{" "}
                  {payrun.paidAt
                    ? new Date(payrun.paidAt).toLocaleDateString("en-GH", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
              {canApprove && (
                <HintTooltip content="Remove the paid flag if this run was marked paid by mistake.">
                  <button
                    type="button"
                    className="text-xs font-medium text-hgh-muted underline hover:text-hgh-navy disabled:opacity-50"
                    disabled={busy !== null}
                    onClick={() =>
                      patchMarkPaid(
                        "undo-paid",
                        { action: "undo-paid" },
                        {
                          onOk: () => toast.success("Payment status undone"),
                          errMsg: "Failed to undo",
                        },
                      )
                    }
                  >
                    {busy === "undo-paid" ? "…" : "Undo"}
                  </button>
                </HintTooltip>
              )}
            </>
          ) : (
            <>
              <Banknote size={22} className="text-hgh-gold" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-hgh-navy">
                  Salaries not yet marked as paid
                </p>
                {payrun.scheduledPayDate && (
                  <p className="text-xs text-hgh-muted">
                    Expected:{" "}
                    {new Date(payrun.scheduledPayDate).toLocaleDateString("en-GH", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <HintTooltip content="Record that salaries for this approved run have been paid (internal tracking).">
                  <Button
                    size="sm"
                    disabled={busy !== null}
                    onClick={() =>
                      patchMarkPaid(
                        "mark-paid",
                        { action: "mark-paid" },
                        {
                          onOk: () => toast.success("Payrun marked as paid"),
                          errMsg: "Failed to mark as paid",
                        },
                      )
                    }
                  >
                    {busy === "mark-paid" ? "…" : "Mark as Paid"}
                  </Button>
                </HintTooltip>
                <div className="flex items-center gap-1">
                  <Input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="h-8 w-40 text-xs"
                    disabled={busy !== null}
                  />
                  <HintTooltip content="Save the intended salary payment date (shown on this pay run card).">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy !== null || !payDate}
                      onClick={() =>
                        patchMarkPaid(
                          "set-pay-date",
                          { action: "set-pay-date", scheduledPayDate: payDate },
                          {
                            onOk: () => {
                              toast.info(
                                `Payment date set for ${new Date(payDate).toLocaleDateString()}`,
                              );
                              setPayDate("");
                            },
                            errMsg: "Failed to set date",
                          },
                        )
                      }
                    >
                      {busy === "set-pay-date" ? "…" : "Set Date"}
                    </Button>
                  </HintTooltip>
                </div>
              </div>
            </>
          )}
        </div>
      )}

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
          <HintTooltip content="Close without approving.">
            <Button variant="ghost" onClick={() => setApproveOpen(false)}>
              Cancel
            </Button>
          </HintTooltip>
          <HintTooltip content="Finalize this pay run. It locks for editing; bank and payslip exports stay available.">
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
          </HintTooltip>
        </div>
      </Dialog>

      <Dialog open={rejectOpen} onClose={() => setRejectOpen(false)} title="Reject pay run">
        <div className="space-y-3">
          <label className="block text-sm font-medium text-hgh-slate">Reason (optional)</label>
          <Input value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <HintTooltip content="Close without rejecting.">
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>
              Cancel
            </Button>
          </HintTooltip>
          <HintTooltip content="Send this run back as rejected. The preparer can fix lines and resubmit.">
            <Button
              variant="danger"
              disabled={busy !== null}
              onClick={() => postAction("reject", { rejectionNote: rejectNote })}
            >
              Reject
            </Button>
          </HintTooltip>
        </div>
      </Dialog>
    </div>
  );
}
