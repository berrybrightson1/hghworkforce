"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Inbox, ThumbsDown, ThumbsUp } from "lucide-react";
import { useCompany } from "@/components/company-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HintTooltip } from "@/components/ui/hint-tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/toast/useToast";
import { useApi } from "@/lib/swr";
import { employeeDisplayName } from "@/lib/employee-display";
import { cn } from "@/lib/utils";

type LeaveRow = {
  id: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  employee: { id: string; employeeCode: string; name?: string | null; department: string };
};

type CorrectionRow = {
  id: string;
  reason: string;
  createdAt: string;
  employee: { id: string; employeeCode: string; name?: string | null };
  checkIn: { id: string; clockIn: string; clockOut: string | null };
};

type LoanRow = {
  id: string;
  type: string;
  amount: string;
  monthlyRepayment: string;
  note: string | null;
  createdAt: string;
  employee: { id: string; employeeCode: string; name?: string | null; department: string };
};

type InboxPayload = {
  leaveRequests: LeaveRow[];
  attendanceCorrections: CorrectionRow[];
  loanRequests: LoanRow[];
  scope?: "all" | "team";
};

type Filter = "all" | "leave" | "loans" | "corrections";

type RejectTarget =
  | { kind: "leave"; id: string }
  | { kind: "correction"; id: string }
  | { kind: "loan"; id: string };

