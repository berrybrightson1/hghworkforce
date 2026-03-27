import { NextResponse } from "next/server";
import { ExitClearanceDepartment, ExitClearanceStatus, ExitStatus } from "@prisma/client";
import { requireDbUser, canManage, gateCompanyBilling } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const EXIT_STATUSES = new Set<string>(Object.values(ExitStatus));
const CLEARANCE_DEPARTMENTS = new Set<string>(Object.values(ExitClearanceDepartment));
const CLEARANCE_STATUSES = new Set<string>(Object.values(ExitClearanceStatus));

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ exitId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  if (!canManage(dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { exitId } = await ctx.params;

  const row = await prisma.exitRecord.findUnique({
    where: { id: exitId },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
          department: true,
          jobTitle: true,
          status: true,
          user: { select: { email: true, name: true } },
        },
      },
      clearanceItems: { orderBy: { department: "asc" } },
    },
  });

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const billing = await gateCompanyBilling(dbUser, row.companyId);
  if (billing) return billing;

  return NextResponse.json(row);
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ exitId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  if (!canManage(dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { exitId } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const exit = await prisma.exitRecord.findUnique({
    where: { id: exitId },
    select: { id: true, companyId: true, employeeId: true, status: true },
  });
  if (!exit) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const billing = await gateCompanyBilling(dbUser, exit.companyId);
  if (billing) return billing;

  const action = typeof body.action === "string" ? body.action : null;

  if (action === "add-clearance-item") {
    const department = body.department as string;
    const item = typeof body.item === "string" ? body.item.trim() : "";
    if (!CLEARANCE_DEPARTMENTS.has(department) || !item) {
      return NextResponse.json({ error: "Invalid department or item" }, { status: 400 });
    }
    const created = await prisma.exitClearanceItem.create({
      data: {
        exitRecordId: exitId,
        department: department as ExitClearanceDepartment,
        item,
        assignedTo: typeof body.assignedTo === "string" ? body.assignedTo : null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  }

  if (action === "update-clearance-item") {
    const itemId = typeof body.itemId === "string" ? body.itemId : "";
    const status = body.status as string;
    if (!itemId || !CLEARANCE_STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid itemId or status" }, { status: 400 });
    }
    const line = await prisma.exitClearanceItem.findFirst({
      where: { id: itemId, exitRecordId: exitId },
    });
    if (!line) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const now = new Date();
    const cleared = status === "CLEARED";
    const updated = await prisma.exitClearanceItem.update({
      where: { id: itemId },
      data: {
        status: status as ExitClearanceStatus,
        note: typeof body.note === "string" ? body.note : null,
        clearedAt: cleared ? now : null,
        clearedBy: cleared ? dbUser.id : null,
      },
    });
    return NextResponse.json(updated);
  }

  const data: {
    reason?: string | null;
    noticeDate?: Date;
    lastWorkingDay?: Date;
    exitInterviewDate?: Date | null;
    status?: ExitStatus;
    finalPayrunId?: string | null;
  } = {};

  if (typeof body.reason === "string") data.reason = body.reason;
  if (typeof body.noticeDate === "string") data.noticeDate = new Date(body.noticeDate);
  if (typeof body.lastWorkingDay === "string") data.lastWorkingDay = new Date(body.lastWorkingDay);
  if (body.exitInterviewDate === null) data.exitInterviewDate = null;
  if (typeof body.exitInterviewDate === "string") data.exitInterviewDate = new Date(body.exitInterviewDate);
  if (typeof body.status === "string" && EXIT_STATUSES.has(body.status)) {
    data.status = body.status as ExitStatus;
  }
  if (typeof body.finalPayrunId === "string") data.finalPayrunId = body.finalPayrunId;
  if (body.finalPayrunId === null) data.finalPayrunId = null;

  if (Object.keys(data).length > 0) {
    await prisma.exitRecord.update({
      where: { id: exitId },
      data,
    });
  }

  const statusCompleted =
    data.status === "COMPLETED" ||
    (typeof body.status === "string" && body.status === "COMPLETED");
  if (body.syncEmployeeTerminated === true && statusCompleted) {
    await prisma.employee.update({
      where: { id: exit.employeeId },
      data: { status: "TERMINATED", deletedAt: new Date() },
    });
  }

  const full = await prisma.exitRecord.findUnique({
    where: { id: exitId },
    include: {
      employee: {
        select: {
          id: true,
          name: true,
          employeeCode: true,
          department: true,
          jobTitle: true,
          status: true,
          user: { select: { email: true, name: true } },
        },
      },
      clearanceItems: { orderBy: { department: "asc" } },
    },
  });

  if (Object.keys(data).length > 0) {
    await prisma.auditLog.create({
      data: {
        actorId: dbUser.id,
        action: "EXIT_RECORD_UPDATED",
        entityType: "ExitRecord",
        entityId: exitId,
        afterState: { fields: Object.keys(data) },
      },
    });
  }

  return NextResponse.json(full);
}
