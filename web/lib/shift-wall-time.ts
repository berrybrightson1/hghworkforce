/**
 * Minutes after local midnight for `date` in IANA `timeZone`.
 * Use this when comparing real clock times to shift start/end strings (HH:mm) stored as office-local wall time.
 */
export function wallMinutesFromDateInZone(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}
