import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { EmployeeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { signPortalJwt } from "@/lib/portal-jwt";
import { setPortalSessionCookie } from "@/lib/portal-cookie";

const bodySchema = z.object({
  employeeCode: z.string().min(1),
  pin: z.string().regex(/^\d{4}$/),
});

const GENERIC_ERROR = "Invalid employee code or PIN";

function normalizeCode(raw: string) {
  return raw.trim().toUpperCase();
}

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const employeeCode = normalizeCode(parsed.data.employeeCode);
  const pin = parsed.data.pin;

  const employee = await prisma.employee.findFirst({
    where: {
      employeeCode,
      status: EmployeeStatus.ACTIVE,
      deletedAt: null,
    },
    select: {
      id: true,
      companyId: true,
      portalEnabled: true,
      portalLockedUntil: true,
      portalFailedAttempts: true,
      temporaryPin: true,
      portalPin: true,
    },
  });

  const deny = () => NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });

  if (!employee || !employee.portalEnabled) {
    return deny();
  }

  if (employee.portalLockedUntil && employee.portalLockedUntil > new Date()) {
    return deny();
  }

  const tenantId = employee.companyId;
  let requiresPinChange = false;
  let pinOk = false;

  if (employee.temporaryPin) {
    pinOk = await bcrypt.compare(pin, employee.temporaryPin);
    if (pinOk) requiresPinChange = true;
  } else if (employee.portalPin) {
    pinOk = await bcrypt.compare(pin, employee.portalPin);
  } else {
    return deny();
  }

  if (!pinOk) {
    const attempts = employee.portalFailedAttempts + 1;
    const update: {
      portalFailedAttempts: number;
      portalLockedUntil?: Date;
    } = { portalFailedAttempts: attempts };
    if (attempts >= 5) {
      update.portalLockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    }
    await prisma.employee.update({
      where: { id: employee.id },
      data: update,
    });
    return deny();
  }

  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      portalFailedAttempts: 0,
      portalLockedUntil: null,
      portalLastLoginAt: new Date(),
    },
  });

  let token: string;
  try {
    token = await signPortalJwt({
      employeeId: employee.id,
      tenantId,
      companyId: employee.companyId,
      role: "EMPLOYEE",
      requiresPinChange,
    });
  } catch {
    return NextResponse.json({ error: "Portal sign-in is not configured" }, { status: 500 });
  }

  const res = NextResponse.json({
    ok: true,
    requiresPinChange,
    redirect: requiresPinChange ? "/portal/set-pin" : "/portal",
  });
  setPortalSessionCookie(res, token);
  return res;
}
