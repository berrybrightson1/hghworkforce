import { NextRequest, NextResponse } from "next/server";
import { requireDbUser, gateCompanyBilling } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { id: employeeId } = await ctx.params;

  try {
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true },
    });
    if (!emp) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const billing = await gateCompanyBilling(auth.dbUser, emp.companyId);
    if (billing) return billing;

    const tasks = await prisma.employeeOnboardingTask.findMany({
      where: { employeeId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  if (!["SUPER_ADMIN", "COMPANY_ADMIN", "HR"].includes(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: employeeId } = await ctx.params;
  let body: { title?: string; description?: string; sortOrder?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  try {
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { companyId: true },
    });
    if (!emp) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const billing = await gateCompanyBilling(auth.dbUser, emp.companyId);
    if (billing) return billing;

    const task = await prisma.employeeOnboardingTask.create({
      data: {
        employeeId,
        title,
        description: body.description?.trim() || null,
        sortOrder: body.sortOrder ?? 0,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
