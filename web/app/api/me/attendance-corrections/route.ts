import { NextResponse } from "next/server";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/** Correction requests submitted by this employee. */
export async function GET() {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;

  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  try {
    const rows = await prisma.attendanceCorrectionRequest.findMany({
      where: { employeeId: self.employee.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        checkIn: { select: { id: true, clockIn: true, clockOut: true } },
      },
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
