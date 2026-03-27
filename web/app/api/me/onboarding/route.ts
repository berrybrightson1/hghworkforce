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
    return NextResponse.json(null);
  }

  const onboarding = await prisma.employeeOnboarding.findFirst({
    where: { employeeId: employee.id },
    orderBy: { createdAt: "desc" },
    include: {
      tasks: { orderBy: { dueDate: "asc" } },
    },
  });

  return NextResponse.json(onboarding);
}
