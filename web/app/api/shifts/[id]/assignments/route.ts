import { NextRequest, NextResponse } from "next/server";
import { requireDbUser, canManagePayroll } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/shifts/[id]/assignments
 * Body: { employeeId, startDate, endDate? }
 * Assign an employee to a shift.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (!canManagePayroll(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id: shiftId } = await params;
    const body = await req.json();
    const employeeId = body.employeeId as string;
    const startDate = body.startDate as string;
    const endDate = body.endDate as string | undefined;

    if (!employeeId || !startDate) {
      return NextResponse.json(
        { error: "employeeId and startDate are required" },
        { status: 400 },
      );
    }

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    if (employee.companyId !== shift.companyId) {
      return NextResponse.json(
        { error: "Employee and shift must belong to the same company" },
        { status: 400 },
      );
    }

    const assignment = await prisma.shiftAssignment.create({
      data: {
        shiftId,
        employeeId,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
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
        shift: { select: { name: true, startTime: true, endTime: true } },
      },
    });

    return NextResponse.json(assignment, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
