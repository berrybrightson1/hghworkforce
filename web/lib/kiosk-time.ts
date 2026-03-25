import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export function parseHHmmToMinutes(s: string | null | undefined): number | null {
  if (s == null || String(s).trim() === "") return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(s).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isInteger(h) || !Number.isInteger(min) || h < 0 || h > 23 || min < 0 || min > 59) {
    return null;
  }
  return h * 60 + min;
}

export function localDateString(now: Date, timezone: string): string {
  return formatInTimeZone(now, timezone, "yyyy-MM-dd");
}

export function localMinutesFromMidnight(now: Date, timezone: string): number {
  const hm = formatInTimeZone(now, timezone, "HH:mm");
  return parseHHmmToMinutes(hm)!;
}

export function startOfLocalDayUtc(localDate: string, timezone: string): Date {
  return fromZonedTime(`${localDate}T00:00:00.000`, timezone);
}

export function endOfLocalDayUtc(localDate: string, timezone: string): Date {
  return fromZonedTime(`${localDate}T23:59:59.999`, timezone);
}

export type KioskClockInGate =
  | { ok: true }
  | {
      ok: false;
      message: string;
    };

/**
 * Rules: optional office open/close (local). Cutoff blocks new clock-in from cutoff onward until next local day.
 * Overnight clock-out is handled in the API (open CLOCKED_IN bypasses "before open" for clock-out only).
 */
export function evaluateKioskClockInGate(params: {
  now: Date;
  timezone: string;
  opensAt: string | null;
  closesAt: string | null;
  cutoffTime: string | null;
}): KioskClockInGate {
  const { now, timezone, opensAt, closesAt, cutoffTime } = params;
  const mins = localMinutesFromMidnight(now, timezone);
  const openM = parseHHmmToMinutes(opensAt);
  const closeM = parseHHmmToMinutes(closesAt);
  const cutM = parseHHmmToMinutes(cutoffTime);

  if (openM != null && mins < openM) {
    return { ok: false, message: "Check-in opens when office hours start." };
  }
  if (closeM != null && mins > closeM) {
    return {
      ok: false,
      message: "Office is closed — check-in is not available (check-out only).",
    };
  }
  if (cutM != null && mins >= cutM) {
    return {
      ok: false,
      message: "Cut-off time has passed — new check-ins are closed for today.",
    };
  }
  return { ok: true };
}
