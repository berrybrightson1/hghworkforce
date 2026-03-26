import { NextRequest, NextResponse } from "next/server";
import { requireDbUser, gateCompanyBilling } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/checkins/summary?companyId=...&from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Returns per-employee attendance summary for the given date range:
 *   - totalHours, daysPresent, lateCount, earlyDepartCount, overtimeHours, avgHoursPerDay
 */
export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = req.nextUrl;
    const companyId = searchParams.get("companyId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }
    const billing = await gateCompanyBilling(auth.dbUser, companyId);
    if (billing) return billing;

    // Default to current month if not provided
    const now = new Date();
    const fromDate = from
      ? new Date(`${from}T00:00:00.000Z`)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const toDate = to
      ? new Date(`${to}T23:59:59.999Z`)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));

    const checkins = await prisma.checkIn.findMany({
      where: {
        companyId,
        status: "CLOCKED_OUT",
        clockIn: { gte: fromDate, lte: toDate },
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeCode: true,
            name: true,
            department: true,
            jobTitle: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { clockIn: "asc" },
    });

    // Group by employee
    const map = new Map<
      string,
      {
        employee: {
          id: string;
          employeeCode: string;
          name: string | null;
          department: string;
          jobTitle: string;
          user: { name: string } | null;
        };
        totalHours: number;
        overtimeHours: number;
        lateCount: number;
        earlyDepartCount: number;
        days: Set<string>;
      }
    >();

    for (const c of checkins) {
      if (!map.has(c.employeeId)) {
        map.set(c.employeeId, {
          employee: c.employee,
          totalHours: 0,
          overtimeHours: 0,
          lateCount: 0,
          earlyDepartCount: 0,
          days: new Set(),
        });
      }
      const entry = map.get(c.employeeId)!;
      entry.totalHours += c.hoursWorked ? Number(c.hoursWorked) : 0;
      entry.overtimeHours += c.overtimeHours ? Number(c.overtimeHours) : 0;
      if (c.lateMinutes && c.lateMinutes > 0) entry.lateCount++;
      if (c.earlyDepartMinutes && c.earlyDepartMinutes > 0) entry.earlyDepartCount++;
      entry.days.add(c.clockIn.toISOString().slice(0, 10));
    }

    const summary = Array.from(map.values()).map((e) => ({
      employee: e.employee,
      totalHours: Math.round(e.totalHours * 100) / 100,
      overtimeHours: Math.round(e.overtimeHours * 100) / 100,
      daysPresent: e.days.size,
      lateCount: e.lateCount,
      earlyDepartCount: e.earlyDepartCount,
      avgHoursPerDay: e.days.size > 0 ? Math.round((e.totalHours / e.days.size) * 100) / 100 : 0,
    }));

    // Sort by employee code
    summary.sort((a, b) => a.employee.employeeCode.localeCompare(b.employee.employeeCode));

    return NextResponse.json({
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
      employees: summary,
      totals: {
        employees: summary.length,
        totalHours: Math.round(summary.reduce((s, e) => s + e.totalHours, 0) * 100) / 100,
        overtimeHours: Math.round(summary.reduce((s, e) => s + e.overtimeHours, 0) * 100) / 100,
        totalLateCount: summary.reduce((s, e) => s + e.lateCount, 0),
        totalEarlyDepartCount: summary.reduce((s, e) => s + e.earlyDepartCount, 0),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate summary" }, { status: 500 });
  }
}
