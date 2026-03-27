import { NextResponse } from "next/server";
import { ExitType } from "@prisma/client";
import { requireDbUser, canManage, gateCompanyBilling } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const EXIT_TYPES = new Set<string>(Object.values(ExitType));

export async function GET(req: Request) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  if (!canManage(dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("companyId") ?? dbUser.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const billing = await gateCompanyBilling(dbUser, companyId);
  if (billing) return billing;

  const rows = await prisma.exitRecord.findMany({
    where: { companyId },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true, department: true, jobTitle: true } },
      _count: { select: { clearanceItems: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  if (!canManage(dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: {
    companyId?: string;
    employeeId?: string;
    exitType?: string;
    noticeDate?: string;
    lastWorkingDay?: string;
    exitInterviewDate?: string | null;
    reason?: string | null;
    seedClearance?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { companyId, employeeId, exitType, noticeDate, lastWorkingDay } = body;
  if (!companyId || !employeeId || !exitType || !noticeDate || !lastWorkingDay) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!EXIT_TYPES.has(exitType)) {
    return NextResponse.json({ error: "Invalid exitType" }, { status: 400 });
  }

  const billing = await gateCompanyBilling(dbUser, companyId);
  if (billing) return billing;

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, companyId, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const open = await prisma.exitRecord.findFirst({
    where: {
      employeeId,
      companyId,
      status: { not: "COMPLETED" },
    },
    select: { id: true },
  });
  if (open) {
    return NextResponse.json(
      { error: "An open exit case already exists for this employee" },
      { status: 409 },
    );
  }

  const seed = body.seedClearance !== false;

  const exit = await prisma.$transaction(async (tx) => {
    const created = await tx.exitRecord.create({
      data: {
        tenantId: companyId,
        companyId,
        employeeId,
        exitType: exitType as ExitType,
        noticeDate: new Date(noticeDate),
        lastWorkingDay: new Date(lastWorkingDay),
        exitInterviewDate: body.exitInterviewDate ? new Date(body.exitInterviewDate) : null,
        reason: body.reason?.trim() || null,
        status: "INITIATED",
        createdBy: dbUser.id,
      },
    });

    if (seed) {
      await tx.exitClearanceItem.createMany({
        data: [
          { exitRecordId: created.id, department: "IT", item: "Return equipment; revoke system access" },
          { exitRecordId: created.id, department: "FINANCE", item: "Final payroll, loans, and expense settlement" },
          { exitRecordId: created.id, department: "ADMIN", item: "ID card, keys, and company property" },
          { exitRecordId: created.id, department: "MANAGER", item: "Exit interview and handover" },
        ],
      });
    }

    return created;
  });

  await prisma.auditLog.create({
    data: {
      actorId: dbUser.id,
      action: "EXIT_RECORD_CREATED",
      entityType: "ExitRecord",
      entityId: exit.id,
      afterState: { employeeId, exitType },
    },
  });

  return NextResponse.json(exit, { status: 201 });
}
