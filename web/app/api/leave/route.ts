import { NextRequest, NextResponse } from "next/server";
import {
  canAccessCompany,
  gateCompanyBilling,
  gateBillingForEmployeeSelf,
  requireDbUser,
  requireEmployeeSelf,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status");
    const companyId = searchParams.get("companyId");
    const employeeId = searchParams.get("employeeId");

    const self = await requireEmployeeSelf();
    if (self.ok) {
      const targetId = employeeId ?? self.employee.id;
      if (employeeId && employeeId !== self.employee.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (companyId && companyId !== self.employee.companyId) {
        return NextResponse.json({ error: "Company mismatch" }, { status: 400 });
      }
      const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
      if (billing) return billing;

      const requests = await prisma.leaveRequest.findMany({
        where: {
          ...(status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" } : {}),
          employeeId: targetId,
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
    }

    const auth = await requireDbUser();
    if (!auth.ok) return auth.response;

    if (!companyId && !employeeId) {
      return NextResponse.json(
        { error: "companyId or employeeId is required" },
        { status: 400 },
      );
    }

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
    } else if (companyId) {
      const lb = await gateCompanyBilling(auth.dbUser, companyId);
      if (lb) return lb;
    }

    const requests = await prisma.leaveRequest.findMany({
      where: {
        ...(status ? { status: status as "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" } : {}),
        ...(employeeId
          ? { employeeId }
          : { employee: { companyId: companyId! } }),
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
  try {
    const body = await req.json();

    const self = await requireEmployeeSelf();
    let resolvedEmployeeId: string;

    if (self.ok) {
      if (body.employeeId !== self.employee.id) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const leaveBill = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
      if (leaveBill) return leaveBill;
      resolvedEmployeeId = self.employee.id;
    } else {
      const auth = await requireDbUser();
      if (!auth.ok) return auth.response;

      const target = await prisma.employee.findUnique({
        where: { id: body.employeeId },
      });
      if (!target) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }
      const leaveBill = await gateCompanyBilling(auth.dbUser, target.companyId);
      if (leaveBill) return leaveBill;

      if (auth.dbUser.role === "EMPLOYEE") {
        const mine = await prisma.employee.findUnique({
          where: { userId: auth.dbUser.id },
          select: { id: true },
        });
        if (mine?.id !== body.employeeId) {
          return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
      }
      resolvedEmployeeId = target.id;
    }

    const request = await prisma.leaveRequest.create({
      data: {
        employeeId: resolvedEmployeeId,
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
