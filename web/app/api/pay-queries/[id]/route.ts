import { NextRequest, NextResponse } from "next/server";
import { PayQueryStatus, PortalNotificationType } from "@prisma/client";
import { canAccessCompany, canManage, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { notifyEmployeeInApp } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  let body: { status?: string; responseBody?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const row = await prisma.payQuery.findUnique({
    where: { id },
    include: { employee: { select: { companyId: true, id: true } } },
  });
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const billing = await gateCompanyBilling(auth.dbUser, row.companyId);
  if (billing) return billing;
  if (!canManage(auth.dbUser.role) || !canAccessCompany(auth.dbUser, row.companyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hasReply = !!(body.responseBody !== undefined && String(body.responseBody).trim());

  let nextStatus = row.status;
  if (body.status === "RESOLVED") nextStatus = PayQueryStatus.RESOLVED;
  if (body.status === "IN_PROGRESS") nextStatus = PayQueryStatus.IN_PROGRESS;

  const updated = await prisma.payQuery.update({
    where: { id },
    data: {
      status: nextStatus,
      ...(body.responseBody !== undefined ? { responseBody: body.responseBody.trim() || null } : {}),
      ...(hasReply
        ? {
            respondedById: auth.dbUser.id,
            respondedAt: new Date(),
          }
        : {}),
    },
  });

  if (body.responseBody?.trim()) {
    await notifyEmployeeInApp(
      row.employeeId,
      row.companyId,
      PortalNotificationType.PAY_QUERY_UPDATE,
      "Pay query update",
      body.responseBody.trim().slice(0, 400),
      "/portal/pay-queries",
    );
  }

  return NextResponse.json(updated);
}
