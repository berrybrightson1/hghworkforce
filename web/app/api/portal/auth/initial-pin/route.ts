import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { EmployeeStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { signPortalJwt } from "@/lib/portal-jwt";
import { setPortalSessionCookie } from "@/lib/portal-cookie";

const bodySchema = z.object({
  employeeCode: z.string().min(1),
  newPin: z.string().regex(/^\d{4}$/),
  confirmPin: z.string().regex(/^\d{4}$/),
});

const GENERIC_ERROR = "Unable to create a PIN. Check your employee code or contact HR.";

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
  if (!parsed.success || parsed.data.newPin !== parsed.data.confirmPin) {
    return NextResponse.json({ error: "PINs must match and be 4 digits" }, { status: 400 });
  }

  const employeeCode = normalizeCode(parsed.data.employeeCode);

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
      temporaryPin: true,
      portalPin: true,
    },
  });

  if (!employee || !employee.portalEnabled) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  if (employee.portalLockedUntil && employee.portalLockedUntil > new Date()) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  if (employee.portalPin || employee.temporaryPin) {
    return NextResponse.json(
      {
        error:
          "This code already has a PIN. Sign in below, or use Forgot PIN if you need a reset from HR.",
      },
      { status: 409 },
    );
  }

  const hash = await bcrypt.hash(parsed.data.newPin, 10);
  const tenantId = employee.companyId;

  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      portalPin: hash,
      temporaryPin: null,
      portalFailedAttempts: 0,
      portalLockedUntil: null,
      pinChangedAt: new Date(),
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
      requiresPinChange: false,
    });
  } catch {
    return NextResponse.json({ error: "Portal sign-in is not configured" }, { status: 500 });
  }

  const res = NextResponse.json({ ok: true, redirect: "/portal" });
  setPortalSessionCookie(res, token);
  return res;
}
