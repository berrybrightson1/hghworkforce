import { NextRequest, NextResponse } from "next/server";
import { companyHasFullAccess } from "@/lib/billing/access";
import { prisma } from "@/lib/prisma";
import {
  endOfLocalDayUtc,
  localDateString,
  localMinutesFromMidnight,
  parseHHmmToMinutes,
  startOfLocalDayUtc,
} from "@/lib/kiosk-time";

async function runKioskAbsenceJob() {
  const now = new Date();
  const companies = await prisma.company.findMany({
    where: { kioskCutoffTime: { not: null } },
    select: {
      id: true,
      kioskTimezone: true,
      kioskCutoffTime: true,
      kioskLastAbsentRunDate: true,
      subscriptionStatus: true,
      trialEndsAt: true,
      createdAt: true,
    },
  });

  const summary = { companiesProcessed: 0, absencesCreated: 0, errors: [] as string[] };

  for (const c of companies) {
    try {
      if (!companyHasFullAccess(c)) continue;

      const tz = c.kioskTimezone || "Africa/Accra";
      const localDate = localDateString(now, tz);
      const cutM = parseHHmmToMinutes(c.kioskCutoffTime);
      if (cutM == null) continue;

      const localMins = localMinutesFromMidnight(now, tz);
      if (localMins < cutM) continue;

      if (c.kioskLastAbsentRunDate === localDate) continue;

      const dayStart = startOfLocalDayUtc(localDate, tz);
      const dayEnd = endOfLocalDayUtc(localDate, tz);

      const employees = await prisma.employee.findMany({
        where: {
          companyId: c.id,
          status: "ACTIVE",
          deletedAt: null,
          shiftAssignments: {
            some: {
              startDate: { lte: dayEnd },
              OR: [{ endDate: null }, { endDate: { gte: dayStart } }],
            },
          },
        },
        select: { id: true },
      });

      const rows: { companyId: string; employeeId: string; localDate: string; reason: string }[] =
        [];

      for (const emp of employees) {
        const stillIn = await prisma.checkIn.findFirst({
          where: { employeeId: emp.id, status: "CLOCKED_IN" },
          select: { id: true },
        });
        if (stillIn) continue;

        const clockedToday = await prisma.checkIn.findFirst({
          where: {
            employeeId: emp.id,
            clockIn: { gte: dayStart, lte: dayEnd },
          },
          select: { id: true },
        });
        if (clockedToday) continue;

        const already = await prisma.kioskDayAbsence.findFirst({
          where: { companyId: c.id, employeeId: emp.id, localDate },
        });
        if (already) continue;

        rows.push({
          companyId: c.id,
          employeeId: emp.id,
          localDate,
          reason: "MISSING_CHECKIN",
        });
      }

      if (rows.length > 0) {
        await prisma.kioskDayAbsence.createMany({ data: rows, skipDuplicates: true });
        summary.absencesCreated += rows.length;
      }

      await prisma.company.update({
        where: { id: c.id },
        data: { kioskLastAbsentRunDate: localDate },
      });
      summary.companiesProcessed += 1;
    } catch (e) {
      summary.errors.push(`${c.id}: ${e instanceof Error ? e.message : "error"}`);
    }
  }

  return summary;
}

function authorizeCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

/** Vercel Cron uses GET; manual runs can POST. */
export async function GET(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runKioskAbsenceJob();
    return NextResponse.json(summary);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const summary = await runKioskAbsenceJob();
    return NextResponse.json(summary);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Cron failed" }, { status: 500 });
  }
}
