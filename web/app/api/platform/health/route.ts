import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * SUPER_ADMIN — aggregate tenant health for support / ops.
 */
export async function GET() {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  if (auth.dbUser.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [
      companies,
      users,
      employees,
      payrunsLast30,
      pendingLeave,
      pendingCorrections,
      bySubscription,
    ] = await Promise.all([
      prisma.company.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.employee.count({ where: { status: "ACTIVE", deletedAt: null } }),
      prisma.payrun.count({ where: { createdAt: { gte: since } } }),
      prisma.leaveRequest.count({ where: { status: "PENDING" } }),
      prisma.attendanceCorrectionRequest.count({ where: { status: "PENDING" } }),
      prisma.company.groupBy({
        by: ["subscriptionStatus"],
        _count: { id: true },
      }),
    ]);

    const recentCompanies = await prisma.company.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        createdAt: true,
        _count: { select: { employees: true } },
      },
    });

    return NextResponse.json({
      totals: {
        companies,
        activeUsers: users,
        activeEmployees: employees,
        payrunsLast30Days: payrunsLast30,
        pendingLeaveRequests: pendingLeave,
        pendingAttendanceCorrections: pendingCorrections,
      },
      companiesBySubscription: bySubscription.map((p) => ({
        subscriptionStatus: p.subscriptionStatus,
        count: p._count.id,
      })),
      recentCompanies,
    });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
