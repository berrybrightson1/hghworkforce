import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";
import { localDateString } from "@/lib/kiosk-time";
import { findActiveShiftAssignmentForEmployeeLocalDay } from "@/lib/checkin-clock";

/**
 * GET /api/checkin-context
 * Employee portal: civil date in company kiosk timezone and related fields (attendance page).
 */
export async function GET() {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: self.employee.id },
      select: {
        id: true,
        companyId: true,
        kioskDeviceTokenHash: true,
        company: {
          select: {
            id: true,
            checkinEnterpriseEnabled: true,
            kioskTimezone: true,
            kioskOfficeOpensAt: true,
            kioskOfficeClosesAt: true,
            kioskCutoffTime: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
    }

    const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
    if (billing) return billing;

    const c = employee.company;
    const tz = c.kioskTimezone || "Africa/Accra";
    const now = new Date();
    const localToday = localDateString(now, tz);

    const assignment = await findActiveShiftAssignmentForEmployeeLocalDay(employee.id, tz, now);

    return NextResponse.json({
      employeeId: employee.id,
      companyId: c.id,
      checkinEnterpriseEnabled: c.checkinEnterpriseEnabled,
      hasDeviceBound: employee.kioskDeviceTokenHash != null,
      kioskTimezone: tz,
      localToday,
      kioskOfficeOpensAt: c.kioskOfficeOpensAt,
      kioskOfficeClosesAt: c.kioskOfficeClosesAt,
      kioskCutoffTime: c.kioskCutoffTime,
      hasShiftToday: !!assignment,
      shift: assignment?.shift
        ? {
            name: assignment.shift.name,
            startTime: assignment.shift.startTime,
            endTime: assignment.shift.endTime,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load context" }, { status: 500 });
  }
}
