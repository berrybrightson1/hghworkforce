import { NextResponse } from "next/server";
import { z } from "zod";
import { EmployeeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  employeeCode: z.string().min(1),
});

const MESSAGE =
  "If your code is registered, your administrator has been notified to reset your PIN.";

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase();
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ message: MESSAGE });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ message: MESSAGE });
  }

  const employeeCode = normalizeCode(parsed.data.employeeCode);
  const employee = await prisma.employee.findFirst({
    where: {
      employeeCode,
      status: EmployeeStatus.ACTIVE,
      deletedAt: null,
      portalEnabled: true,
    },
    select: { id: true, companyId: true },
  });

  if (employee) {
    await prisma.pinResetRequest.create({
      data: {
        employeeId: employee.id,
        companyId: employee.companyId,
      },
    });
  }

  return NextResponse.json({ message: MESSAGE });
}
