import { NextRequest, NextResponse } from "next/server";
import { IPAccessRequestStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDbUser, canAccessCompany, canApprovePayroll } from "@/lib/api-auth";

/**
 * PATCH /api/ip-access-requests/[id]
 * Body: { status: "APPROVED" | "REJECTED" }
 * Company Admin / Super Admin only (not HR-only).
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (!canApprovePayroll(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: { status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const status = body.status as IPAccessRequestStatus | undefined;
  if (status !== "APPROVED" && status !== "REJECTED") {
    return NextResponse.json({ error: "status must be APPROVED or REJECTED" }, { status: 400 });
  }

  try {
    const row = await prisma.iPAccessRequest.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (row.status !== "PENDING") {
      return NextResponse.json({ error: "Request already resolved" }, { status: 409 });
    }

    if (!canAccessCompany(auth.dbUser, row.companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (auth.dbUser.role === UserRole.SUPER_ADMIN) {
      // ok
    } else if (auth.dbUser.role === UserRole.COMPANY_ADMIN && auth.dbUser.companyId === row.companyId) {
      // ok
    } else {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.iPAccessRequest.update({
        where: { id },
        data: {
          status,
          reviewedById: auth.dbUser.id,
          reviewedAt: new Date(),
        },
      });

      if (status === "APPROVED") {
        await tx.allowedIP.create({
          data: {
            companyId: row.companyId,
            address: row.requestedIp,
            label: `Approved from request ${row.id.slice(0, 8)}`,
            createdById: auth.dbUser.id,
          },
        });
      }

      return u;
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: status === "APPROVED" ? "IP_ACCESS_REQUEST_APPROVED" : "IP_ACCESS_REQUEST_REJECTED",
        entityType: "Company",
        entityId: row.companyId,
        afterState: { requestId: id, status },
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}
