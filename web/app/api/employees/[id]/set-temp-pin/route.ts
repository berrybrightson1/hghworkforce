import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  canAccessCompany,
  canManagePayroll,
  gateCompanyBilling,
  requireDbUser,
} from "@/lib/api-auth";
import { PortalNotificationType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyEmployee } from "@/lib/portal-notify";

const bodySchema = z.object({
  pin: z.string().regex(/^\d{4}$/),
});

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  if (!canManagePayroll(auth.dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id: employeeId } = await ctx.params;

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "PIN must be 4 digits" }, { status: 400 });
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, deletedAt: null },
    select: { id: true, companyId: true, name: true, employeeCode: true },
  });
  if (!employee) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!canAccessCompany(auth.dbUser, employee.companyId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const billing = await gateCompanyBilling(auth.dbUser, employee.companyId);
  if (billing) return billing;

  const hash = await bcrypt.hash(parsed.data.pin, 10);
  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      temporaryPin: hash,
      portalEnabled: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: auth.dbUser.id,
      action: "EMPLOYEE_PORTAL_TEMP_PIN_SET",
      entityType: "Employee",
      entityId: employee.id,
      afterState: { employeeCode: employee.employeeCode },
    },
  });

  await notifyEmployee(
    employee.id,
    employee.companyId,
    PortalNotificationType.PIN_RESET,
    "Temporary portal PIN",
    "Your administrator set a new temporary PIN. Sign in with your employee code, then create your own PIN.",
    "/portal/login",
  );

  return NextResponse.json({ ok: true });
}
