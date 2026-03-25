import { NextRequest, NextResponse } from "next/server";
import { canAccessCompany, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const companyId = searchParams.get("companyId");

    if (companyId && !canAccessCompany(auth.dbUser, companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requests = await prisma.leaveRequest.findMany({
      where: {
        ...(status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" } : {}),
        ...(companyId ? { employee: { companyId } } : {}),
      },
      include: {
        employee: {
          select: {
            employeeCode: true,
            name: true,
            jobTitle: true,
            department: true,
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(requests);
  } catch {
    return NextResponse.json({ error: "Failed to load leave requests" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();

    const employee = await prisma.employee.findUnique({
      where: { id: body.employeeId },
    });
    if (!employee || !canAccessCompany(auth.dbUser, employee.companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId: body.employeeId,
        type: body.type,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        days: body.days,
        note: body.note || null,
      },
    });
    return NextResponse.json(request, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 });
  }
}
