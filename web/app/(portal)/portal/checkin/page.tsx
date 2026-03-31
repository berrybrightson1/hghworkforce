"use client";

import { useState } from "react";
import { ClipboardList, LogIn, LogOut, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useApi } from "@/lib/swr";
import { useCompany } from "@/components/company-context";
import { useToast } from "@/components/toast/useToast";
import { cn } from "@/lib/utils";
import { formatClockTime12h, formatLateMinutesHuman } from "@/lib/attendance-display";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CORR_SESSION_NONE = "__hgh_corr_session_none__";

type ShiftInfo = {
  shift: { name: string; startTime: string; endTime: string; breakMinutes?: number };
} | null;

type CheckinContext = {
  localToday: string;
  kioskTimezone: string;
};

type CheckInRecord = {
  id: string;
  clockIn: string;
  clockOut: string | null;
  status: "CLOCKED_IN" | "CLOCKED_OUT";
  hoursWorked: string | null;
  lateMinutes: number | null;
  earlyDepartMinutes: number | null;
  overtimeHours: string | null;
  note: string | null;
  shiftAssignment: ShiftInfo;
};

function formatDuration(hours: string | null) {
  if (!hours) return "-";
  const h = parseFloat(hours);
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  if (hrs === 0) return `${mins}m`;
  return `${hrs}h ${mins}m`;
}

