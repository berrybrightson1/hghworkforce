import { NextRequest, NextResponse } from "next/server";
import { gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * Company-scoped analytics for the overview dashboard.
 */
export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    since.setHours(0, 0, 0, 0);

    const { headcount, checkInDays, lastApprovedPayrun, pendingCorrections } =
      await prisma.$transaction(async (tx) => {
        const headcount = await tx.employee.count({
          where: { companyId, status: "ACTIVE", deletedAt: null },
        });
        const checkInDays = await tx.checkIn.findMany({
          where: { companyId, clockIn: { gte: since } },
          select: { employeeId: true, clockIn: true },
        });
        const p = await tx.payrun.findFirst({
          where: { companyId, status: "APPROVED" },
          orderBy: { periodEnd: "desc" },
        });
        let lastApprovedPayrun: {
          id: string;
          periodEnd: string;
          totalNet: string;
          lineCount: number;
        } | null = null;
        if (p) {
          const agg = await tx.payrunLine.aggregate({
            where: { payrunId: p.id },
            _sum: { netPay: true },
          });
          const lineCount = await tx.payrunLine.count({ where: { payrunId: p.id } });
          lastApprovedPayrun = {
            id: p.id,
            periodEnd: p.periodEnd.toISOString(),
            totalNet: agg._sum.netPay?.toString() ?? "0",
            lineCount,
          };
        }
        const pendingCorrections = await tx.attendanceCorrectionRequest.count({
          where: { companyId, status: "PENDING" },
        });
        return { headcount, checkInDays, lastApprovedPayrun, pendingCorrections };
      });

    const uniqueEmpDays = new Set(
      checkInDays.map((c) => `${c.employeeId}:${c.clockIn.toISOString().slice(0, 10)}`),
    ).size;

    const workingDaysApprox = 22;
    const attendanceRate =
      headcount > 0
        ? Math.min(
            100,
            Math.round((uniqueEmpDays / Math.max(1, headcount * workingDaysApprox)) * 100),
          )
        : 0;

    return NextResponse.json({
      headcount,
      attendanceRateApprox: attendanceRate,
      checkInSessionsApprox: uniqueEmpDays,
      lastApprovedPayrun: lastApprovedPayrun,
      pendingAttendanceCorrections: pendingCorrections,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
