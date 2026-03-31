import { NextResponse } from "next/server";
import { z } from "zod";
import { LoanStatus } from "@prisma/client";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  type: z.enum(["LOAN", "ADVANCE"]),
  amount: z.coerce.number().positive(),
  monthlyRepayment: z.coerce.number().positive(),
  note: z.string().max(500).optional(),
});

/** POST — employee submits a loan/advance request (PENDING until HR approves). */
export async function POST(req: Request) {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;

  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { type, amount, monthlyRepayment, note } = parsed.data;

  try {
    const loan = await prisma.loan.create({
      data: {
        employeeId: self.employee.id,
        type,
        amount,
        balance: amount,
        monthlyRepayment,
        disbursedAt: new Date(),
        status: LoanStatus.PENDING,
        note: note?.trim() || null,
      },
    });
    return NextResponse.json(loan, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to submit request" }, { status: 500 });
  }
}
