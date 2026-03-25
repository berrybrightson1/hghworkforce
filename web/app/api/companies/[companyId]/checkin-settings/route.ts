import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDbUser, canAccessCompany, canManageCheckinSecurity } from "@/lib/api-auth";

/**
 * GET /api/companies/[companyId]/checkin-settings
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const { companyId } = await ctx.params;
  if (!canAccessCompany(auth.dbUser, companyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canManageCheckinSecurity(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        checkinEnterpriseEnabled: true,
        checkinEnforceIpAllowlist: true,
        checkinRequireFaceVerification: true,
        checkinFaceDistanceThreshold: true,
        checkinMaxFaceAttempts: true,
        allowedIps: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            label: true,
            address: true,
            createdAt: true,
          },
        },
      },
    });
    if (!company) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({
      ...company,
      checkinFaceDistanceThreshold: company.checkinFaceDistanceThreshold
        ? Number(company.checkinFaceDistanceThreshold)
        : null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

/**
 * PATCH /api/companies/[companyId]/checkin-settings
 * Body: checkinEnterpriseEnabled?, checkinEnforceIpAllowlist?, checkinRequireFaceVerification?,
 *       checkinFaceDistanceThreshold? (number), checkinMaxFaceAttempts? (number)
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const { companyId } = await ctx.params;
  if (!canAccessCompany(auth.dbUser, companyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!canManageCheckinSecurity(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Prisma.CompanyUpdateInput = {};

  if (typeof body.checkinEnterpriseEnabled === "boolean") {
    data.checkinEnterpriseEnabled = body.checkinEnterpriseEnabled;
  }
  if (typeof body.checkinEnforceIpAllowlist === "boolean") {
    data.checkinEnforceIpAllowlist = body.checkinEnforceIpAllowlist;
  }
  if (typeof body.checkinRequireFaceVerification === "boolean") {
    data.checkinRequireFaceVerification = body.checkinRequireFaceVerification;
  }
  if (body.checkinMaxFaceAttempts !== undefined) {
    const n = Number(body.checkinMaxFaceAttempts);
    if (!Number.isInteger(n) || n < 1 || n > 20) {
      return NextResponse.json({ error: "checkinMaxFaceAttempts must be 1–20" }, { status: 400 });
    }
    data.checkinMaxFaceAttempts = n;
  }
  if (body.checkinFaceDistanceThreshold !== undefined) {
    if (body.checkinFaceDistanceThreshold === null) {
      data.checkinFaceDistanceThreshold = null;
    } else {
      const t = Number(body.checkinFaceDistanceThreshold);
      if (!Number.isFinite(t) || t <= 0 || t > 2) {
        return NextResponse.json(
          { error: "checkinFaceDistanceThreshold must be between 0 and 2" },
          { status: 400 },
        );
      }
      data.checkinFaceDistanceThreshold = new Prisma.Decimal(t.toFixed(5));
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  try {
    const updated = await prisma.company.update({
      where: { id: companyId },
      data,
      select: {
        id: true,
        checkinEnterpriseEnabled: true,
        checkinEnforceIpAllowlist: true,
        checkinRequireFaceVerification: true,
        checkinFaceDistanceThreshold: true,
        checkinMaxFaceAttempts: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "COMPANY_CHECKIN_SETTINGS_UPDATED",
        entityType: "Company",
        entityId: companyId,
        afterState: updated as object,
      },
    });

    return NextResponse.json({
      ...updated,
      checkinFaceDistanceThreshold: updated.checkinFaceDistanceThreshold
        ? Number(updated.checkinFaceDistanceThreshold)
        : null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
