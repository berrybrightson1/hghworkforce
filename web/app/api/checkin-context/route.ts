import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gateCompanyBilling, requireDbUser } from "@/lib/api-auth";

/**
 * GET /api/checkin-context
 * Employee portal: company check-in flags + whether device is bound.
 */
export async function GET() {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (auth.dbUser.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Employees only" }, { status: 403 });
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { userId: auth.dbUser.id },
      select: {
        id: true,
        kioskDeviceTokenHash: true,
        company: {
          select: {
            id: true,
            checkinEnterpriseEnabled: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
    }

    const billing = await gateCompanyBilling(auth.dbUser, employee.company.id);
    if (billing) return billing;

    const c = employee.company;
    return NextResponse.json({
      employeeId: employee.id,
      companyId: c.id,
      checkinEnterpriseEnabled: c.checkinEnterpriseEnabled,
      hasDeviceBound: employee.kioskDeviceTokenHash != null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load context" }, { status: 500 });
  }
}
