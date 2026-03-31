import { NextResponse } from "next/server";
import { PayQueryStatus } from "@prisma/client";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;
  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  const rows = await prisma.payQuery.findMany({
    where: { employeeId: self.employee.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;
  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  let body: { subject?: string; body?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const subject = body.subject?.trim();
  const text = body.body?.trim();
  if (!subject || !text || text.length < 5) {
    return NextResponse.json({ error: "subject and body (min 5 chars) required" }, { status: 400 });
  }

  const row = await prisma.payQuery.create({
    data: {
      companyId: self.employee.companyId,
      employeeId: self.employee.id,
      subject,
      body: text,
      status: PayQueryStatus.OPEN,
    },
  });
  return NextResponse.json(row, { status: 201 });
}
