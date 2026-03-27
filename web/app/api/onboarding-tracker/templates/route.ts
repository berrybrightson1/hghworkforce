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

  const templates = await prisma.onboardingTemplate.findMany({
    where: { companyId },
    include: { _count: { select: { tasks: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  if (!canManage(dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();
  const { companyId, name, isDefault, tasks } = body;

  if (!companyId || !name || !Array.isArray(tasks)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const billing = await gateCompanyBilling(dbUser, companyId);
  if (billing) return billing;

  // If setting as default, unset other defaults
  if (isDefault) {
    await prisma.onboardingTemplate.updateMany({
      where: { companyId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const template = await prisma.onboardingTemplate.create({
    data: {
      tenantId: companyId,
      companyId,
      name,
      isDefault: isDefault ?? false,
      tasks: {
        create: tasks.map(
          (t: { title: string; description?: string; dueAfterDays: number; isRequired: boolean }, i: number) => ({
            title: t.title,
            description: t.description ?? null,
            dueAfterDays: t.dueAfterDays,
            isRequired: t.isRequired,
            order: i,
          }),
        ),
      },
    },
    include: { tasks: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: dbUser.id,
      action: "ONBOARDING_TEMPLATE_CREATED",
      entityType: "OnboardingTemplate",
      entityId: template.id,
      afterState: { name, taskCount: tasks.length },
    },
  });

  return NextResponse.json(template, { status: 201 });
}
