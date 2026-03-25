import { NextRequest, NextResponse } from "next/server";
import { requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  try {
    const employee = await prisma.employee.findUnique({
      where: { userId: auth.dbUser.id },
    });

    if (!employee) {
      return NextResponse.json([]);
    }

    const payslips = await prisma.payslip.findMany({
      where: { employeeId: employee.id },
      include: {
        payrunLine: {
          include: {
            payrun: {
              select: { periodStart: true, periodEnd: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(payslips);
  } catch {
    return NextResponse.json({ error: "Failed to load payslips" }, { status: 500 });
  }
}
