import { NextResponse } from "next/server";
import { requireDbUser, canManage, gateCompanyBilling } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  const { reviewId } = await params;

  const review = await prisma.performanceReview.findUnique({
    where: { id: reviewId },
    include: {
      employee: { select: { name: true, employeeCode: true, department: true, companyId: true } },
      goals: { orderBy: { title: "asc" } },
      cycle: { select: { name: true, periodStart: true, periodEnd: true } },
    },
  });

  if (!review) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Allow employee to see their own review
  const isOwnReview =
    dbUser.role === "EMPLOYEE" &&
    (await prisma.employee.findFirst({
      where: { userId: dbUser.id, id: review.employeeId },
    }));

  if (!isOwnReview && !canManage(dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isOwnReview) {
    const billing = await gateCompanyBilling(dbUser, review.employee.companyId);
    if (billing) return billing;
  }

  return NextResponse.json(review);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  const { reviewId } = await params;
  const body = await req.json();
  const { action, goals, selfComment, managerComment } = body;

  const review = await prisma.performanceReview.findUnique({
    where: { id: reviewId },
    include: {
      employee: { select: { companyId: true } },
      goals: true,
    },
  });

  if (!review) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Self-review by employee
  if (action === "self-review") {
    const employee = await prisma.employee.findFirst({
      where: { userId: dbUser.id, id: review.employeeId },
    });

    if (!employee) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (review.status !== "PENDING") {
      return NextResponse.json({ error: "Self review already submitted" }, { status: 400 });
    }

    // Update goals with self scores
    if (Array.isArray(goals)) {
      for (const g of goals) {
        await prisma.performanceGoal.update({
          where: { id: g.id },
          data: { selfScore: g.selfScore },
        });
      }
    }

    const selfRating =
      Array.isArray(goals) && goals.length > 0
        ? goals.reduce(
            (sum: number, g: { selfScore: number; weight: number }) =>
              sum + (g.selfScore * g.weight) / 100,
            0,
          )
        : null;

    await prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        status: "SELF_REVIEWED",
        selfRating,
        selfComment: selfComment ?? null,
        submittedAt: new Date(),
      },
    });

    return NextResponse.json({ submitted: true });
  }

  // Manager review
  if (action === "manager-review") {
    if (!canManage(dbUser.role)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const billing = await gateCompanyBilling(dbUser, review.employee.companyId);
    if (billing) return billing;

    if (Array.isArray(goals)) {
      for (const g of goals) {
        await prisma.performanceGoal.update({
          where: { id: g.id },
          data: { managerScore: g.managerScore },
        });
      }
    }

    const managerRating =
      Array.isArray(goals) && goals.length > 0
        ? goals.reduce(
            (sum: number, g: { managerScore: number; weight: number }) =>
              sum + (g.managerScore * g.weight) / 100,
            0,
          )
        : null;

    await prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        status: "MANAGER_REVIEWED",
        reviewerId: dbUser.id,
        managerRating,
        managerComment: managerComment ?? null,
      },
    });

    return NextResponse.json({ submitted: true });
  }

  // Complete review
  if (action === "complete") {
    if (!canManage(dbUser.role)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const billing = await gateCompanyBilling(dbUser, review.employee.companyId);
    if (billing) return billing;

    // Calculate final rating from manager scores
    const updatedGoals = await prisma.performanceGoal.findMany({
      where: { reviewId },
    });

    const finalRating = updatedGoals.reduce((sum, g) => {
      const score = g.managerScore ?? g.selfScore ?? 0;
      return sum + (score * g.weight) / 100;
    }, 0);

    await prisma.performanceReview.update({
      where: { id: reviewId },
      data: {
        status: "COMPLETED",
        finalRating,
        completedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: dbUser.id,
        action: "PERFORMANCE_REVIEW_COMPLETED",
        entityType: "PerformanceReview",
        entityId: reviewId,
        afterState: { finalRating },
      },
    });

    return NextResponse.json({ completed: true, finalRating });
  }

  // Add goals
  if (action === "add-goals") {
    if (!canManage(dbUser.role)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (!Array.isArray(goals)) {
      return NextResponse.json({ error: "goals array required" }, { status: 400 });
    }

    await prisma.performanceGoal.createMany({
      data: goals.map((g: { title: string; description?: string; weight: number }) => ({
        reviewId,
        title: g.title,
        description: g.description ?? null,
        weight: g.weight,
      })),
    });

    const updated = await prisma.performanceReview.findUnique({
      where: { id: reviewId },
      include: { goals: true },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
