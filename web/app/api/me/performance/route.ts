import { NextResponse } from "next/server";
import { requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  const employee = await prisma.employee.findUnique({
    where: { userId: dbUser.id },
    select: { id: true },
  });

  if (!employee) {
    return NextResponse.json([]);
  }

  const reviews = await prisma.performanceReview.findMany({
    where: { employeeId: employee.id },
    include: {
      cycle: { select: { name: true, periodStart: true, periodEnd: true } },
      goals: { orderBy: { title: "asc" } },
    },
    orderBy: { cycle: { periodStart: "desc" } },
  });

  return NextResponse.json(reviews);
}
