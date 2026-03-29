"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCompany } from "@/components/company-context";
import { useApi } from "@/lib/swr";
import { formatClockTime12h } from "@/lib/attendance-display";

type EmployeeBoard = {
  id: string;
  name: string;
  department: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "ON_LEAVE" | "WEEKEND";
  clockInTime: string | null;
};

type LiveData = {
  board: EmployeeBoard[];
  summary: { present: number; late: number; absent: number; onLeave: number };
};

const statusConfig: Record<
  string,
  { bg: string; dot: string; label: string }
> = {
  PRESENT: { bg: "border-hgh-success/20", dot: "bg-hgh-success", label: "Present" },
  LATE: { bg: "border-hgh-gold/20", dot: "bg-hgh-gold", label: "Late" },
  ABSENT: { bg: "border-hgh-danger/20", dot: "bg-hgh-danger", label: "Absent" },
  ON_LEAVE: { bg: "border-hgh-muted/20", dot: "bg-hgh-muted/50", label: "On Leave" },
  WEEKEND: { bg: "border-hgh-border opacity-50", dot: "bg-hgh-muted/30", label: "Weekend" },
};

function initials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function AttendanceLivePage() {
  const { selected } = useCompany();
  const router = useRouter();
  const { data, mutate } = useApi<LiveData>(
    selected ? `/api/attendance/live?companyId=${selected.id}` : null,
  );

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      mutate();
    }, 60000);
    return () => clearInterval(interval);
  }, [mutate]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-hgh-navy">Daily Attendance</h2>
          <p className="text-sm text-hgh-muted">
            {new Date().toLocaleDateString("en-GH", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-hgh-success/10 px-3 py-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-hgh-success" />
          <span className="text-xs font-medium text-hgh-success">Live</span>
        </div>
      </div>

      {/* Summary bar */}
      {data && (
        <div className="flex flex-wrap gap-3 text-sm font-medium">
          <span className="text-hgh-success">{data.summary.present} Present</span>
          <span className="text-hgh-muted">·</span>
          <span className="text-hgh-gold">{data.summary.late} Late</span>
          <span className="text-hgh-muted">·</span>
          <span className="text-hgh-danger">{data.summary.absent} Absent</span>
          <span className="text-hgh-muted">·</span>
          <span className="text-hgh-muted">{data.summary.onLeave} On Leave</span>
        </div>
      )}

      {/* Employee grid */}
      {!data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-hgh-border/30" />
          ))}
        </div>
      ) : data.board.length === 0 ? (
        <p className="py-10 text-center text-sm text-hgh-muted">
          No active employees found. Add employees to see attendance.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.board.map((emp) => {
            const cfg = statusConfig[emp.status] ?? statusConfig.ABSENT;
            return (
              <div
                key={emp.id}
                className={`flex items-center gap-3 rounded-xl border bg-white p-4 ${cfg.bg}`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-hgh-navy text-xs font-semibold text-white">
                  {initials(emp.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-hgh-navy">{emp.name}</p>
                  <p className="truncate text-xs text-hgh-muted">{emp.department}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                    <span className="text-xs font-medium text-hgh-slate">{cfg.label}</span>
                  </div>
                  {emp.clockInTime ? (
                    <span className="text-[11px] text-hgh-muted">
                      {formatClockTime12h(emp.clockInTime)}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
