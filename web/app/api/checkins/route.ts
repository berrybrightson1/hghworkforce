import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  requireDbUser,
  gateCompanyBilling,
  gateBillingForEmployeeSelf,
  requireEmployeeSelf,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { startOfLocalDayUtc, endOfLocalDayUtc } from "@/lib/kiosk-time";

// ── GET ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/checkins?companyId=...&date=YYYY-MM-DD&employeeId=...&status=...
 * `date` is interpreted as a civil day in the company's kiosk timezone.
 */
export async function GET(req: NextRequest) {
  const self = await requireEmployeeSelf();

  try {
    const { searchParams } = req.nextUrl;
    const companyId = searchParams.get("companyId");
    const date = searchParams.get("date");
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");

    const where: Prisma.CheckInWhereInput = {};

    if (self.ok) {
      const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
      if (billing) return billing;
      where.companyId = self.employee.companyId;
      where.employeeId = self.employee.id;
    } else {
      const auth = await requireDbUser();
      if (!auth.ok) return auth.response;
      if (auth.dbUser.role === "EMPLOYEE") {
        const emp = await prisma.employee.findUnique({
          where: { userId: auth.dbUser.id },
          select: { id: true, companyId: true },
        });
        if (!emp) {
          return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
        }
        const billing = await gateCompanyBilling(auth.dbUser, emp.companyId);
        if (billing) return billing;
        where.companyId = emp.companyId;
        where.employeeId = emp.id;
      } else {
        const effectiveCompanyId = companyId ?? auth.dbUser.companyId;
        if (!effectiveCompanyId) {
          return NextResponse.json(
            { error: "companyId query parameter is required" },
            { status: 400 },
          );
        }
        const billing = await gateCompanyBilling(auth.dbUser, effectiveCompanyId);
        if (billing) return billing;
        where.companyId = effectiveCompanyId;

        if (employeeId) {
          const empInCo = await prisma.employee.findFirst({
            where: { id: employeeId, companyId: effectiveCompanyId },
            select: { id: true },
          });
          if (!empInCo) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
          }
          where.employeeId = employeeId;
        }
      }
    }

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
      }
      const cid = where.companyId as string;
      const co = await prisma.company.findUnique({
        where: { id: cid },
        select: { kioskTimezone: true },
      });
      const tz = co?.kioskTimezone || "Africa/Accra";
      const dayStart = startOfLocalDayUtc(date, tz);
      const dayEnd = endOfLocalDayUtc(date, tz);
      where.clockIn = { gte: dayStart, lte: dayEnd };
    }

    if (status === "CLOCKED_IN" || status === "CLOCKED_OUT") {
      where.status = status;
    }

    const checkins = await prisma.checkIn.findMany({
      where,
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
        shiftAssignment: {
          include: {
            shift: { select: { name: true, startTime: true, endTime: true } },
          },
        },
      },
      orderBy: { clockIn: "desc" },
      take: 200,
    });

    return NextResponse.json(checkins);
  } catch {
    return NextResponse.json({ error: "Failed to load check-ins" }, { status: 500 });
  }
}

/**
 * POST /api/checkins — disabled. Clock-in/out only via POST /api/kiosk/clock (office kiosk).
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Check-in and check-out are only available at your company's office kiosk. Open the kiosk link from your HR team.",
      code: "KIOSK_ONLY",
    },
    { status: 403 },
  );
}
