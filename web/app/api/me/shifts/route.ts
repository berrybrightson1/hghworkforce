import { NextResponse } from "next/server";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/** Current shift assignments (no end date) for the signed-in employee. */
export async function GET() {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;

  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  try {
    const assignments = await prisma.shiftAssignment.findMany({
      where: {
        employeeId: self.employee.id,
        endDate: null,
      },
      include: {
        shift: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
            breakMinutes: true,
            status: true,
          },
        },
      },
      orderBy: { startDate: "asc" },
    });
    return NextResponse.json(assignments);
  } catch {
    return NextResponse.json({ error: "Failed to load schedule" }, { status: 500 });
  }
}
