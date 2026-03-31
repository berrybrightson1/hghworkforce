import { NextResponse } from "next/server";
import { requireEmployeeSelf } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;

  const reviews = await prisma.performanceReview.findMany({
    where: { employeeId: self.employee.id },
    include: {
      cycle: { select: { name: true, periodStart: true, periodEnd: true } },
      goals: { orderBy: { title: "asc" } },
    },
    orderBy: { cycle: { periodStart: "desc" } },
  });

  return NextResponse.json(reviews);
}