export default function InboxPage() {
  const { selected, loading } = useCompany();
  const { toast } = useToast();
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [scope, setScope] = useState<"all" | "team">("all");
  const [loanApprove, setLoanApprove] = useState<LoanRow | null>(null);
  const [loanApproveAmount, setLoanApproveAmount] = useState("");
  const [loanApproveMonthly, setLoanApproveMonthly] = useState("");

  const url = selected?.id
    ? `/api/inbox/pending?companyId=${encodeURIComponent(selected.id)}&scope=${encodeURIComponent(scope)}`
    : null;
  const { data, mutate, isLoading } = useApi<InboxPayload>(url);

  const leave = data?.leaveRequests ?? [];
  const corrections = data?.attendanceCorrections ?? [];
  const loans = data?.loanRequests ?? [];

  const filtered = useMemo(() => {
    if (filter === "leave") return { leave, corrections: [], loans: [] };
    if (filter === "corrections") return { leave: [], corrections, loans: [] };
    if (filter === "loans") return { leave: [], corrections: [], loans };
    return { leave, corrections, loans };
  }, [filter, leave, corrections, loans]);

  async function patchLeave(id: string, status: "APPROVED" | "REJECTED", rejectionNote?: string) {
    setActing(`leave-${id}`);
    try {
      const res = await fetch(`/api/leave/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(status === "REJECTED" && rejectionNote?.trim() ? { rejectionNote: rejectionNote.trim() } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed");
      toast.success(status === "APPROVED" ? "Leave approved." : "Leave rejected.");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(null);
    }
  }

  async function patchCorrection(id: string, status: "APPROVED" | "REJECTED", reviewNote?: string) {
    setActing(`corr-${id}`);
    try {
      const res = await fetch(`/api/attendance-corrections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(reviewNote?.trim() ? { reviewNote: reviewNote.trim() } : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed");
      toast.success(status === "APPROVED" ? "Correction approved." : "Correction rejected.");
      mutate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(null);
    }
  }

  async function patchLoan(
    id: string,
    status: "ACTIVE" | "CANCELLED",
    opts?: { rejectionNote?: string; amount?: number; monthlyRepayment?: number },
  ): Promise<boolean> {
    setActing(`loan-${id}`);
    try {
      const res = await fetch(`/api/loans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: status === "ACTIVE" ? "ACTIVE" : "CANCELLED",
          ...(status === "CANCELLED" && opts?.rejectionNote?.trim()
            ? { rejectionNote: opts.rejectionNote.trim() }
            : {}),
          ...(status === "ACTIVE" && opts?.amount != null ? { amount: opts.amount } : {}),
          ...(status === "ACTIVE" && opts?.monthlyRepayment != null
            ? { monthlyRepayment: opts.monthlyRepayment }
            : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "Failed");
      toast.success(status === "ACTIVE" ? "Loan approved." : "Loan request declined.");
      mutate();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
      return false;
    } finally {
      setActing(null);
    }
  }

  function confirmReject() {
    if (!rejectTarget) return;
    const note = rejectNote.trim();
    if (rejectTarget.kind === "leave") void patchLeave(rejectTarget.id, "REJECTED", note);
    else if (rejectTarget.kind === "correction") void patchCorrection(rejectTarget.id, "REJECTED", note);
    else void patchLoan(rejectTarget.id, "CANCELLED", { rejectionNote: note });
    setRejectTarget(null);
    setRejectNote("");
  }

  if (loading || (selected && isLoading && !data)) {
    return (
      <div className="space-y-4">
        <div className="h-9 w-56 animate-pulse rounded bg-hgh-offwhite" />
        <div className="h-48 animate-pulse rounded-xl border border-hgh-border bg-white" />
      </div>
    );
  }

  if (!selected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
          <p className="text-sm font-normal text-hgh-muted">Select a company to load pending items.</p>
        </CardHeader>
      </Card>
    );
  }

  const tabs: { id: Filter; label: string; count: number; hint: string }[] = [
    {
      id: "all",
      label: "All",
      count: leave.length + corrections.length + loans.length,
      hint: "List every pending leave request, loan application, and attendance correction at once.",
    },
    {
      id: "leave",
      label: "Leave",
      count: leave.length,
      hint: "Show only leave requests awaiting approval or rejection.",
    },
    {
      id: "loans",
      label: "Loans",
      count: loans.length,
      hint: "Filter to loan and advance requests that need a decision.",
    },
    {
      id: "corrections",
      label: "Attendance",
      count: corrections.length,
      hint: "Focus on kiosk attendance correction requests from employees.",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hgh-gold/15 text-hgh-gold">
            <Inbox size={22} aria-hidden />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-hgh-navy">Inbox</h2>
            <p className="mt-1 text-sm text-hgh-muted">
              Pending items for <span className="font-medium">{selected.name}</span>
              {data?.scope === "team" ? " (your direct reports only)." : "."}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-hgh-muted">Scope:</span>
              <HintTooltip content="Include pending items for everyone in this workspace you can administer.">
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={cn(
                    "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                    scope === "all"
                      ? "bg-hgh-navy text-white"
                      : "bg-hgh-offwhite text-hgh-muted hover:text-hgh-navy",
                  )}
                >
                  All company
                </button>
              </HintTooltip>
              <HintTooltip content="Limit the inbox to people who report to you in HR so you can clear your direct team first.">
                <button
                  type="button"
                  onClick={() => setScope("team")}
                  className={cn(
                    "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                    scope === "team"
                      ? "bg-hgh-navy text-white"
                      : "bg-hgh-offwhite text-hgh-muted hover:text-hgh-navy",
                  )}
                >
                  My team
                </button>
              </HintTooltip>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Link href="/dashboard/leave" className="text-hgh-gold underline-offset-2 hover:underline">
                Leave admin
              </Link>
              <span className="text-hgh-border">·</span>
              <Link href="/dashboard/loans" className="text-hgh-gold underline-offset-2 hover:underline">
                Loans admin
              </Link>
              <span className="text-hgh-border">·</span>
              <Link href="/dashboard/attendance" className="text-hgh-gold underline-offset-2 hover:underline">
                Attendance
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-hgh-border pb-2">
        {tabs.map((t) => (
          <HintTooltip key={t.id} content={t.hint} side="bottom" contentClassName="max-w-[17rem]">
            <button
              type="button"
              onClick={() => setFilter(t.id)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                filter === t.id ? "bg-hgh-navy text-white" : "text-hgh-muted hover:bg-hgh-offwhite",
              )}
            >
              {t.label}
              <Badge variant="default" className="ml-2 tabular-nums">
                {t.count}
              </Badge>
            </button>
          </HintTooltip>
        ))}
      </div>

      {loanApprove ? (
        <Card className="border-hgh-gold/30">
          <CardHeader>
            <CardTitle className="text-base">Approve loan — adjust terms if needed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-hgh-muted">
              Principal and monthly repayment apply to the active loan after approval. Employee:{" "}
              {employeeDisplayName(loanApprove.employee)}.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-hgh-slate" htmlFor="inbox-loan-amt">
                  Amount (GHS)
                </label>
                <input
                  id="inbox-loan-amt"
                  type="number"
                  min={0}
                  step={0.01}
                  value={loanApproveAmount}
                  onChange={(e) => setLoanApproveAmount(e.target.value)}
                  className="w-full rounded-lg border border-hgh-border px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-hgh-slate" htmlFor="inbox-loan-mo">
                  Monthly repayment (GHS)
                </label>
                <input
                  id="inbox-loan-mo"
                  type="number"
                  min={0}
                  step={0.01}
                  value={loanApproveMonthly}
                  onChange={(e) => setLoanApproveMonthly(e.target.value)}
                  className="w-full rounded-lg border border-hgh-border px-3 py-2 text-sm tabular-nums"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setLoanApprove(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={acting !== null}
                onClick={() => {
                  const amt = Number(loanApproveAmount);
                  const mo = Number(loanApproveMonthly);
                  if (!Number.isFinite(amt) || amt <= 0 || !Number.isFinite(mo) || mo <= 0) {
                    toast.error("Enter positive amount and monthly repayment.");
                    return;
                  }
                  void (async () => {
                    const ok = await patchLoan(loanApprove.id, "ACTIVE", {
                      amount: amt,
                      monthlyRepayment: mo,
                    });
                    if (ok) setLoanApprove(null);
                  })();
                }}
              >
                Approve loan
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {rejectTarget ? (
        <Card className="border-hgh-gold/30">
          <CardHeader>
            <CardTitle className="text-base">Reject — add a note (optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-hgh-border px-3 py-2 text-sm"
              placeholder="Reason shown to the employee (optional)"
            />
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setRejectTarget(null)}>
                Cancel
              </Button>
              <Button type="button" size="sm" variant="danger" onClick={() => void confirmReject()}>
                Confirm reject
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Leave requests</CardTitle>
          <Badge variant="warning">{filtered.leave.length}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.leave.length === 0 ? (
            <p className="text-sm text-hgh-muted">No pending leave in this filter.</p>
          ) : (
            <ul className="divide-y divide-hgh-border">
              {filtered.leave.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-hgh-navy">
                      {r.type} · {r.days} day(s)
                    </p>
                    <p className="text-xs text-hgh-muted">
                      {new Date(r.startDate).toLocaleDateString()} –{" "}
                      {new Date(r.endDate).toLocaleDateString()}
                    </p>
                    <p className="mt-1 text-sm text-hgh-slate">
                      {employeeDisplayName(r.employee)} ·{" "}
                      <Link
                        href={`/dashboard/employees/${r.employee.id}`}
                        className="text-hgh-gold underline-offset-2 hover:underline"
                      >
                        Employee
                      </Link>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={acting !== null}
                      onClick={() => setRejectTarget({ kind: "leave", id: r.id })}
                    >
                      <ThumbsDown size={14} className="mr-1" />
                      Reject
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={acting !== null}
                      onClick={() => void patchLeave(r.id, "APPROVED")}
                    >
                      <ThumbsUp size={14} className="mr-1" />
                      Approve
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Loan / advance requests</CardTitle>
          <Badge variant="warning">{filtered.loans.length}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.loans.length === 0 ? (
            <p className="text-sm text-hgh-muted">No pending loan requests in this filter.</p>
          ) : (
            <ul className="divide-y divide-hgh-border">
              {filtered.loans.map((loan) => (
                <li
                  key={loan.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-hgh-navy">{loan.type}</p>
                    <p className="text-sm tabular-nums text-hgh-slate">
                      GHS {Number(loan.amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })} · Repay GHS{" "}
                      {Number(loan.monthlyRepayment).toLocaleString("en-GH", { minimumFractionDigits: 2 })}/mo
                    </p>
                    {loan.note ? <p className="mt-1 text-xs text-hgh-muted">{loan.note}</p> : null}
                    <p className="mt-1 text-sm text-hgh-slate">
                      {employeeDisplayName(loan.employee)} ·{" "}
                      <Link
                        href={`/dashboard/employees/${loan.employee.id}`}
                        className="text-hgh-gold underline-offset-2 hover:underline"
                      >
                        Employee
                      </Link>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={acting !== null}
                      onClick={() => setRejectTarget({ kind: "loan", id: loan.id })}
                    >
                      Decline
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={acting !== null || loanApprove !== null}
                      onClick={() => {
                        setLoanApprove(loan);
                        setLoanApproveAmount(String(Number(loan.amount)));
                        setLoanApproveMonthly(String(Number(loan.monthlyRepayment)));
                      }}
                    >
                      Approve…
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Attendance corrections</CardTitle>
          <Badge variant="warning">{filtered.corrections.length}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.corrections.length === 0 ? (
            <p className="text-sm text-hgh-muted">No pending corrections in this filter.</p>
          ) : (
            <ul className="divide-y divide-hgh-border">
              {filtered.corrections.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 md:flex-row md:items-start md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-hgh-slate">{c.reason}</p>
                    <p className="mt-1 text-xs text-hgh-muted">
                      {employeeDisplayName(c.employee)} · Submitted {new Date(c.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-hgh-muted">
                      Current clock-in: {new Date(c.checkIn.clockIn).toLocaleString()}
                      {c.checkIn.clockOut
                        ? ` · Out: ${new Date(c.checkIn.clockOut).toLocaleString()}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={acting !== null}
                      onClick={() => setRejectTarget({ kind: "correction", id: c.id })}
                    >
                      Reject
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={acting !== null}
                      onClick={() => void patchCorrection(c.id, "APPROVED")}
                    >
                      Approve
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
