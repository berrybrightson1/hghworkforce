import { NextRequest, NextResponse } from "next/server";
import { PortalNotificationType, Prisma } from "@prisma/client";
import { canManageLeave, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { notifyEmployeeInApp } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  if (!canManageLeave(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  let body: { status?: string; rejectionNote?: string; approvalNote?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status !== "APPROVED" && body.status !== "REJECTED") {
    return NextResponse.json({ error: "status must be APPROVED or REJECTED" }, { status: 400 });
  }

  try {
    const lr = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: { select: { companyId: true, employeeCode: true, name: true } },
      },
    });
    if (!lr) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 });
    }
    const billing = await gateCompanyBilling(auth.dbUser, lr.employee.companyId);
    if (billing) return billing;

    if (lr.status !== "PENDING") {
      return NextResponse.json({ error: "Only pending requests can be updated" }, { status: 400 });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: body.status,
        approvedById: auth.dbUser.id,
        approvedAt: body.status === "APPROVED" ? new Date() : null,
        rejectionNote: body.status === "REJECTED" ? body.rejectionNote?.trim() || null : null,
        approvalNote: body.status === "APPROVED" ? body.approvalNote?.trim() || null : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: `LEAVE_${body.status}`,
        entityType: "LeaveRequest",
        entityId: id,
        afterState: { status: updated.status } as Prisma.InputJsonValue,
      },
    });

    const tenantId = lr.employee.companyId;
    const periodLabel = `${updated.startDate.toISOString().slice(0, 10)} → ${updated.endDate.toISOString().slice(0, 10)}`;
    if (body.status === "APPROVED") {
      await notifyEmployeeInApp(
        lr.employeeId,
        tenantId,
        PortalNotificationType.LEAVE_APPROVED,
        "Leave approved",
        `Your ${updated.type} leave (${periodLabel}) was approved.`,
        "/portal/leave",
      );
    } else {
      await notifyEmployeeInApp(
        lr.employeeId,
        tenantId,
        PortalNotificationType.LEAVE_REJECTED,
        "Leave not approved",
        `Your ${updated.type} leave (${periodLabel}) was rejected.${updated.rejectionNote ? ` Note: ${updated.rejectionNote}` : ""}`,
        "/portal/leave",
      );
    }

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 });
  }
}
