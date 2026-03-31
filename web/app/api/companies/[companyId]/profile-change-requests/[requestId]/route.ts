import { NextRequest, NextResponse } from "next/server";
import {
  PortalNotificationType,
  ProfileChangeRequestStatus,
  Prisma,
} from "@prisma/client";
import { canManage, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { notifyEmployeeInApp } from "@/lib/notify";
import { prisma } from "@/lib/prisma";

type ChangeItem = { field: string; proposedValue: string };

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ companyId: string; requestId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { companyId, requestId } = await ctx.params;
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;
  if (!canManage(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { status: "APPROVED" | "REJECTED"; reviewerNote?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reqRow = await prisma.profileChangeRequest.findFirst({
    where: { id: requestId, companyId },
  });
  if (!reqRow || reqRow.status !== ProfileChangeRequestStatus.PENDING) {
    return NextResponse.json({ error: "Not found or not pending" }, { status: 400 });
  }

  if (body.status === "REJECTED") {
    const u = await prisma.profileChangeRequest.update({
      where: { id: requestId },
      data: {
        status: ProfileChangeRequestStatus.REJECTED,
        reviewerNote: body.reviewerNote?.trim() || null,
        decidedById: auth.dbUser.id,
        decidedAt: new Date(),
      },
    });
    await notifyEmployeeInApp(
      reqRow.employeeId,
      companyId,
      PortalNotificationType.PROFILE_REQUEST_DECIDED,
      "Profile change request declined",
      body.reviewerNote?.trim() || "Your profile change request was not approved.",
      "/portal/profile-requests",
    );
    return NextResponse.json(u);
  }

  const changes = reqRow.changesJson as unknown as ChangeItem[];
  const data: Prisma.EmployeeUpdateInput = {};
  for (const c of changes) {
    const v = c.proposedValue?.trim();
    if (!v) continue;
    switch (c.field) {
      case "name":
        data.name = v;
        break;
      case "department":
        data.department = v;
        break;
      case "jobTitle":
        data.jobTitle = v;
        break;
      case "nokName":
        data.nokName = v;
        break;
      case "nokPhone":
        data.nokPhone = v;
        break;
      case "nokRelationship":
        data.nokRelationship = v;
        break;
      default:
        break;
    }
  }

  await prisma.$transaction([
    prisma.employee.update({
      where: { id: reqRow.employeeId },
      data,
    }),
    prisma.profileChangeRequest.update({
      where: { id: requestId },
      data: {
        status: ProfileChangeRequestStatus.APPROVED,
        reviewerNote: body.reviewerNote?.trim() || null,
        decidedById: auth.dbUser.id,
        decidedAt: new Date(),
      },
    }),
  ]);

  await notifyEmployeeInApp(
    reqRow.employeeId,
    companyId,
    PortalNotificationType.PROFILE_REQUEST_DECIDED,
    "Profile update approved",
    "Your requested profile changes were applied to your HR record.",
    "/portal/profile-requests",
  );

  return NextResponse.json({ ok: true });
}
