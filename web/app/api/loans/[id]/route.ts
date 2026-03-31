import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { LoanStatus, PortalNotificationType, Prisma } from "@prisma/client";
import { canAccessCompany, canManagePayroll, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { notifyEmployeeInApp } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  status: z.enum(["ACTIVE", "CANCELLED"]),
  amount: z.coerce.number().positive().optional(),
  monthlyRepayment: z.coerce.number().positive().optional(),
  rejectionNote: z.string().max(500).optional(),
});

/**
 * PATCH — approve (ACTIVE) or reject (CANCELLED) a PENDING loan request (HR / payroll admin).
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (!canManagePayroll(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: z.infer<typeof patchSchema>;
  try {
    body = patchSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    const loan = await prisma.loan.findUnique({
      where: { id },
      include: {
        employee: { select: { id: true, companyId: true, employeeCode: true, name: true } },
      },
    });
    if (!loan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const billing = await gateCompanyBilling(auth.dbUser, loan.employee.companyId);
    if (billing) return billing;

    if (!canAccessCompany(auth.dbUser, loan.employee.companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (loan.status !== LoanStatus.PENDING) {
      return NextResponse.json({ error: "Only pending requests can be reviewed" }, { status: 400 });
    }

    const tenantId = loan.employee.companyId;

    if (body.status === "CANCELLED") {
      const updated = await prisma.loan.update({
        where: { id },
        data: {
          status: LoanStatus.CANCELLED,
          note:
            body.rejectionNote?.trim()
              ? `${loan.note ? `${loan.note}\n` : ""}[Rejected] ${body.rejectionNote.trim()}`
              : loan.note,
        },
      });

      await prisma.auditLog.create({
        data: {
          actorId: auth.dbUser.id,
          action: "LOAN_REQUEST_REJECTED",
          entityType: "Loan",
          entityId: id,
          afterState: { status: updated.status } as Prisma.InputJsonValue,
        },
      });

      await notifyEmployeeInApp(
        loan.employeeId,
        tenantId,
        PortalNotificationType.LOAN_REJECTED,
        "Loan / advance request declined",
        `Your ${loan.type} request for GHS ${Number(loan.amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })} was not approved.${body.rejectionNote?.trim() ? ` ${body.rejectionNote.trim()}` : ""}`,
        "/portal/loans",
      );

      return NextResponse.json(updated);
    }

    const amount = body.amount ?? loan.amount;
    const monthlyRepayment = body.monthlyRepayment ?? loan.monthlyRepayment;

    const updated = await prisma.loan.update({
      where: { id },
      data: {
        status: LoanStatus.ACTIVE,
        amount,
        balance: amount,
        monthlyRepayment,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "LOAN_REQUEST_APPROVED",
        entityType: "Loan",
        entityId: id,
        afterState: { status: updated.status } as Prisma.InputJsonValue,
      },
    });

    await notifyEmployeeInApp(
      loan.employeeId,
      tenantId,
      PortalNotificationType.LOAN_APPROVED,
      "Loan / advance approved",
      `Your ${loan.type} of GHS ${Number(amount).toLocaleString("en-GH", { minimumFractionDigits: 2 })} is active. Monthly repayment: GHS ${Number(monthlyRepayment).toLocaleString("en-GH", { minimumFractionDigits: 2 })}.`,
      "/portal/loans",
    );

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
