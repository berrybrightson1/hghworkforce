/**
 * Shared display formatting for attendance / check-in UIs.
 */

/** 12-hour time with zero-padded hour, e.g. `02:23 PM` for 14:23 local. */
export function formatClockTime12h(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const h24 = d.getHours();
  const mins = d.getMinutes();
  const period = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${String(h12).padStart(2, "0")}:${String(mins).padStart(2, "0")} ${period}`;
}

/**
 * Human-readable late duration, e.g. `6 hours 23mins`, `45mins`, `1 hour`.
 * Uses the same shape as UX copy: hours word + minutes suffixed with `mins`.
 */
export function formatLateMinutesHuman(totalMinutes: number): string {
  if (totalMinutes <= 0) return "-";
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return m === 1 ? "1 min" : `${m}mins`;
  if (m === 0) return `${h} ${h === 1 ? "hour" : "hours"}`;
  if (m === 1) return `${h} ${h === 1 ? "hour" : "hours"} 1min`;
  return `${h} ${h === 1 ? "hour" : "hours"} ${m}mins`;
}
