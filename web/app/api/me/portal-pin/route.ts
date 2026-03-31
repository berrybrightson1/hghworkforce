import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { cookies } from "next/headers";
import { EmployeeStatus } from "@prisma/client";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { PORTAL_COOKIE_NAME, signPortalJwt, verifyPortalJwt } from "@/lib/portal-jwt";
import { setPortalSessionCookie } from "@/lib/portal-cookie";

const bodySchema = z.object({
  currentPin: z.string().regex(/^\d{4}$/),
  newPin: z.string().regex(/^\d{4}$/),
  confirmPin: z.string().regex(/^\d{4}$/),
});

/**
 * PATCH — change portal PIN when employee already has a permanent PIN (not temp-only flow).
 */
export async function PATCH(req: Request) {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;

  let viaPortalCookie = false;
  const jar = await cookies();
  const raw = jar.get(PORTAL_COOKIE_NAME)?.value;
  if (raw) {
    const jwt = await verifyPortalJwt(raw);
    viaPortalCookie = Boolean(jwt && !jwt.requiresPinChange);
  }

  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

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
      id: self.employee.id,
      status: EmployeeStatus.ACTIVE,
      deletedAt: null,
      portalEnabled: true,
    },
    select: {
      id: true,
      companyId: true,
      portalPin: true,
      temporaryPin: true,
    },
  });

  if (!employee?.portalPin) {
    return NextResponse.json(
      { error: "Set your PIN using the onboarding link first" },
      { status: 400 },
    );
  }

  if (employee.temporaryPin) {
    return NextResponse.json({ error: "Finish changing from your temporary PIN on /portal/set-pin" }, { status: 400 });
  }

  const pinOk = await bcrypt.compare(parsed.data.currentPin, employee.portalPin);
  if (!pinOk) {
    return NextResponse.json({ error: "Current PIN is incorrect" }, { status: 401 });
  }

  if (parsed.data.currentPin === parsed.data.newPin) {
    return NextResponse.json({ error: "Choose a different new PIN" }, { status: 400 });
  }

  const hash = await bcrypt.hash(parsed.data.newPin, 10);
  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      portalPin: hash,
      pinChangedAt: new Date(),
    },
  });

  const res = NextResponse.json({ ok: true });

  if (viaPortalCookie && raw) {
    const jwt = await verifyPortalJwt(raw);
    if (jwt) {
      const token = await signPortalJwt({
        employeeId: employee.id,
        tenantId: jwt.tenantId,
        companyId: employee.companyId,
        role: "EMPLOYEE",
        requiresPinChange: false,
      });
      setPortalSessionCookie(res, token);
    }
  }

  return res;
}
