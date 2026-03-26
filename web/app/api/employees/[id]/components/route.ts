import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { companyId: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const billing = await gateCompanyBilling(auth.dbUser, employee.companyId);
    if (billing) return billing;

    const components = await prisma.salaryComponent.findMany({
      where: { employeeId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(components);
  } catch {
    return NextResponse.json({ error: "Failed to load components" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  let body: Prisma.SalaryComponentUncheckedCreateInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { companyId: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    const billing = await gateCompanyBilling(auth.dbUser, employee.companyId);
    if (billing) return billing;

    const component = await prisma.salaryComponent.create({
      data: {
        ...body,
        employeeId: id,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "SALARY_COMPONENT_CREATED",
        entityType: "SalaryComponent",
        entityId: component.id,
        afterState: JSON.parse(JSON.stringify(component)) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(component);
  } catch {
    return NextResponse.json({ error: "Failed to create component" }, { status: 500 });
  }
}
