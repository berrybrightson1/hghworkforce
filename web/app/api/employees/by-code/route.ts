import { NextRequest, NextResponse } from "next/server";
import {
  canAccessCompany,
  canManagePayroll,
  gateCompanyBilling,
  requireDbUser,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * DELETE /api/employees/by-code?companyId=&code=
 * Soft-delete (terminate) the active employee with this payroll code in the company.
 * Payroll staff only (same as row delete).
 */
export async function DELETE(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const companyId = req.nextUrl.searchParams.get("companyId");
  const codeRaw = req.nextUrl.searchParams.get("code");
  if (!companyId?.trim() || !codeRaw?.trim()) {
    return NextResponse.json({ error: "companyId and code are required" }, { status: 400 });
  }
  const code = codeRaw.trim();

  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  const inCompany = canAccessCompany(auth.dbUser, companyId);
  const isPayrollStaff = canManagePayroll(auth.dbUser.role) && inCompany;
  if (!isPayrollStaff) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const employee = await prisma.employee.findFirst({
      where: {
        companyId,
        deletedAt: null,
        employeeCode: { equals: code, mode: "insensitive" },
      },
      select: { id: true, employeeCode: true, name: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "No active employee with that code in this company" }, { status: 404 });
    }

    await prisma.employee.update({
      where: { id: employee.id },
      data: { deletedAt: new Date(), status: "TERMINATED" },
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "EMPLOYEE_DELETED",
        entityType: "Employee",
        entityId: employee.id,
      },
    });

    return NextResponse.json({
      success: true,
      id: employee.id,
      employeeCode: employee.employeeCode,
    });
  } catch (e) {
    console.error("[employees by-code DELETE]", e);
    return NextResponse.json({ error: "Failed to remove employee" }, { status: 500 });
  }
}
