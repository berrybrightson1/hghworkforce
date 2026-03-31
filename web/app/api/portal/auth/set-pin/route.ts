import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { cookies } from "next/headers";
import { EmployeeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PORTAL_COOKIE_NAME, signPortalJwt, verifyPortalJwt } from "@/lib/portal-jwt";
import { setPortalSessionCookie } from "@/lib/portal-cookie";

const bodySchema = z.object({
  newPin: z.string().regex(/^\d{4}$/),
  confirmPin: z.string().regex(/^\d{4}$/),
});

export async function PATCH(req: Request) {
  const jar = await cookies();
  const raw = jar.get(PORTAL_COOKIE_NAME)?.value;
  if (!raw) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const jwt = await verifyPortalJwt(raw);
  if (!jwt || !jwt.requiresPinChange) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success || parsed.data.newPin !== parsed.data.confirmPin) {
    return NextResponse.json({ error: "PINs must match and be 4 digits" }, { status: 400 });
  }

  const employee = await prisma.employee.findFirst({
    where: {
      id: jwt.employeeId,
      companyId: jwt.companyId,
      status: EmployeeStatus.ACTIVE,
      deletedAt: null,
      portalEnabled: true,
    },
  });
  if (!employee) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hash = await bcrypt.hash(parsed.data.newPin, 10);
  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      portalPin: hash,
      temporaryPin: null,
      pinChangedAt: new Date(),
    },
  });

  const token = await signPortalJwt({
    employeeId: employee.id,
    tenantId: jwt.tenantId,
    companyId: employee.companyId,
    role: "EMPLOYEE",
    requiresPinChange: false,
  });

  const res = NextResponse.json({ ok: true, redirect: "/portal" });
  setPortalSessionCookie(res, token);
  return res;
}
