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
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const billing = await gateCompanyBilling(dbUser, companyId);
  if (billing) return billing;

  const statusFilter = searchParams.get("status");

  const onboardings = await prisma.employeeOnboarding.findMany({
    where: {
      companyId,
      ...(statusFilter ? { status: statusFilter as "PENDING" | "IN_PROGRESS" | "COMPLETED" | "OVERDUE" } : {}),
    },
    include: {
      employee: { select: { name: true, employeeCode: true } },
      tasks: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(onboardings);
}

export async function POST(req: Request) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  if (!canManage(dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { employeeId, templateId, companyId } = body;

  if (!employeeId || !templateId || !companyId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const billing = await gateCompanyBilling(dbUser, companyId);
  if (billing) return billing;

  const template = await prisma.onboardingTemplate.findUnique({
    where: { id: templateId },
    include: { tasks: { orderBy: { order: "asc" } } },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { startDate: true },
  });

  if (!employee) {
    return NextResponse.json({ error: "Employee not found" }, { status: 404 });
  }

  const startDate = employee.startDate;

  const onboarding = await prisma.employeeOnboarding.create({
    data: {
      employeeId,
      tenantId: companyId,
      companyId,
      templateId,
      startDate,
      status: "PENDING",
      tasks: {
        create: template.tasks.map((t) => ({
          templateTaskId: t.id,
          title: t.title,
          dueDate: new Date(startDate.getTime() + t.dueAfterDays * 86400000),
          isRequired: t.isRequired,
          status: "PENDING",
        })),
      },
    },
    include: { tasks: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: dbUser.id,
      action: "ONBOARDING_CREATED",
      entityType: "EmployeeOnboarding",
      entityId: onboarding.id,
      afterState: { employeeId, templateId },
    },
  });

  return NextResponse.json(onboarding, { status: 201 });
}
