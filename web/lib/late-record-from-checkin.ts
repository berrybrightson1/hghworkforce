import { prisma } from "@/lib/prisma";
import { endOfLocalDayUtc, localDateString, startOfLocalDayUtc } from "@/lib/kiosk-time";

/** When a check-in is late, ensure a LateRecord exists for that local day (links checkInId, keeps max minutes). */
export async function upsertLateRecordFromCheckIn(params: {
  companyId: string;
  employeeId: string;
  checkInId: string;
  lateMinutes: number;
  clockIn: Date;
  timeZone: string;
}): Promise<void> {
  const { lateMinutes } = params;
  if (lateMinutes <= 0) return;

  const localDate = localDateString(params.clockIn, params.timeZone);
  const dayStart = startOfLocalDayUtc(localDate, params.timeZone);
  const dayEnd = endOfLocalDayUtc(localDate, params.timeZone);

  const existing = await prisma.lateRecord.findFirst({
    where: {
      employeeId: params.employeeId,
      date: { gte: dayStart, lte: dayEnd },
    },
    select: { id: true, minutesLate: true, checkInId: true },
  });

  if (existing) {
    const nextMinutes = Math.max(existing.minutesLate, lateMinutes);
    await prisma.lateRecord.update({
      where: { id: existing.id },
      data: {
        minutesLate: nextMinutes,
        checkInId: params.checkInId,
      },
    });
    return;
  }

  await prisma.lateRecord.create({
    data: {
      companyId: params.companyId,
      employeeId: params.employeeId,
      checkInId: params.checkInId,
      date: dayStart,
      minutesLate: lateMinutes,
    },
  });
}
