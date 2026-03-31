import { NextResponse } from "next/server";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;
  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  let body: { message?: string; category?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const message = body.message?.trim();
  if (!message || message.length < 10) {
    return NextResponse.json({ error: "message min 10 characters" }, { status: 400 });
  }

  await prisma.anonymousFeedback.create({
    data: {
      companyId: self.employee.companyId,
      message,
      category: body.category?.trim() || null,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
