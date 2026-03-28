import { NextRequest, NextResponse } from "next/server";
import { requireDbUser, canManagePayroll } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/employees/[id]/reset-device
 *
 * Resets the kiosk device binding for an employee.
 * Requires HR/Admin role. Next time the employee scans a QR, their new phone will be bound.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (!canManagePayroll(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id },
    select: { id: true, companyId: true, name: true, employeeCode: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  await prisma.employee.update({
    where: { id },
    data: {
      kioskDeviceTokenHash: null,
      deviceBoundAt: null,
      deviceResetAt: new Date(),
      deviceResetBy: auth.dbUser.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: auth.dbUser.id,
      action: "DEVICE_BINDING_RESET",
      entityType: "Employee",
      entityId: id,
      afterState: {
        employeeCode: employee.employeeCode,
        employeeName: employee.name,
        resetBy: auth.dbUser.id,
      },
    },
  });

  return NextResponse.json({ ok: true, message: "Device binding has been reset" });
}
