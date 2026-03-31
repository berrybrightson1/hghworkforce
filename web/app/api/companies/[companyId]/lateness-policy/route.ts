import { NextRequest, NextResponse } from "next/server";
import { canManage, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { companyId } = await ctx.params;
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;
  if (!canManage(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pol = await prisma.latenessPolicy.findUnique({ where: { companyId } });
  return NextResponse.json(
    pol ?? {
      companyId,
      graceMinutes: 5,
      lateInstancesBeforeWarning: null,
      warningLetterBodyTemplate: null,
    },
  );
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { companyId } = await ctx.params;
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;
  if (!canManage(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    graceMinutes?: number;
    lateInstancesBeforeWarning?: number | null;
    warningLetterBodyTemplate?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updated = await prisma.latenessPolicy.upsert({
    where: { companyId },
    create: {
      companyId,
      graceMinutes: body.graceMinutes ?? 5,
      lateInstancesBeforeWarning: body.lateInstancesBeforeWarning ?? null,
      warningLetterBodyTemplate: body.warningLetterBodyTemplate ?? null,
    },
    update: {
      ...(body.graceMinutes !== undefined ? { graceMinutes: body.graceMinutes } : {}),
      ...(body.lateInstancesBeforeWarning !== undefined
        ? { lateInstancesBeforeWarning: body.lateInstancesBeforeWarning }
        : {}),
      ...(body.warningLetterBodyTemplate !== undefined
        ? { warningLetterBodyTemplate: body.warningLetterBodyTemplate }
        : {}),
    },
  });
  return NextResponse.json(updated);
}
