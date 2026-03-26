import { NextRequest, NextResponse } from "next/server";
import { gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string; taskId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  if (!["SUPER_ADMIN", "COMPANY_ADMIN", "HR"].includes(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: employeeId, taskId } = await ctx.params;
  let body: { completed?: boolean; title?: string; sortOrder?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const task = await prisma.employeeOnboardingTask.findUnique({
      where: { id: taskId },
    });
    if (!task || task.employeeId !== employeeId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true },
    });
    if (!emp) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const patchTaskBill = await gateCompanyBilling(auth.dbUser, emp.companyId);
    if (patchTaskBill) return patchTaskBill;

    const data: {
      completed?: boolean;
      completedAt?: Date | null;
      title?: string;
      sortOrder?: number;
    } = {};
    if (body.completed !== undefined) {
      data.completed = body.completed;
      data.completedAt = body.completed ? new Date() : null;
    }
    if (body.title !== undefined) data.title = body.title.trim();
    if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;

    const updated = await prisma.employeeOnboardingTask.update({
      where: { id: taskId },
      data,
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; taskId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  if (!["SUPER_ADMIN", "COMPANY_ADMIN", "HR"].includes(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: employeeId, taskId } = await ctx.params;
  try {
    const task = await prisma.employeeOnboardingTask.findUnique({
      where: { id: taskId },
    });
    if (!task || task.employeeId !== employeeId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true },
    });
    if (!emp) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const delBill = await gateCompanyBilling(auth.dbUser, emp.companyId);
    if (delBill) return delBill;

    await prisma.employeeOnboardingTask.delete({ where: { id: taskId } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
