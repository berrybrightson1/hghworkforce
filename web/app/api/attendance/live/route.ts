import { NextResponse } from "next/server";
import { requireDbUser, canManage, gateCompanyBilling } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  if (!canManage(dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId") ?? dbUser.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const billing = await gateCompanyBilling(dbUser, companyId);
  if (billing) return billing;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const now = new Date();
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;

  const [employees, todayCheckins, approvedLeave] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        department: true,
        shiftAssignments: {
          where: {
            startDate: { lte: now },
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
          include: { shift: true },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.checkIn.findMany({
      where: {
        companyId,
        clockIn: { gte: todayStart, lte: todayEnd },
      },
      select: {
        employeeId: true,
        clockIn: true,
        lateMinutes: true,
      },
    }),
    prisma.leaveRequest.findMany({
      where: {
        employee: { companyId },
        status: "APPROVED",
        startDate: { lte: todayEnd },
        endDate: { gte: todayStart },
      },
      select: { employeeId: true },
    }),
  ]);

  const checkinMap = new Map<string, { clockIn: Date; lateMinutes: number | null }>();
  for (const c of todayCheckins) {
    if (!checkinMap.has(c.employeeId)) {
      checkinMap.set(c.employeeId, { clockIn: c.clockIn, lateMinutes: c.lateMinutes });
    }
  }

  const onLeaveIds = new Set(approvedLeave.map((l) => l.employeeId));

  const board = employees.map((emp) => {
    const checkin = checkinMap.get(emp.id);
    const onLeave = onLeaveIds.has(emp.id);

    let status: "PRESENT" | "LATE" | "ABSENT" | "ON_LEAVE" | "WEEKEND";
    let clockInTime: string | null = null;

    if (isWeekend) {
      status = "WEEKEND";
    } else if (onLeave) {
      status = "ON_LEAVE";
    } else if (checkin) {
      clockInTime = checkin.clockIn.toISOString();
      status = checkin.lateMinutes && checkin.lateMinutes > 0 ? "LATE" : "PRESENT";
    } else {
      status = "ABSENT";
    }

    return {
      id: emp.id,
      name: emp.name ?? "Unnamed",
      department: emp.department,
      status,
      clockInTime,
    };
  });

  const summary = {
    present: board.filter((b) => b.status === "PRESENT").length,
    late: board.filter((b) => b.status === "LATE").length,
    absent: board.filter((b) => b.status === "ABSENT").length,
    onLeave: board.filter((b) => b.status === "ON_LEAVE").length,
  };

  return NextResponse.json({ board, summary });
}
