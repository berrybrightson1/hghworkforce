import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  canAccessCompany,
  canApprovePayroll,
  canManagePayroll,
  requireDbUser,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  try {
    const payrun = await prisma.payrun.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        lines: {
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                name: true,
                department: true,
                jobTitle: true,
                user: { select: { name: true } },
              },
            },
          },
          orderBy: { id: "asc" },
        },
        _count: { select: { lines: true } },
      },
    });
    if (!payrun) {
      return NextResponse.json({ error: "Pay run not found" }, { status: 404 });
    }
    if (!canAccessCompany(auth.dbUser, payrun.companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(payrun);
  } catch {
    return NextResponse.json({ error: "Failed to load pay run" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  let body: { action?: string; rejectionNote?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;
  if (
    action !== "submit" &&
    action !== "approve" &&
    action !== "reject" &&
    action !== "reopen"
  ) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  try {
    const payrun = await prisma.payrun.findUnique({
      where: { id },
      include: { _count: { select: { lines: true } } },
    });
    if (!payrun) {
      return NextResponse.json({ error: "Pay run not found" }, { status: 404 });
    }
    if (!canAccessCompany(auth.dbUser, payrun.companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (action === "submit") {
      if (!canManagePayroll(auth.dbUser.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (payrun.status !== "DRAFT") {
        return NextResponse.json({ error: "Only draft runs can be submitted" }, { status: 400 });
      }
      if (payrun._count.lines === 0) {
        return NextResponse.json(
          { error: "Generate payroll lines before submitting" },
          { status: 400 },
        );
      }
      const updated = await prisma.payrun.update({
        where: { id },
        data: {
          status: "PENDING",
          submittedById: auth.dbUser.id,
        },
      });
      await prisma.auditLog.create({
        data: {
          actorId: auth.dbUser.id,
          action: "PAYRUN_SUBMITTED",
          entityType: "Payrun",
          entityId: id,
          afterState: { status: updated.status } as Prisma.InputJsonValue,
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "approve") {
      if (!canApprovePayroll(auth.dbUser.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (payrun.status !== "PENDING") {
        return NextResponse.json({ error: "Only pending runs can be approved" }, { status: 400 });
      }
      const now = new Date();
      const updated = await prisma.$transaction(async (tx) => {
        const up = await tx.payrun.update({
          where: { id },
          data: {
            status: "APPROVED",
            approvedById: auth.dbUser.id,
            approvedAt: now,
            lockedAt: now,
          },
        });

        // Create Payslip records for each line
        const lines = await tx.payrunLine.findMany({ where: { payrunId: id } });
        for (const line of lines) {
          await tx.payslip.upsert({
            where: { payrunLineId: line.id },
            create: {
              payrunLineId: line.id,
              employeeId: line.employeeId,
              pdfUrl: `/api/payslips/${line.id}/download`, // placeholder/dynamic link
            },
            update: {},
          });
        }
        return up;
      });

      await prisma.auditLog.create({
        data: {
          actorId: auth.dbUser.id,
          action: "PAYRUN_APPROVED",
          entityType: "Payrun",
          entityId: id,
          afterState: { status: updated.status } as Prisma.InputJsonValue,
        },
      });
      return NextResponse.json(updated);
    }

    if (action === "reject") {
      if (!canApprovePayroll(auth.dbUser.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (payrun.status !== "PENDING") {
        return NextResponse.json({ error: "Only pending runs can be rejected" }, { status: 400 });
      }
      const updated = await prisma.payrun.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectedById: auth.dbUser.id,
          rejectionNote: body.rejectionNote?.trim() || null,
        },
      });
      await prisma.auditLog.create({
        data: {
          actorId: auth.dbUser.id,
          action: "PAYRUN_REJECTED",
          entityType: "Payrun",
          entityId: id,
          afterState: {
            status: updated.status,
            rejectionNote: updated.rejectionNote,
          } as Prisma.InputJsonValue,
        },
      });
      return NextResponse.json(updated);
    }

    // reopen: REJECTED -> DRAFT
    if (!canApprovePayroll(auth.dbUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (payrun.status !== "REJECTED") {
      return NextResponse.json({ error: "Only rejected runs can be reopened" }, { status: 400 });
    }
    const updated = await prisma.payrun.update({
      where: { id },
      data: {
        status: "DRAFT",
        submittedById: null,
        rejectedById: null,
        rejectionNote: null,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "PAYRUN_REOPENED",
        entityType: "Payrun",
        entityId: id,
        afterState: { status: updated.status } as Prisma.InputJsonValue,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update pay run" }, { status: 500 });
  }
}
