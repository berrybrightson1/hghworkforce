import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const companyId = req.nextUrl.searchParams.get("companyId");
    const loans = await prisma.loan.findMany({
      where: companyId ? { employee: { companyId } } : {},
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
    return NextResponse.json(loans);
  } catch {
    return NextResponse.json({ error: "Failed to load loans" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const loan = await prisma.loan.create({
      data: {
        employeeId: body.employeeId,
        type: body.type || "LOAN",
        amount: body.amount,
        balance: body.amount,
        monthlyRepayment: body.monthlyRepayment,
        disbursedAt: new Date(body.disbursedAt || Date.now()),
        note: body.note || null,
      },
    });
    return NextResponse.json(loan, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create loan" }, { status: 500 });
  }
}
