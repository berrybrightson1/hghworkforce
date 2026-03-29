import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import {
  canAccessCompany,
  canManagePayroll,
  gateCompanyBilling,
  requireDbUser,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  try {
    const companyId = req.nextUrl.searchParams.get("companyId");
    const employeeId = req.nextUrl.searchParams.get("employeeId");

    if (!companyId && !employeeId) {
      return NextResponse.json(
        { error: "companyId or employeeId is required" },
        { status: 400 },
      );
    }

    let where: Prisma.LoanWhereInput;

    if (employeeId) {
      const emp = await prisma.employee.findFirst({
        where: { id: employeeId, deletedAt: null },
        select: { companyId: true, userId: true },
      });
      if (!emp) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }
      if (companyId && companyId !== emp.companyId) {
        return NextResponse.json({ error: "Company mismatch" }, { status: 400 });
      }
      const billing = await gateCompanyBilling(auth.dbUser, emp.companyId);
      if (billing) return billing;
      const allowed =
        canAccessCompany(auth.dbUser, emp.companyId) || emp.userId === auth.dbUser.id;
      if (!allowed) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      where = { employeeId };
    } else {
      const billing = await gateCompanyBilling(auth.dbUser, companyId!);
      if (billing) return billing;
      where = { employee: { companyId: companyId! } };
    }

    const loans = await prisma.loan.findMany({
      where,
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
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (!canManagePayroll(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const employeeId = body.employeeId as string | undefined;
    if (!employeeId) {
      return NextResponse.json({ error: "employeeId is required" }, { status: 400 });
    }

    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, deletedAt: null },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const billing = await gateCompanyBilling(auth.dbUser, employee.companyId);
    if (billing) return billing;

    if (!canAccessCompany(auth.dbUser, employee.companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const loan = await prisma.loan.create({
      data: {
        employeeId,
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
