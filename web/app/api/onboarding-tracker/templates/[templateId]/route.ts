import { NextResponse } from "next/server";
import { requireDbUser, canManage, gateCompanyBilling } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET — single template with tasks (for “duplicate as new” pre-fill).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ templateId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (!canManage(auth.dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { templateId } = await params;
  const template = await prisma.onboardingTemplate.findUnique({
    where: { id: templateId },
    include: {
      tasks: { orderBy: { order: "asc" } },
    },
  });

  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const billing = await gateCompanyBilling(auth.dbUser, template.companyId);
  if (billing) return billing;

  return NextResponse.json({
    id: template.id,
    companyId: template.companyId,
    name: template.name,
    isDefault: template.isDefault,
    tasks: template.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description ?? "",
      dueAfterDays: t.dueAfterDays,
      isRequired: t.isRequired,
    })),
  });
}

/**
 * PATCH — update template name, default flag, and task list (tasks may be added/removed/reordered).
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ templateId: string }> }) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (!canManage(auth.dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { templateId } = await params;
  const existing = await prisma.onboardingTemplate.findUnique({
    where: { id: templateId },
    include: { tasks: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const billing = await gateCompanyBilling(auth.dbUser, existing.companyId);
  if (billing) return billing;

  const body = await req.json();
  const { name, isDefault, tasks } = body as {
    name?: string;
    isDefault?: boolean;
    tasks?: {
      id?: string;
      title: string;
      description?: string;
      dueAfterDays: number;
      isRequired: boolean;
    }[];
  };

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Template name is required" }, { status: 400 });
  }
  if (!Array.isArray(tasks) || tasks.length === 0) {
    return NextResponse.json({ error: "At least one task is required" }, { status: 400 });
  }
  if (tasks.some((t) => !t.title || typeof t.title !== "string" || !t.title.trim())) {
    return NextResponse.json({ error: "Every task must have a title" }, { status: 400 });
  }

  const taskIdsBefore = new Set(existing.tasks.map((t) => t.id));

  await prisma.$transaction(async (tx) => {
    if (isDefault) {
      await tx.onboardingTemplate.updateMany({
        where: { companyId: existing.companyId, isDefault: true },
        data: { isDefault: false },
      });
    }

    await tx.onboardingTemplate.update({
      where: { id: templateId },
      data: {
        name: name.trim(),
        isDefault: isDefault ?? false,
      },
    });

    const kept = new Set<string>();

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const trimmedTitle = t.title.trim();
      if (t.id && taskIdsBefore.has(t.id)) {
        kept.add(t.id);
        await tx.onboardingTemplateTask.update({
          where: { id: t.id },
          data: {
            title: trimmedTitle,
            description: t.description?.trim() ? t.description.trim() : null,
            dueAfterDays: t.dueAfterDays,
            isRequired: t.isRequired,
            order: i,
          },
        });
      } else {
        await tx.onboardingTemplateTask.create({
          data: {
            templateId,
            title: trimmedTitle,
            description: t.description?.trim() ? t.description.trim() : null,
            dueAfterDays: t.dueAfterDays,
            isRequired: t.isRequired,
            order: i,
          },
        });
      }
    }

    const toDelete = existing.tasks.filter((row) => !kept.has(row.id)).map((row) => row.id);
    if (toDelete.length > 0) {
      await tx.onboardingTemplateTask.deleteMany({
        where: { id: { in: toDelete } },
      });
    }
  });

  const updated = await prisma.onboardingTemplate.findUnique({
    where: { id: templateId },
    include: { tasks: { orderBy: { order: "asc" } } },
  });

  await prisma.auditLog.create({
    data: {
      actorId: auth.dbUser.id,
      action: "ONBOARDING_TEMPLATE_UPDATED",
      entityType: "OnboardingTemplate",
      entityId: templateId,
      afterState: { name: name.trim(), taskCount: tasks.length },
    },
  });

  return NextResponse.json(updated);
}
