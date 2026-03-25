import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { canAccessCompany, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; componentId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { id, componentId } = await ctx.params;

  let body: Partial<Prisma.SalaryComponentUpdateInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const component = await prisma.salaryComponent.findUnique({
      where: { id: componentId },
      include: { employee: { select: { companyId: true } } },
    });
    if (!component || component.employeeId !== id) {
      return NextResponse.json({ error: "Component not found" }, { status: 404 });
    }
    if (!canAccessCompany(auth.dbUser, component.employee.companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.salaryComponent.update({
      where: { id: componentId },
      data: body,
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "SALARY_COMPONENT_UPDATED",
        entityType: "SalaryComponent",
        entityId: componentId,
        afterState: updated as any,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update component" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; componentId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { id, componentId } = await ctx.params;

  try {
    const component = await prisma.salaryComponent.findUnique({
      where: { id: componentId },
      include: { employee: { select: { companyId: true } } },
    });
    if (!component || component.employeeId !== id) {
      return NextResponse.json({ error: "Component not found" }, { status: 404 });
    }
    if (!canAccessCompany(auth.dbUser, component.employee.companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.salaryComponent.delete({
      where: { id: componentId },
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "SALARY_COMPONENT_DELETED",
        entityType: "SalaryComponent",
        entityId: componentId,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete component" }, { status: 500 });
  }
}
