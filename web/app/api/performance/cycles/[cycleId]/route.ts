import { NextResponse } from "next/server";
import { requireDbUser, canManage, gateCompanyBilling } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ cycleId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  if (!canManage(dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { cycleId } = await params;

  const cycle = await prisma.performanceCycle.findUnique({
    where: { id: cycleId },
    include: {
      reviews: {
        include: {
          employee: { select: { name: true, employeeCode: true, department: true } },
          goals: true,
        },
      },
    },
  });

  if (!cycle) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const billing = await gateCompanyBilling(dbUser, cycle.companyId);
  if (billing) return billing;

  return NextResponse.json(cycle);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ cycleId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  if (!canManage(dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { cycleId } = await params;
  const body = await req.json();
  const { action } = body;

  const cycle = await prisma.performanceCycle.findUnique({
    where: { id: cycleId },
  });

  if (!cycle) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const billing = await gateCompanyBilling(dbUser, cycle.companyId);
  if (billing) return billing;

  if (action === "activate") {
    if (cycle.status !== "DRAFT") {
      return NextResponse.json({ error: "Only DRAFT cycles can be activated" }, { status: 400 });
    }

    // Create reviews for all active employees
    const employees = await prisma.employee.findMany({
      where: { companyId: cycle.companyId, status: "ACTIVE" },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.performanceCycle.update({
        where: { id: cycleId },
        data: { status: "ACTIVE" },
      }),
      ...employees.map((emp) =>
        prisma.performanceReview.create({
          data: {
            cycleId,
            employeeId: emp.id,
            status: "PENDING",
          },
        }),
      ),
    ]);

    await prisma.auditLog.create({
      data: {
        actorId: dbUser.id,
        action: "PERFORMANCE_CYCLE_ACTIVATED",
        entityType: "PerformanceCycle",
        entityId: cycleId,
        afterState: { reviewCount: employees.length },
      },
    });

    return NextResponse.json({ activated: true, reviewCount: employees.length });
  }

  if (action === "close") {
    await prisma.performanceCycle.update({
      where: { id: cycleId },
      data: { status: "CLOSED" },
    });

    return NextResponse.json({ closed: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
