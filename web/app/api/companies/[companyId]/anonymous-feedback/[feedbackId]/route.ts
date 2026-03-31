import { NextRequest, NextResponse } from "next/server";
import { AnonymousFeedbackStatus } from "@prisma/client";
import { canManage, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ companyId: string; feedbackId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { companyId, feedbackId } = await ctx.params;
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;
  if (!canManage(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { status?: string; internalNote?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ex = await prisma.anonymousFeedback.findFirst({
    where: { id: feedbackId, companyId },
  });
  if (!ex) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const st =
    body.status === "ARCHIVED"
      ? AnonymousFeedbackStatus.ARCHIVED
      : body.status === "REVIEWED"
        ? AnonymousFeedbackStatus.REVIEWED
        : ex.status;

  const row = await prisma.anonymousFeedback.update({
    where: { id: feedbackId },
    data: {
      status: st,
      reviewedById: auth.dbUser.id,
      reviewedAt: new Date(),
      ...(body.internalNote !== undefined ? { internalNote: body.internalNote || null } : {}),
    },
  });
  return NextResponse.json(row);
}
