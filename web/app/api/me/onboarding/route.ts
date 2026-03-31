import { NextResponse } from "next/server";
import { requireEmployeeSelf } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;

  const onboarding = await prisma.employeeOnboarding.findFirst({
    where: { employeeId: self.employee.id },
    orderBy: { createdAt: "desc" },
    include: {
      tasks: { orderBy: { dueDate: "asc" } },
    },
  });

  return NextResponse.json(onboarding);
}
