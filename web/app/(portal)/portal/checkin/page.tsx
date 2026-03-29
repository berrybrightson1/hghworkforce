"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Clock,
  LogIn,
  LogOut,
  Repeat,
  TimerOff,
} from "lucide-react";
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
  shift: { name: string; startTime: string; endTime: string };
} | null;

type CheckinContext = {
  employeeId: string;
  companyId: string;
  checkinEnterpriseEnabled: boolean;
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

// ── Live clock hook ──────────────────────────────────────────────────────────

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function PortalCheckInPage() {
  const { selected } = useCompany();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkinCtx, setCheckinCtx] = useState<CheckinContext | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [corrCheckInId, setCorrCheckInId] = useState("");
  const [corrReason, setCorrReason] = useState("");
  const [corrBusy, setCorrBusy] = useState(false);
  const sentTabHidden = useRef(false);

  const now = useLiveClock();
  const today = new Date().toISOString().slice(0, 10);
  const apiUrl = selected
    ? `/api/checkins?companyId=${selected.id}&date=${today}`
    : null;
  const { data: checkins, mutate } = useApi<CheckInRecord[]>(apiUrl);

  const openCheckIn =
    checkins?.find((c) => c.status === "CLOCKED_IN") ?? null;
  const completedToday =
    checkins?.filter((c) => c.status === "CLOCKED_OUT") ?? [];
  const totalHoursToday = completedToday.reduce(
    (sum, c) => sum + (c.hoursWorked ? parseFloat(c.hoursWorked) : 0),
    0,
  );
  const lateToday = checkins?.filter((c) => c.lateMinutes && c.lateMinutes > 0).length ?? 0;

  // Shift info from the most recent check-in or open one
  const currentShift =
    openCheckIn?.shiftAssignment?.shift ??
    (checkins && checkins.length > 0 ? checkins[0]?.shiftAssignment?.shift : null) ??
    null;

  // Load enterprise check-in context + start session when enabled
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/checkin-context");
        if (!res.ok) return;
        const ctx = (await res.json()) as CheckinContext;
        if (cancelled) return;
        setCheckinCtx(ctx);
        if (!ctx.checkinEnterpriseEnabled) {
          setSessionId(null);
          return;
        }
        const sRes = await fetch("/api/checkins/session", { method: "POST" });
        if (!sRes.ok) return;
        const sData = (await sRes.json()) as { sessionId: string | null };
        if (cancelled) return;
        setSessionId(sData.sessionId);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const postSessionEvent = useCallback(
    async (
      type:
        | "TAB_HIDDEN"
        | "TAB_VISIBLE"
        | "SESSION_INTERRUPTED",
    ) => {
      if (!sessionId) return;
      try {
        await fetch(`/api/checkins/session/${sessionId}/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type }),
        });
      } catch {
        /* ignore */
      }
    },
    [sessionId],
  );

  useEffect(() => {
    if (!sessionId) return;
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        void postSessionEvent("TAB_HIDDEN");
        sentTabHidden.current = true;
      } else if (sentTabHidden.current) {
        void postSessionEvent("TAB_VISIBLE");
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [sessionId, postSessionEvent]);

  const handleAction = useCallback(
    async (action: "clock-in" | "clock-out") => {
      const enterprise = checkinCtx?.checkinEnterpriseEnabled;

      if (enterprise && !sessionId) {
        toast.error("Check-in session is not ready. Refresh the page and try again.");
        return;
      }

      setLoading(true);
      try {
        const body: Record<string, unknown> = { action };
        if (enterprise && sessionId) body.sessionId = sessionId;

        const res = await fetch("/api/checkins", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Request failed");
        }
        toast.success(
          action === "clock-in" ? "Clocked in successfully" : "Clocked out successfully",
        );
        // Show overtime/late info
        if (action === "clock-out" && data._meta?.overtimeHours) {
          toast.info(
            `Overtime: ${data._meta.overtimeHours}h logged`,
          );
        }
        mutate();
        if (action === "clock-out" && enterprise) {
          try {
            const sRes = await fetch("/api/checkins/session", { method: "POST" });
            const sData = (await sRes.json()) as { sessionId: string | null };
            setSessionId(sData.sessionId ?? null);
          } catch {
            setSessionId(null);
          }
        }
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Something went wrong",
        );
      } finally {
        setLoading(false);
      }
    },
    [toast, mutate, checkinCtx, sessionId],
  );

  const timeString = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const dateString = now.toLocaleDateString("en-GB", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Current time & status */}
      <div className="rounded-2xl border border-hgh-border bg-white p-6 text-center md:p-8">
        <p className="text-sm text-hgh-muted">{dateString}</p>
        <p className="mt-1 font-mono text-4xl font-bold tracking-tight text-hgh-navy md:text-5xl">
          {timeString}
        </p>

        {/* Shift info */}
        {currentShift && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-hgh-slate">
            <Clock className="h-4 w-4 text-hgh-gold" aria-hidden />
            Shift: {currentShift.startTime} - {currentShift.endTime}
          </div>
        )}

        {checkinCtx?.checkinEnterpriseEnabled && (
          <p className="mt-3 text-center text-xs text-hgh-muted">
            Secure check-in session is active. Visibility changes may be logged for audit.
          </p>
        )}
        {/* Status badge */}
        <div className="mt-6">
          {openCheckIn ? (
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-hgh-success/10 px-4 py-1.5 text-sm font-medium text-hgh-success">
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                Clocked in since {formatClockTime12h(openCheckIn.clockIn)}
              </span>
              {openCheckIn.lateMinutes && openCheckIn.lateMinutes > 0 && (
                <p className="text-xs text-hgh-danger">
                  Late by {formatLateMinutesHuman(openCheckIn.lateMinutes)}
                </p>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-hgh-muted/10 px-4 py-1.5 text-sm font-medium text-hgh-muted">
              <Circle className="h-4 w-4" aria-hidden />
              Not clocked in
            </span>
          )}
        </div>

        {/* Action button */}
        <div className="mt-8">
          {openCheckIn ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => handleAction("clock-out")}
              className="inline-flex items-center gap-2 rounded-xl bg-hgh-danger px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-hgh-danger/20 transition-all hover:bg-hgh-danger/90 disabled:opacity-50"
            >
              <LogOut className="h-6 w-6" aria-hidden />
              {loading ? "Processing..." : "Clock Out"}
            </button>
          ) : (
            <button
              type="button"
              disabled={loading}
              onClick={() => handleAction("clock-in")}
              className="inline-flex items-center gap-2 rounded-xl bg-hgh-success px-10 py-4 text-lg font-semibold text-white shadow-lg shadow-hgh-success/20 transition-all hover:bg-hgh-success/90 disabled:opacity-50"
            >
              <LogIn className="h-6 w-6" aria-hidden />
              {loading ? "Processing..." : "Clock In"}
            </button>
          )}
        </div>
      </div>

      {/* Today's summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-hgh-border bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-hgh-muted">
            <Clock className="h-[18px] w-[18px]" aria-hidden />
            Hours today
          </div>
          <p className="mt-2 text-2xl font-bold text-hgh-navy">
            {formatDuration(totalHoursToday.toFixed(2))}
          </p>
        </div>
        <div className="rounded-xl border border-hgh-border bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-hgh-muted">
            <Repeat className="h-[18px] w-[18px]" aria-hidden />
            Sessions
          </div>
          <p className="mt-2 text-2xl font-bold text-hgh-navy">
            {completedToday.length + (openCheckIn ? 1 : 0)}
          </p>
        </div>
        <div className="rounded-xl border border-hgh-border bg-white p-5">
          <div className="flex items-center gap-2 text-sm text-hgh-muted">
            <TimerOff className="h-[18px] w-[18px] text-hgh-danger" aria-hidden />
            Late
          </div>
          <p className="mt-2 text-2xl font-bold text-hgh-navy">
            {lateToday}
          </p>
        </div>
      </div>

      {/* Today's log */}
      <div className="rounded-xl border border-hgh-border bg-white">
        <div className="border-b border-hgh-border px-5 py-4">
          <h2 className="text-sm font-semibold text-hgh-navy">
            Today&apos;s Activity
          </h2>
        </div>
        {!checkins || checkins.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-hgh-muted">
            No check-ins recorded today. Clock in to get started.
          </div>
        ) : (
          <div className="divide-y divide-hgh-border">
            {checkins.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-4 px-5 py-3.5"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    c.status === "CLOCKED_IN"
                      ? "bg-hgh-success/10"
                      : "bg-hgh-muted/10",
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
                      {c.status === "CLOCKED_IN"
                        ? "In progress"
                        : formatDuration(c.hoursWorked)}
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
        <div className="rounded-xl border border-hgh-border bg-white p-5">
          <h2 className="text-sm font-semibold text-hgh-navy">Request a time correction</h2>
          <p className="mt-1 text-xs text-hgh-muted">
            HR can approve adjustments to your recorded times. Describe the issue; optional proposed
            times can be added later from the dashboard.
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
                  const res = await fetch("/api/attendance-corrections", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      checkInId: corrCheckInId,
                      reason: corrReason.trim(),
                    }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.error || "Failed");
                  toast.success("Request submitted for review.");
                  setCorrReason("");
                  setCorrCheckInId("");
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
