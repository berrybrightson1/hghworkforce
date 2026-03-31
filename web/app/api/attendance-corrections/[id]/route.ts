import { NextRequest, NextResponse } from "next/server";
import { PortalNotificationType, Prisma } from "@prisma/client";
import { canManageCheckinSecurity, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { notifyEmployeeInApp } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  if (!canManageCheckinSecurity(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;
  let body: { status?: "APPROVED" | "REJECTED"; reviewNote?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.status !== "APPROVED" && body.status !== "REJECTED") {
    return NextResponse.json({ error: "status must be APPROVED or REJECTED" }, { status: 400 });
  }

  try {
    const row = await prisma.attendanceCorrectionRequest.findUnique({
      where: { id },
      include: { checkIn: true },
    });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const billing = await gateCompanyBilling(auth.dbUser, row.companyId);
    if (billing) return billing;

    if (row.status !== "PENDING") {
      return NextResponse.json({ error: "Already resolved" }, { status: 400 });
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.attendanceCorrectionRequest.update({
        where: { id },
        data: {
          status: body.status,
          reviewedById: auth.dbUser.id,
          reviewedAt: now,
          reviewNote: body.reviewNote?.trim() || null,
        },
      });

      if (body.status === "APPROVED") {
        const clockIn = row.proposedClockIn ?? row.checkIn.clockIn;
        const clockOut = row.proposedClockOut ?? row.checkIn.clockOut;
        const patch: Prisma.CheckInUpdateInput = {
          clockIn,
          clockOut,
          status: clockOut ? "CLOCKED_OUT" : "CLOCKED_IN",
        };
        if (clockIn && clockOut && clockOut > clockIn) {
          const ms = clockOut.getTime() - clockIn.getTime();
          patch.hoursWorked = new Prisma.Decimal((Math.round((ms / 36e5) * 100) / 100).toFixed(2));
        }
        await tx.checkIn.update({
          where: { id: row.checkInId },
          data: patch,
        });
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: `ATTENDANCE_CORRECTION_${body.status}`,
        entityType: "AttendanceCorrectionRequest",
        entityId: id,
        afterState: { checkInId: row.checkInId } as Prisma.InputJsonValue,
      },
    });

    const tenantId = row.companyId;
    if (body.status === "APPROVED") {
      await notifyEmployeeInApp(
        row.employeeId,
        tenantId,
        PortalNotificationType.QUERY_RESPONDED,
        "Attendance correction approved",
        "Your requested change to your check-in times was approved." +
          (body.reviewNote?.trim() ? ` Note: ${body.reviewNote.trim()}` : ""),
        "/portal/corrections",
      );
    } else {
      await notifyEmployeeInApp(
        row.employeeId,
        tenantId,
        PortalNotificationType.QUERY_RESPONDED,
        "Attendance correction declined",
        "Your requested change to your check-in times was not approved." +
          (body.reviewNote?.trim() ? ` Note: ${body.reviewNote.trim()}` : ""),
        "/portal/corrections",
      );
    }

    const updated = await prisma.attendanceCorrectionRequest.findUnique({ where: { id } });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
