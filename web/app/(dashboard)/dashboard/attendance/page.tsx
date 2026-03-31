"use client";

import { useState } from "react";
import {
  Search,
  CircleDot,
  CheckCircle2,
  Users,
  Clock,
  TimerOff,
  History,
  CalendarX,
  FileText,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast/useToast";
import { useApi } from "@/lib/swr";
import { useCompany } from "@/components/company-context";
import { DatePickerField } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { employeeDisplayName } from "@/lib/employee-display";
import { formatClockTime12h, formatLateMinutesHuman } from "@/lib/attendance-display";

// ── Types ────────────────────────────────────────────────────────────────────

type CheckInRecord = {
  id: string;
  employeeId: string;
  clockIn: string;
  clockOut: string | null;
  status: "CLOCKED_IN" | "CLOCKED_OUT";
  hoursWorked: string | null;
  overtimeHours: string | null;
  lateMinutes: number | null;
  earlyDepartMinutes: number | null;
  note: string | null;
  employee: {
    id: string;
    employeeCode: string;
    department: string;
    jobTitle: string;
  };
  shiftAssignment: {
    shift: { name: string; startTime: string; endTime: string };
  } | null;
};

type SummaryEmployee = {
  employee: {
    id: string;
    employeeCode: string;
    name?: string | null;
    department: string;
    jobTitle: string;
    user?: { name: string } | null;
  };
  totalHours: number;
  overtimeHours: number;
  daysPresent: number;
  lateCount: number;
  earlyDepartCount: number;
  avgHoursPerDay: number;
};

type SummaryResponse = {
  from: string;
  to: string;
  employees: SummaryEmployee[];
  totals: {
    employees: number;
    totalHours: number;
    overtimeHours: number;
    totalLateCount: number;
    totalEarlyDepartCount: number;
  };
};

type CorrectionRow = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string;
  createdAt: string;
  reviewNote: string | null;
  employee: { employeeCode: string; name?: string | null };
  checkIn: { id: string; clockIn: string; clockOut: string | null };
  requestedBy: { name: string; email: string };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(hours: string | number | null) {
  if (!hours) return "-";
  const h = typeof hours === "string" ? parseFloat(hours) : hours;
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

// ── Component ────────────────────────────────────────────────────────────────

type ViewMode = "daily" | "summary";

export default function AttendancePage() {
  const { selected } = useCompany();
  const { toast } = useToast();
  const { data: me } = useApi<{ role: string }>("/api/me");
  const [view, setView] = useState<ViewMode>("daily");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filter, setFilter] = useState<"all" | "CLOCKED_IN" | "CLOCKED_OUT">(
    "all",
  );
  const [search, setSearch] = useState("");

  // Summary date range (defaults to current month)
  const now = new Date();
  const [summaryFrom, setSummaryFrom] = useState(
    () =>
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
  );
  const [summaryTo, setSummaryTo] = useState(
    () => new Date().toISOString().slice(0, 10),
  );

  // ── Daily view data ──
  const dailyUrl = selected && date
    ? `/api/checkins?companyId=${selected.id}&date=${date}`
    : null;
  const { data: checkins, isLoading } = useApi<CheckInRecord[]>(dailyUrl);

  // ── Summary view data ──
  const summaryUrl =
    selected && view === "summary" && summaryFrom && summaryTo
      ? `/api/checkins/summary?companyId=${selected.id}&from=${summaryFrom}&to=${summaryTo}`
      : null;
  const { data: summary, isLoading: summaryLoading } =
    useApi<SummaryResponse>(summaryUrl);

  const canReviewCorrections =
    me &&
    (me.role === "SUPER_ADMIN" || me.role === "COMPANY_ADMIN" || me.role === "HR");
  const correctionsUrl =
    selected && canReviewCorrections
      ? `/api/attendance-corrections?companyId=${selected.id}`
      : null;
  const { data: corrections, mutate: mutateCorrections } = useApi<CorrectionRow[]>(
    correctionsUrl,
  );
  const [corrBusy, setCorrBusy] = useState<string | null>(null);

  async function patchCorrection(
    id: string,
    status: "APPROVED" | "REJECTED",
    reviewNote?: string,
  ) {
    setCorrBusy(id);
    try {
      const res = await fetch(`/api/attendance-corrections/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, reviewNote: reviewNote?.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(status === "APPROVED" ? "Correction applied." : "Request rejected.");
      mutateCorrections();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setCorrBusy(null);
    }
  }

  // ── Daily filters ──
  const filteredByStatus =
    filter === "all"
      ? checkins
      : checkins?.filter((c) => c.status === filter);
  const filtered = search
    ? filteredByStatus?.filter((c) => {
        const q = search.toLowerCase();
        const label = employeeDisplayName(c.employee).toLowerCase();
        return (
          label.includes(q) ||
          c.employee.employeeCode.toLowerCase().includes(q) ||
          c.employee.department.toLowerCase().includes(q) ||
          c.employee.jobTitle.toLowerCase().includes(q)
        );
      })
    : filteredByStatus;

  // ── Summary search ──
  const filteredSummary = search
    ? summary?.employees.filter((e) => {
        const q = search.toLowerCase();
        const label = employeeDisplayName(e.employee).toLowerCase();
        return (
          label.includes(q) ||
          e.employee.employeeCode.toLowerCase().includes(q) ||
          e.employee.department.toLowerCase().includes(q)
        );
      })
    : summary?.employees;

  // ── Daily stats ──
  const clockedInCount =
    checkins?.filter((c) => c.status === "CLOCKED_IN").length ?? 0;
  const clockedOutCount =
    checkins?.filter((c) => c.status === "CLOCKED_OUT").length ?? 0;
  const lateCount =
    checkins?.filter((c) => c.lateMinutes && c.lateMinutes > 0).length ?? 0;
  const totalHours =
    checkins
      ?.filter((c) => c.hoursWorked)
      .reduce((sum, c) => sum + parseFloat(c.hoursWorked!), 0) ?? 0;
  const totalOT =
    checkins
      ?.filter((c) => c.overtimeHours)
      .reduce((sum, c) => sum + parseFloat(c.overtimeHours!), 0) ?? 0;
  const uniqueEmployees = new Set(checkins?.map((c) => c.employeeId)).size;

  if (!selected) {
    return (
      <div className="flex h-64 items-center justify-center text-hgh-muted">
        <p>Select a company to view attendance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-hgh-navy">Attendance</h2>
          <p className="text-sm text-hgh-muted">
            Kiosk punch log, tardiness, and overtime (staff clock in/out only at Settings → Office kiosk)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-lg border border-hgh-border bg-white p-0.5">
            {(
              [
                { key: "daily", label: "Daily" },
                { key: "summary", label: "Summary" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setView(tab.key)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  view === tab.key
                    ? "bg-hgh-navy text-white"
                    : "text-hgh-muted hover:text-hgh-navy",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          {view === "daily" ? (
            <DatePickerField
              value={date}
              onChange={setDate}
              placeholder="Day"
              className="max-w-[12.5rem]"
            />
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <DatePickerField
                value={summaryFrom}
                onChange={setSummaryFrom}
                placeholder="From"
                className="max-w-[11rem]"
              />
              <span className="text-xs text-hgh-muted">to</span>
              <DatePickerField
                value={summaryTo}
                onChange={setSummaryTo}
                placeholder="To"
                className="max-w-[11rem]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-hgh-muted" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by employee code, department, or job title..."
          className="w-full rounded-lg border border-hgh-border bg-white py-2.5 pl-10 pr-4 text-sm text-hgh-slate placeholder:text-hgh-muted/60 focus:border-hgh-gold focus:outline-none focus:ring-1 focus:ring-hgh-gold"
        />
      </div>

      {/* ── Daily View ── */}
      {view === "daily" && (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
            <div className="rounded-xl border border-hgh-border bg-white p-4">
              <div className="flex items-center gap-2 text-xs text-hgh-muted">
                <CircleDot size={16} className="text-hgh-success" />
                Clocked in
              </div>
              <p className="mt-1 text-xl font-bold text-hgh-navy">
                {clockedInCount}
              </p>
            </div>
            <div className="rounded-xl border border-hgh-border bg-white p-4">
              <div className="flex items-center gap-2 text-xs text-hgh-muted">
                <CheckCircle2 size={16} className="text-hgh-slate" />
                Completed
              </div>
              <p className="mt-1 text-xl font-bold text-hgh-navy">
                {clockedOutCount}
              </p>
            </div>
            <div className="rounded-xl border border-hgh-border bg-white p-4">
              <div className="flex items-center gap-2 text-xs text-hgh-muted">
                <Users size={16} className="text-hgh-gold" />
                Employees
              </div>
              <p className="mt-1 text-xl font-bold text-hgh-navy">
                {uniqueEmployees}
              </p>
            </div>
            <div className="rounded-xl border border-hgh-border bg-white p-4">
              <div className="flex items-center gap-2 text-xs text-hgh-muted">
                <Clock size={16} className="text-hgh-gold" />
                Total hours
              </div>
              <p className="mt-1 text-xl font-bold text-hgh-navy">
                {formatDuration(totalHours.toFixed(2))}
              </p>
            </div>
            <div className="rounded-xl border border-hgh-border bg-white p-4">
              <div className="flex items-center gap-2 text-xs text-hgh-muted">
                <TimerOff size={16} className="text-hgh-danger" />
                Late arrivals
              </div>
              <p className="mt-1 text-xl font-bold text-hgh-navy">
                {lateCount}
              </p>
            </div>
            <div className="rounded-xl border border-hgh-border bg-white p-4">
              <div className="flex items-center gap-2 text-xs text-hgh-muted">
                <History size={16} className="text-hgh-gold" />
                Overtime
              </div>
              <p className="mt-1 text-xl font-bold text-hgh-navy">
                {formatDuration(totalOT.toFixed(2))}
              </p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1 rounded-lg border border-hgh-border bg-white p-1">
            {(
              [
                { key: "all", label: "All" },
                { key: "CLOCKED_IN", label: "Clocked in" },
                { key: "CLOCKED_OUT", label: "Completed" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilter(tab.key)}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  filter === tab.key
                    ? "bg-hgh-navy text-white"
                    : "text-hgh-muted hover:text-hgh-navy",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Check-in table */}
          <div className="overflow-hidden rounded-xl border border-hgh-border bg-white">
            {!date ? (
              <div className="px-5 py-12 text-center text-sm text-hgh-muted">
                Choose a day above, or open the calendar and select{" "}
                <span className="font-medium text-hgh-navy">Today</span>.
              </div>
            ) : isLoading ? (
              <div className="px-5 py-12 text-center text-sm text-hgh-muted">
                Loading check-ins...
              </div>
            ) : !filtered || filtered.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <CalendarX className="mx-auto mb-2 text-hgh-border" size={36} />
                <p className="text-sm text-hgh-muted">
                  No check-in records found.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hgh-border bg-hgh-offwhite/50 text-left">
                      <th className="px-4 py-3 font-medium text-hgh-muted">
                        Employee
                      </th>
                      <th className="px-4 py-3 font-medium text-hgh-muted">
                        Dept
                      </th>
                      <th className="px-4 py-3 font-medium text-hgh-muted">
                        Shift
                      </th>
                      <th className="px-4 py-3 font-medium text-hgh-muted">
                        Clock In
                      </th>
                      <th className="px-4 py-3 font-medium text-hgh-muted">
                        Clock Out
                      </th>
                      <th className="px-4 py-3 font-medium text-hgh-muted">
                        Hours
                      </th>
                      <th className="px-4 py-3 font-medium text-hgh-muted">
                        Late
                      </th>
                      <th className="px-4 py-3 font-medium text-hgh-muted">
                        OT
                      </th>
                      <th className="px-4 py-3 font-medium text-hgh-muted">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hgh-border">
                    {filtered.map((c) => (
                      <tr
                        key={c.id}
                        className="transition-colors hover:bg-hgh-offwhite/50"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-hgh-navy">
                            {employeeDisplayName(c.employee)}
                          </p>
                          <p className="text-xs text-hgh-muted">
                            {c.employee.employeeCode} · {c.employee.jobTitle}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-hgh-slate">
                          {c.employee.department}
                        </td>
                        <td className="px-4 py-3 text-xs text-hgh-slate">
                          {c.shiftAssignment?.shift
                            ? `${c.shiftAssignment.shift.startTime}-${c.shiftAssignment.shift.endTime}`
                            : "-"}
                        </td>
                        <td className="px-4 py-3 font-mono text-hgh-slate">
                          {formatClockTime12h(c.clockIn)}
                        </td>
                        <td className="px-4 py-3 font-mono text-hgh-slate">
                          {c.clockOut ? formatClockTime12h(c.clockOut) : "-"}
                        </td>
                        <td className="px-4 py-3 text-hgh-slate">
                          {formatDuration(c.hoursWorked)}
                        </td>
                        <td className="px-4 py-3">
                          {c.lateMinutes && c.lateMinutes > 0 ? (
                            <span className="rounded bg-hgh-danger/10 px-1.5 py-0.5 text-xs font-medium text-hgh-danger">
                              {formatLateMinutesHuman(c.lateMinutes)}
                            </span>
                          ) : (
                            <span className="text-xs text-hgh-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {c.overtimeHours &&
                          parseFloat(c.overtimeHours) > 0 ? (
                            <span className="rounded bg-hgh-gold/10 px-1.5 py-0.5 text-xs font-medium text-hgh-gold">
                              {c.overtimeHours}h
                            </span>
                          ) : (
                            <span className="text-xs text-hgh-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                              c.status === "CLOCKED_IN"
                                ? "bg-hgh-success/10 text-hgh-success"
                                : "bg-hgh-muted/10 text-hgh-muted",
                            )}
                          >
                            {c.status === "CLOCKED_IN" ? "Active" : "Done"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Summary View ── */}
      {view === "summary" && (
        <>
          {/* Summary stat cards */}
          {summary && (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-xl border border-hgh-border bg-white p-4">
                <div className="text-xs text-hgh-muted">Employees</div>
                <p className="mt-1 text-xl font-bold text-hgh-navy">
                  {summary.totals.employees}
                </p>
              </div>
              <div className="rounded-xl border border-hgh-border bg-white p-4">
                <div className="text-xs text-hgh-muted">Total hours</div>
                <p className="mt-1 text-xl font-bold text-hgh-navy">
                  {formatDuration(summary.totals.totalHours)}
                </p>
              </div>
              <div className="rounded-xl border border-hgh-border bg-white p-4">
                <div className="text-xs text-hgh-muted">Overtime hours</div>
                <p className="mt-1 text-xl font-bold text-hgh-gold">
                  {formatDuration(summary.totals.overtimeHours)}
                </p>
              </div>
              <div className="rounded-xl border border-hgh-border bg-white p-4">
                <div className="text-xs text-hgh-muted">Late arrivals</div>
                <p className="mt-1 text-xl font-bold text-hgh-danger">
                  {summary.totals.totalLateCount}
                </p>
              </div>
              <div className="rounded-xl border border-hgh-border bg-white p-4">
                <div className="text-xs text-hgh-muted">Early departures</div>
                <p className="mt-1 text-xl font-bold text-hgh-danger">
                  {summary.totals.totalEarlyDepartCount}
                </p>
              </div>
            </div>
          )}

          {/* Summary table */}
          <div className="overflow-hidden rounded-xl border border-hgh-border bg-white">
            {!summaryFrom || !summaryTo ? (
              <div className="px-5 py-12 text-center text-sm text-hgh-muted">
                Set both <span className="font-medium text-hgh-navy">From</span> and{" "}
                <span className="font-medium text-hgh-navy">To</span> dates above.
              </div>
            ) : summaryLoading ? (
              <div className="px-5 py-12 text-center text-sm text-hgh-muted">
                Loading summary...
              </div>
            ) : !filteredSummary || filteredSummary.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <FileText className="mx-auto mb-2 text-hgh-border" size={36} />
                <p className="text-sm text-hgh-muted">
                  No attendance data for this period.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-hgh-border bg-hgh-offwhite/50 text-left">
                      <th className="px-4 py-3 font-medium text-hgh-muted">
                        Employee
                      </th>
                      <th className="px-4 py-3 font-medium text-hgh-muted">
                        Dept
                      </th>
                      <th className="px-4 py-3 font-medium text-hgh-muted">
                        Days
                      </th>
                      <th className="px-4 py-3 font-medium text-hgh-muted">
                        Total hours
                      </th>
                      <th className="px-4 py-3 font-medium text-hgh-muted">
                        Avg/day
                      </th>
                      <th className="px-4 py-3 font-medium text-hgh-muted">
                        Overtime
                      </th>
                      <th className="px-4 py-3 font-medium text-hgh-muted">
                        Late
                      </th>
                      <th className="px-4 py-3 font-medium text-hgh-muted">
                        Early dept
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hgh-border">
                    {filteredSummary.map((e) => (
                      <tr
                        key={e.employee.id}
                        className="transition-colors hover:bg-hgh-offwhite/50"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-hgh-navy">
                            {employeeDisplayName(e.employee)}
                          </p>
                          <p className="text-xs text-hgh-muted">
                            {e.employee.employeeCode} · {e.employee.jobTitle}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-hgh-slate">
                          {e.employee.department}
                        </td>
                        <td className="px-4 py-3 text-hgh-slate">
                          {e.daysPresent}
                        </td>
                        <td className="px-4 py-3 font-medium text-hgh-navy">
                          {formatDuration(e.totalHours)}
                        </td>
                        <td className="px-4 py-3 text-hgh-slate">
                          {formatDuration(e.avgHoursPerDay)}
                        </td>
                        <td className="px-4 py-3">
                          {e.overtimeHours > 0 ? (
                            <span className="rounded bg-hgh-gold/10 px-1.5 py-0.5 text-xs font-medium text-hgh-gold">
                              {formatDuration(e.overtimeHours)}
                            </span>
                          ) : (
                            <span className="text-xs text-hgh-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {e.lateCount > 0 ? (
                            <span className="rounded bg-hgh-danger/10 px-1.5 py-0.5 text-xs font-medium text-hgh-danger">
                              {e.lateCount}x
                            </span>
                          ) : (
                            <span className="text-xs text-hgh-muted">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {e.earlyDepartCount > 0 ? (
                            <span className="rounded bg-hgh-danger/10 px-1.5 py-0.5 text-xs font-medium text-hgh-danger">
                              {e.earlyDepartCount}x
                            </span>
                          ) : (
                            <span className="text-xs text-hgh-muted">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {canReviewCorrections && (
        <div className="overflow-hidden rounded-xl border border-hgh-border bg-white">
          <div className="flex items-center gap-2 border-b border-hgh-border px-5 py-4">
            <ClipboardList className="text-hgh-gold" size={20} aria-hidden />
            <h3 className="font-semibold text-hgh-navy">Attendance correction requests</h3>
          </div>
          <div className="overflow-x-auto p-4">
            {!corrections?.length ? (
              <p className="text-sm text-hgh-muted">No requests yet.</p>
            ) : (
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-hgh-border text-left">
                    <th className="px-3 py-2 font-medium text-hgh-muted">Employee</th>
                    <th className="px-3 py-2 font-medium text-hgh-muted">Reason</th>
                    <th className="px-3 py-2 font-medium text-hgh-muted">Check-in</th>
                    <th className="px-3 py-2 font-medium text-hgh-muted">Status</th>
                    <th className="px-3 py-2 font-medium text-hgh-muted">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {corrections.map((r) => (
                    <tr key={r.id} className="border-b border-hgh-border last:border-0">
                      <td className="px-3 py-2">
                        {employeeDisplayName({
                          employeeCode: r.employee.employeeCode,
                          name: r.employee.name,
                          user: null,
                        })}
                      </td>
                      <td className="max-w-[200px] px-3 py-2 text-xs text-hgh-slate">{r.reason}</td>
                      <td className="px-3 py-2 text-xs text-hgh-muted">
                        {new Date(r.checkIn.clockIn).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        · {formatClockTime12h(r.checkIn.clockIn)}
                      </td>
                      <td className="px-3 py-2 text-xs font-medium">{r.status}</td>
                      <td className="px-3 py-2">
                        {r.status === "PENDING" ? (
                          <div className="flex flex-wrap gap-1">
                            <Button
                              size="sm"
                              className="bg-emerald-600 text-white hover:bg-emerald-700"
                              disabled={corrBusy !== null}
                              onClick={() => patchCorrection(r.id, "APPROVED")}
                            >
                              {corrBusy === r.id ? "…" : "Approve"}
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={corrBusy !== null}
                              onClick={() =>
                                patchCorrection(
                                  r.id,
                                  "REJECTED",
                                  prompt("Optional note for employee") ?? undefined,
                                )
                              }
                            >
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-hgh-muted">
                            {r.reviewNote || "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
