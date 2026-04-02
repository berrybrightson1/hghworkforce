"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Inbox,
  ThumbsDown,
  ThumbsUp,
  CalendarDays,
  Landmark,
  Clock,
  ArrowUpRight,
  ChevronRight,
} from "lucide-react";
import { useCompany } from "@/components/company-context";
import { Button } from "@/components/ui/button";
import { HintTooltip } from "@/components/ui/hint-tooltip";
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

const tabs: { id: Filter; label: string; hint: string }[] = [
  {
    id: "all",
    label: "All",
    hint: "Every pending leave request, loan application, and attendance correction.",
  },
  { id: "leave", label: "Leave", hint: "Leave requests awaiting approval or rejection." },
  { id: "loans", label: "Loans", hint: "Loan and advance requests that need a decision." },
  {
    id: "corrections",
    label: "Attendance",
    hint: "Kiosk attendance correction requests from employees.",
  },
];

function ItemSurface({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-hgh-border/50 bg-white px-4 py-4 shadow-[0_1px_2px_rgba(10,22,40,0.04)] transition-colors",
        "hover:border-hgh-border hover:shadow-[0_4px_14px_rgba(10,22,40,0.06)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function TypeMarker({
  icon: Icon,
  tone,
}: {
  icon: typeof CalendarDays;
  tone: "leave" | "loan" | "corr";
}) {
  const toneClass =
    tone === "leave"
      ? "bg-emerald-500/[0.08] text-emerald-800"
      : tone === "loan"
        ? "bg-hgh-gold/12 text-hgh-navy"
        : "bg-sky-500/[0.1] text-sky-900";
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
        toneClass,
      )}
      aria-hidden
    >
      <Icon className="h-[18px] w-[18px] opacity-90" strokeWidth={1.75} />
    </div>
  );
}

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

  const counts = { leave: leave.length, corrections: corrections.length, loans: loans.length };
  const totalPending = leave.length + corrections.length + loans.length;

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

  function tabCount(id: Filter): number {
    if (id === "all") return totalPending;
    if (id === "leave") return counts.leave;
    if (id === "loans") return counts.loans;
    return counts.corrections;
  }

  if (loading || (selected && isLoading && !data)) {
    return (
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="h-8 w-40 animate-pulse rounded-md bg-hgh-border/40" />
        <div className="h-14 animate-pulse rounded-2xl bg-hgh-border/25" />
        <div className="h-64 animate-pulse rounded-2xl border border-hgh-border/30 bg-white/60" />
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="mx-auto max-w-4xl rounded-2xl border border-hgh-border/60 bg-white px-8 py-12 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-hgh-offwhite text-hgh-muted">
          <Inbox className="h-5 w-5" strokeWidth={1.5} aria-hidden />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-hgh-navy">Inbox</h2>
        <p className="mt-2 text-sm text-hgh-muted">Select a company to load pending approvals.</p>
      </div>
    );
  }

  const scopeLabel = data?.scope === "team" ? "Direct reports only" : "Whole company";
  const showEmpty =
    filtered.leave.length === 0 && filtered.loans.length === 0 && filtered.corrections.length === 0;

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-10">
      <header className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-hgh-muted">
              Approvals
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight text-hgh-navy sm:text-[1.75rem]">
              Inbox
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-hgh-muted">
              <span className="text-hgh-slate">{selected.name}</span>
              <span className="mx-1.5 text-hgh-border">·</span>
              {scopeLabel}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-stretch gap-3 sm:items-end">
            <HintTooltip
              content="Switch between everyone you administer and people who report to you."
              side="left"
              contentClassName="max-w-[16rem]"
            >
              <div
                className="inline-flex rounded-full border border-hgh-border/80 bg-hgh-offwhite/80 p-1 shadow-inner"
                role="group"
                aria-label="Inbox scope"
              >
                <button
                  type="button"
                  onClick={() => setScope("all")}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-medium transition-all",
                    scope === "all"
                      ? "bg-white text-hgh-navy shadow-sm ring-1 ring-hgh-border/50"
                      : "text-hgh-muted hover:text-hgh-navy",
                  )}
                >
                  All company
                </button>
                <button
                  type="button"
                  onClick={() => setScope("team")}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-xs font-medium transition-all",
                    scope === "team"
                      ? "bg-white text-hgh-navy shadow-sm ring-1 ring-hgh-border/50"
                      : "text-hgh-muted hover:text-hgh-navy",
                  )}
                >
                  My team
                </button>
              </div>
            </HintTooltip>

            <nav className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-hgh-muted">
              <Link
                href="/dashboard/leave"
                className="inline-flex items-center gap-0.5 font-medium text-hgh-slate transition hover:text-hgh-gold"
              >
                Leave <ChevronRight className="h-3 w-3 opacity-50" aria-hidden />
              </Link>
              <span className="text-hgh-border/80">·</span>
              <Link
                href="/dashboard/loans"
                className="inline-flex items-center gap-0.5 font-medium text-hgh-slate transition hover:text-hgh-gold"
              >
                Loans <ChevronRight className="h-3 w-3 opacity-50" aria-hidden />
              </Link>
              <span className="text-hgh-border/80">·</span>
              <Link
                href="/dashboard/attendance"
                className="inline-flex items-center gap-0.5 font-medium text-hgh-slate transition hover:text-hgh-gold"
              >
                Attendance <ChevronRight className="h-3 w-3 opacity-50" aria-hidden />
              </Link>
            </nav>
          </div>
        </div>

        <div className="border-b border-hgh-border/70">
          <div className="flex gap-0 overflow-x-auto pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {tabs.map((t) => {
              const c = tabCount(t.id);
              const active = filter === t.id;
              return (
                <HintTooltip key={t.id} content={t.hint} side="bottom" contentClassName="max-w-[17rem]">
                  <button
                    type="button"
                    onClick={() => setFilter(t.id)}
                    className={cn(
                      "relative shrink-0 px-4 py-3 text-sm font-medium transition-colors",
                      active ? "text-hgh-navy" : "text-hgh-muted hover:text-hgh-slate",
                    )}
                  >
                    <span>{t.label}</span>
                    <span
                      className={cn(
                        "ml-2 tabular-nums text-xs",
                        active ? "text-hgh-gold" : "text-hgh-muted/80",
                      )}
                    >
                      {c}
                    </span>
                    {active ? (
                      <span
                        className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-hgh-gold"
                        aria-hidden
                      />
                    ) : null}
                  </button>
                </HintTooltip>
              );
            })}
          </div>
        </div>
      </header>

      {loanApprove ? (
        <section
          className="rounded-2xl border border-hgh-gold/25 bg-gradient-to-b from-white to-hgh-offwhite/40 p-6 shadow-[0_8px_30px_rgba(10,22,40,0.06)] ring-1 ring-hgh-border/40"
          aria-labelledby="loan-approve-title"
        >
          <h2 id="loan-approve-title" className="text-base font-semibold text-hgh-navy">
            Approve loan
          </h2>
          <p className="mt-1 text-sm text-hgh-muted">
            Adjust principal and monthly repayment if needed.{" "}
            <span className="text-hgh-slate">{employeeDisplayName(loanApprove.employee)}</span>
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-hgh-slate" htmlFor="inbox-loan-amt">
                Amount (GHS)
              </label>
              <input
                id="inbox-loan-amt"
                type="number"
                min={0}
                step={0.01}
                value={loanApproveAmount}
                onChange={(e) => setLoanApproveAmount(e.target.value)}
                className="w-full rounded-lg border border-hgh-border/80 bg-white px-3 py-2.5 text-sm tabular-nums shadow-sm outline-none transition focus:border-hgh-gold/50 focus:ring-2 focus:ring-hgh-gold/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-hgh-slate" htmlFor="inbox-loan-mo">
                Monthly repayment (GHS)
              </label>
              <input
                id="inbox-loan-mo"
                type="number"
                min={0}
                step={0.01}
                value={loanApproveMonthly}
                onChange={(e) => setLoanApproveMonthly(e.target.value)}
                className="w-full rounded-lg border border-hgh-border/80 bg-white px-3 py-2.5 text-sm tabular-nums shadow-sm outline-none transition focus:border-hgh-gold/50 focus:ring-2 focus:ring-hgh-gold/20"
              />
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
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
        </section>
      ) : null}

      {rejectTarget ? (
        <section
          className="rounded-2xl border border-hgh-border/70 bg-white p-6 shadow-[0_8px_30px_rgba(10,22,40,0.05)]"
          aria-labelledby="reject-title"
        >
          <h2 id="reject-title" className="text-base font-semibold text-hgh-navy">
            Reject request
          </h2>
          <p className="mt-1 text-sm text-hgh-muted">Optional note for the employee.</p>
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            rows={3}
            className="mt-4 w-full rounded-lg border border-hgh-border/80 bg-hgh-offwhite/30 px-3 py-2.5 text-sm outline-none transition focus:border-hgh-border focus:bg-white focus:ring-2 focus:ring-hgh-navy/10"
            placeholder="Reason (optional)"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button type="button" size="sm" variant="danger" onClick={() => void confirmReject()}>
              Confirm reject
            </Button>
          </div>
        </section>
      ) : null}

      <section
        className="overflow-hidden rounded-2xl border border-hgh-border/60 bg-white shadow-[0_1px_3px_rgba(10,22,40,0.04)]"
        aria-label="Pending items"
      >
        {showEmpty ? (
          <div className="flex flex-col items-center px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-hgh-offwhite text-hgh-muted">
              <Inbox className="h-6 w-6" strokeWidth={1.25} aria-hidden />
            </div>
            <p className="mt-5 text-sm font-medium text-hgh-navy">You&apos;re all caught up</p>
            <p className="mt-1.5 max-w-sm text-sm text-hgh-muted">
              No pending items for this view. New requests will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-hgh-border/50">
            {filtered.leave.length > 0 ? (
              <div className="px-4 py-5 sm:px-6">
                <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-hgh-muted">
                  Leave · {filtered.leave.length}
                </h3>
                <ul className="space-y-3">
                  {filtered.leave.map((r) => (
                    <li key={r.id}>
                      <ItemSurface>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 gap-3">
                            <TypeMarker icon={CalendarDays} tone="leave" />
                            <div className="min-w-0">
                              <p className="font-medium text-hgh-navy">
                                {r.type}{" "}
                                <span className="font-normal text-hgh-muted">
                                  · {r.days} day{r.days === 1 ? "" : "s"}
                                </span>
                              </p>
                              <p className="mt-0.5 text-xs text-hgh-muted">
                                {new Date(r.startDate).toLocaleDateString()} –{" "}
                                {new Date(r.endDate).toLocaleDateString()}
                              </p>
                              <p className="mt-2 text-sm text-hgh-slate">
                                {employeeDisplayName(r.employee)}
                                <Link
                                  href={`/dashboard/employees/${r.employee.id}`}
                                  className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-hgh-gold hover:underline"
                                >
                                  Profile <ArrowUpRight className="h-3 w-3" aria-hidden />
                                </Link>
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2 sm:justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={acting !== null}
                              onClick={() => setRejectTarget({ kind: "leave", id: r.id })}
                              className="border-hgh-border/80"
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
                        </div>
                      </ItemSurface>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {filtered.loans.length > 0 ? (
              <div className="px-4 py-5 sm:px-6">
                <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-hgh-muted">
                  Loans · {filtered.loans.length}
                </h3>
                <ul className="space-y-3">
                  {filtered.loans.map((loan) => (
                    <li key={loan.id}>
                      <ItemSurface>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 gap-3">
                            <TypeMarker icon={Landmark} tone="loan" />
                            <div className="min-w-0">
                              <p className="font-medium text-hgh-navy">{loan.type}</p>
                              <p className="mt-1 text-sm tabular-nums text-hgh-slate">
                                GHS{" "}
                                {Number(loan.amount).toLocaleString("en-GH", {
                                  minimumFractionDigits: 2,
                                })}{" "}
                                <span className="font-normal text-hgh-muted">·</span> GHS{" "}
                                {Number(loan.monthlyRepayment).toLocaleString("en-GH", {
                                  minimumFractionDigits: 2,
                                })}
                                /mo
                              </p>
                              {loan.note ? (
                                <p className="mt-2 text-xs leading-relaxed text-hgh-muted">{loan.note}</p>
                              ) : null}
                              <p className="mt-2 text-sm text-hgh-slate">
                                {employeeDisplayName(loan.employee)}
                                <Link
                                  href={`/dashboard/employees/${loan.employee.id}`}
                                  className="ml-1.5 inline-flex items-center gap-0.5 text-xs font-medium text-hgh-gold hover:underline"
                                >
                                  Profile <ArrowUpRight className="h-3 w-3" aria-hidden />
                                </Link>
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2 sm:justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={acting !== null}
                              onClick={() => setRejectTarget({ kind: "loan", id: loan.id })}
                              className="border-hgh-border/80"
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
                        </div>
                      </ItemSurface>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {filtered.corrections.length > 0 ? (
              <div className="px-4 py-5 sm:px-6">
                <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-hgh-muted">
                  Attendance · {filtered.corrections.length}
                </h3>
                <ul className="space-y-3">
                  {filtered.corrections.map((c) => (
                    <li key={c.id}>
                      <ItemSurface>
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex min-w-0 gap-3">
                            <TypeMarker icon={Clock} tone="corr" />
                            <div className="min-w-0">
                              <p className="text-sm leading-relaxed text-hgh-navy">{c.reason}</p>
                              <p className="mt-2 text-xs text-hgh-muted">
                                {employeeDisplayName(c.employee)} · Submitted{" "}
                                {new Date(c.createdAt).toLocaleString()}
                              </p>
                              <p className="mt-1 text-xs text-hgh-muted/90">
                                Clock-in: {new Date(c.checkIn.clockIn).toLocaleString()}
                                {c.checkIn.clockOut
                                  ? ` · Out: ${new Date(c.checkIn.clockOut).toLocaleString()}`
                                  : ""}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2 sm:pt-0.5 sm:justify-end">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled={acting !== null}
                              onClick={() => setRejectTarget({ kind: "correction", id: c.id })}
                              className="border-hgh-border/80"
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
                        </div>
                      </ItemSurface>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
