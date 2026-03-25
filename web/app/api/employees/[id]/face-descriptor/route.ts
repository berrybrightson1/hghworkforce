import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canAccessCompany, requireDbUser } from "@/lib/api-auth";
import { parseFaceDescriptor } from "@/lib/face-math";

/**
 * POST /api/employees/[id]/face-descriptor
 * Body: { descriptor: number[] }
 * Self-service for the linked employee user, or Super Admin / Company Admin / HR for that company.
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const { id: employeeId } = await ctx.params;

  let body: { descriptor?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const descriptor = parseFaceDescriptor(body.descriptor);
  if (!descriptor || descriptor.length < 32) {
    return NextResponse.json(
      { error: "descriptor must be a numeric array (e.g. 128-d face embedding)" },
      { status: 400 },
    );
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, companyId: true, userId: true, status: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    if (employee.status !== "ACTIVE") {
      return NextResponse.json({ error: "Employee is not active" }, { status: 403 });
    }

    const isSelf = employee.userId === auth.dbUser.id;
    const isStaff = canAccessCompany(auth.dbUser, employee.companyId);

    if (!isSelf && !isStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (!isSelf) {
      const payrollRoles = ["SUPER_ADMIN", "COMPANY_ADMIN", "HR"];
      if (!payrollRoles.includes(auth.dbUser.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        faceDescriptor: descriptor,
        faceRegisteredAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "EMPLOYEE_FACE_ENROLLED",
        entityType: "Employee",
        entityId: employeeId,
        afterState: { dim: descriptor.length, selfService: isSelf },
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save face data" }, { status: 500 });
  }
}
