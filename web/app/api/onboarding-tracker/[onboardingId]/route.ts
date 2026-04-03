import { NextResponse } from "next/server";
import { requireDbUser, canManage, gateCompanyBilling } from "@/lib/api-auth";
import { notifyAdmins } from "@/lib/admin-notifications";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ onboardingId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  if (!canManage(dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { onboardingId } = await params;
  const body = await req.json();
  const { taskId, action, waivedNote } = body;

  const onboarding = await prisma.employeeOnboarding.findUnique({
    where: { id: onboardingId },
    include: { tasks: true },
  });

  if (!onboarding) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const billing = await gateCompanyBilling(dbUser, onboarding.companyId);
  if (billing) return billing;

  if (action === "complete-task" && taskId) {
    await prisma.onboardingChecklistItem.update({
      where: { id: taskId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        completedBy: dbUser.id,
      },
    });

    // Check if all required tasks are completed
    const updatedTasks = await prisma.onboardingChecklistItem.findMany({
      where: { onboardingId },
    });

    const allRequiredDone = updatedTasks
      .filter((t) => t.isRequired)
      .every((t) => t.status === "COMPLETED" || t.status === "WAIVED");

    if (allRequiredDone) {
      await prisma.employeeOnboarding.update({
        where: { id: onboardingId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    } else {
      await prisma.employeeOnboarding.update({
        where: { id: onboardingId },
        data: { status: "IN_PROGRESS" },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: dbUser.id,
        action: "ONBOARDING_TASK_COMPLETED",
        entityType: "OnboardingChecklistItem",
        entityId: taskId,
      },
    });

    const updated = await prisma.employeeOnboarding.findUnique({
      where: { id: onboardingId },
      include: {
        tasks: true,
        employee: { select: { name: true, employeeCode: true } },
      },
    });

    if (allRequiredDone && updated?.employee) {
      void notifyAdmins({
        companyId: onboarding.companyId,
        type: "ONBOARDING_UPDATE",
        title: "Onboarding completed",
        message: `All required onboarding tasks for ${updated.employee.name} (${updated.employee.employeeCode}) are now complete.`,
        linkUrl: `/dashboard/onboarding/${onboardingId}`,
        actorName: updated.employee.name ?? undefined,
      });
    }

    return NextResponse.json(updated);
  }

  if (action === "waive-task" && taskId) {
    if (!waivedNote) {
      return NextResponse.json({ error: "Note required for waiving" }, { status: 400 });
    }

    await prisma.onboardingChecklistItem.update({
      where: { id: taskId },
      data: {
        status: "WAIVED",
        waivedBy: dbUser.id,
        waivedNote,
      },
    });

    // Check completion
    const updatedTasks = await prisma.onboardingChecklistItem.findMany({
      where: { onboardingId },
    });

    const allRequiredDone = updatedTasks
      .filter((t) => t.isRequired)
      .every((t) => t.status === "COMPLETED" || t.status === "WAIVED");

    if (allRequiredDone) {
      await prisma.employeeOnboarding.update({
        where: { id: onboardingId },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: dbUser.id,
        action: "ONBOARDING_TASK_WAIVED",
        entityType: "OnboardingChecklistItem",
        entityId: taskId,
        afterState: { waivedNote },
      },
    });

    const updated = await prisma.employeeOnboarding.findUnique({
      where: { id: onboardingId },
      include: {
        tasks: true,
        employee: { select: { name: true, employeeCode: true } },
      },
    });

    if (allRequiredDone && updated?.employee) {
      void notifyAdmins({
        companyId: onboarding.companyId,
        type: "ONBOARDING_UPDATE",
        title: "Onboarding completed",
        message: `All required onboarding tasks for ${updated.employee.name} (${updated.employee.employeeCode}) are now complete.`,
        linkUrl: `/dashboard/onboarding/${onboardingId}`,
        actorName: updated.employee.name ?? undefined,
      });
    }

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
