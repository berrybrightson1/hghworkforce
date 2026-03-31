import { prisma } from "@/lib/prisma";
import { endOfLocalDayUtc, localDateString, startOfLocalDayUtc } from "@/lib/kiosk-time";

/** Start of UTC calendar day for `d` (legacy UTC-only bounds). */
export function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

export function endOfUtcDay(d: Date): Date {
  const s = startOfUtcDay(d);
  return new Date(s.getTime() + 86400000 - 1);
}

/**
 * Whether `companyId` has a public holiday on the same **local calendar day** as `instant`.
 * Pass `timeZone` (e.g. company `kioskTimezone`) so midnight-boundary cases match wall clocks.
 * If `timeZone` is omitted, uses UTC calendar day (backwards compatible).
 */
export async function isCompanyPublicHoliday(
  companyId: string,
  instant: Date,
  timeZone?: string,
): Promise<boolean> {
  let start: Date;
  let end: Date;
  if (timeZone) {
    const localDate = localDateString(instant, timeZone);
    start = startOfLocalDayUtc(localDate, timeZone);
    end = endOfLocalDayUtc(localDate, timeZone);
  } else {
    start = startOfUtcDay(instant);
    end = endOfUtcDay(instant);
  }
  const row = await prisma.publicHoliday.findFirst({
    where: {
      companyId,
      date: { gte: start, lte: end },
    },
    select: { id: true },
  });
  return !!row;
}

export async function listPublicHolidaysInRange(
  companyId: string,
  rangeStart: Date,
  rangeEnd: Date,
) {
  return prisma.publicHoliday.findMany({
    where: {
      companyId,
      date: { gte: rangeStart, lte: rangeEnd },
    },
    orderBy: { date: "asc" },
  });
}

/** Ghana-wide common dates (adjust yearly in seed UI). Month/day in Gregorian calendar. */
export function ghanaPublicHolidayTemplates(year: number): { month: number; day: number; name: string }[] {
  return [
    { month: 1, day: 1, name: "New Year's Day" },
    { month: 3, day: 6, name: "Independence Day" },
    { month: 5, day: 1, name: "May Day (Labour Day)" },
    { month: 12, day: 25, name: "Christmas Day" },
    { month: 12, day: 26, name: "Boxing Day" },
  ].map(({ month, day, name }) => ({ month, day, name: `${name} ${year}` }));
}

export function holidayDateUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
}