export default function PortalAttendancePage() {
  const { selected } = useCompany();
  const { toast } = useToast();
  const [corrCheckInId, setCorrCheckInId] = useState("");
  const [corrReason, setCorrReason] = useState("");
  const [corrProposedIn, setCorrProposedIn] = useState("");
  const [corrProposedOut, setCorrProposedOut] = useState("");
  const [corrBusy, setCorrBusy] = useState(false);

  const { data: checkinCtx } = useApi<CheckinContext>("/api/checkin-context");
  const apiUrl =
    selected && checkinCtx?.localToday
      ? `/api/checkins?companyId=${selected.id}&date=${checkinCtx.localToday}`
      : null;
  const { data: checkins } = useApi<CheckInRecord[]>(apiUrl);

  const openCheckIn = checkins?.find((c) => c.status === "CLOCKED_IN") ?? null;
  const completedToday = checkins?.filter((c) => c.status === "CLOCKED_OUT") ?? [];
  const totalHoursToday = completedToday.reduce(
    (sum, c) => sum + (c.hoursWorked ? parseFloat(c.hoursWorked) : 0),
    0,
  );
  const lateToday = checkins?.filter((c) => c.lateMinutes && c.lateMinutes > 0).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-hgh-gold/15 text-hgh-gold">
            <Timer className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-hgh-navy">Attendance</h1>
            <p className="mt-1 text-sm text-hgh-muted">
              Check-in and check-out happen only at your company&apos;s{" "}
              <strong className="font-medium text-hgh-navy">office kiosk</strong>. This page shows
              today&apos;s record and lets you request time corrections.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-hgh-border border-dashed bg-white p-4 shadow-sm">
        <p className="text-sm text-hgh-slate">
          Ask HR or your admin for the kiosk URL (it includes your company code). Use the kiosk screen
          to verify with your phone, then enter the code shown on your device.
        </p>
        {checkinCtx?.kioskTimezone ? (
          <p className="mt-2 text-xs text-hgh-muted">
            Attendance dates use the company timezone{" "}
            <span className="font-medium text-hgh-navy">
              {checkinCtx.kioskTimezone.replace(/_/g, " ")}
            </span>
            .
          </p>
        ) : null}
      </div>

      {openCheckIn ? (
        <div className="rounded-xl border border-hgh-success/30 bg-hgh-success/10 px-4 py-3 text-sm text-hgh-navy">
          You are currently <strong>clocked in</strong> (since {formatClockTime12h(openCheckIn.clockIn)}
          {openCheckIn.lateMinutes && openCheckIn.lateMinutes > 0
            ? ` — ${formatLateMinutesHuman(openCheckIn.lateMinutes)} late`
            : ""}
          ). Use the <strong>kiosk</strong> to clock out.
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm text-hgh-muted">
              <Timer className="h-[18px] w-[18px]" aria-hidden />
              Hours today
            </div>
            <p className="mt-2 text-2xl font-bold text-hgh-navy">
              {formatDuration(totalHoursToday.toFixed(2))}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm text-hgh-muted">Sessions</div>
            <p className="mt-2 text-2xl font-bold text-hgh-navy">
              {completedToday.length + (openCheckIn ? 1 : 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm text-hgh-muted">Late (today)</div>
            <p className="mt-2 text-2xl font-bold text-hgh-navy">{lateToday}</p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-hgh-border bg-white shadow-sm">
        <div className="border-b border-hgh-border px-5 py-4">
          <h2 className="text-sm font-semibold text-hgh-navy">Today&apos;s activity</h2>
        </div>
        {!checkins || checkins.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-hgh-muted">
            No check-ins recorded today yet. Use the office kiosk when you arrive.
          </div>
        ) : (
          <div className="divide-y divide-hgh-border">
            {checkins.map((c) => (
              <div key={c.id} className="flex items-center gap-4 px-5 py-3.5">
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    c.status === "CLOCKED_IN" ? "bg-hgh-success/10" : "bg-hgh-muted/10",
                  )}
                >
                  {c.status === "CLOCKED_IN" ? (
                    <LogIn className={cn("h-[18px] w-[18px]", "text-hgh-success")} aria-hidden />
                  ) : (
                    <LogOut className={cn("h-[18px] w-[18px]", "text-hgh-slate")} aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-hgh-navy">
                    {formatClockTime12h(c.clockIn)}
                    {c.clockOut && (
                      <span className="text-hgh-muted">
                        {" "}
                        - {formatClockTime12h(c.clockOut)}
                      </span>
                    )}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-hgh-muted">
                    <span>
                      {c.status === "CLOCKED_IN" ? "In progress" : formatDuration(c.hoursWorked)}
                    </span>
                    {c.lateMinutes && c.lateMinutes > 0 && (
                      <span className="rounded bg-hgh-danger/10 px-1.5 py-0.5 text-hgh-danger">
                        Late {formatLateMinutesHuman(c.lateMinutes)}
                      </span>
                    )}
                    {c.overtimeHours && parseFloat(c.overtimeHours) > 0 && (
                      <span className="rounded bg-hgh-gold/10 px-1.5 py-0.5 text-hgh-gold">
                        OT {c.overtimeHours}h
                      </span>
                    )}
                    {c.note ? (
                      <span className="max-w-[14rem] truncate text-hgh-slate" title={c.note}>
                        Note: {c.note}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div>
                  <span
                    className={cn(
                      "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
                      c.status === "CLOCKED_IN"
                        ? "bg-hgh-success/10 text-hgh-success"
                        : "bg-hgh-muted/10 text-hgh-muted",
                    )}
                  >
                    {c.status === "CLOCKED_IN" ? "Active" : "Completed"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {checkins && checkins.length > 0 && (
        <div className="rounded-xl border border-hgh-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-hgh-navy">
            <ClipboardList className="h-5 w-5 text-hgh-gold" aria-hidden />
            <h2 className="text-sm font-semibold">Request a time correction</h2>
          </div>
          <p className="mt-1 text-xs text-hgh-muted">
            HR can approve adjustments to your recorded times. Describe the issue. You may suggest
            corrected clock-in and clock-out times (optional, your local date and time).
          </p>
          <div className="mt-4 space-y-3">
            <Select
              value={corrCheckInId || CORR_SESSION_NONE}
              onValueChange={(v) => setCorrCheckInId(v === CORR_SESSION_NONE ? "" : v)}
            >
              <SelectTrigger aria-label="Session to correct" className="w-full">
                <SelectValue placeholder="Select today's session…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={CORR_SESSION_NONE} className="text-hgh-muted">
                  Select today&apos;s session…
                </SelectItem>
                {checkins.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {formatClockTime12h(c.clockIn)}
                    {c.clockOut ? ` – ${formatClockTime12h(c.clockOut)}` : " (in progress)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-hgh-slate" htmlFor="corr-proposed-in">
                  Suggested clock-in (optional)
                </label>
                <input
                  id="corr-proposed-in"
                  type="datetime-local"
                  className="w-full rounded-lg border border-hgh-border px-3 py-2 text-sm"
                  value={corrProposedIn}
                  onChange={(e) => setCorrProposedIn(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-hgh-slate" htmlFor="corr-proposed-out">
                  Suggested clock-out (optional)
                </label>
                <input
                  id="corr-proposed-out"
                  type="datetime-local"
                  className="w-full rounded-lg border border-hgh-border px-3 py-2 text-sm"
                  value={corrProposedOut}
                  onChange={(e) => setCorrProposedOut(e.target.value)}
                />
              </div>
            </div>
            <textarea
              className="w-full rounded-lg border border-hgh-border px-3 py-2 text-sm"
              rows={3}
              placeholder="What needs to be fixed? (min 3 characters)"
              value={corrReason}
              onChange={(e) => setCorrReason(e.target.value)}
            />
            <button
              type="button"
              disabled={corrBusy || !corrCheckInId || corrReason.trim().length < 3}
              onClick={async () => {
                setCorrBusy(true);
                try {
                  const payload: Record<string, string> = {
                    checkInId: corrCheckInId,
                    reason: corrReason.trim(),
                  };
                  if (corrProposedIn.trim()) {
                    const d = new Date(corrProposedIn);
                    if (!Number.isNaN(d.getTime())) payload.proposedClockIn = d.toISOString();
                  }
                  if (corrProposedOut.trim()) {
                    const d = new Date(corrProposedOut);
                    if (!Number.isNaN(d.getTime())) payload.proposedClockOut = d.toISOString();
                  }
                  const res = await fetch("/api/attendance-corrections", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.error || "Failed");
                  toast.success("Request submitted for review.");
                  setCorrReason("");
                  setCorrCheckInId("");
                  setCorrProposedIn("");
                  setCorrProposedOut("");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Failed");
                } finally {
                  setCorrBusy(false);
                }
              }}
              className="rounded-lg bg-hgh-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-hgh-navy/90 disabled:opacity-50"
            >
              {corrBusy ? "Sending…" : "Submit request"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
