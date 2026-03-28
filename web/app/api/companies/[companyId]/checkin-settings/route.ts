import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDbUser, canManageCheckinSecurity, gateCompanyBilling } from "@/lib/api-auth";

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
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  if (!canManageCheckinSecurity(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        checkinEnterpriseEnabled: true,
        kioskOfficeOpensAt: true,
        kioskOfficeClosesAt: true,
        kioskCutoffTime: true,
        kioskTimezone: true,
      },
    });
    if (!company) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(company);
  } catch {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

function optionalHHmm(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(s)) return undefined;
  return s;
}

/**
 * PATCH /api/companies/[companyId]/checkin-settings
 * Body: checkinEnterpriseEnabled?,
 *       kioskOfficeOpensAt?, kioskOfficeClosesAt?, kioskCutoffTime? (HH:mm or null),
 *       kioskTimezone? (IANA string)
 */
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const { companyId } = await ctx.params;
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

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

  if (body.kioskOfficeOpensAt !== undefined) {
    const t = optionalHHmm(body.kioskOfficeOpensAt);
    if (t === undefined) {
      return NextResponse.json({ error: "kioskOfficeOpensAt must be HH:mm or null" }, { status: 400 });
    }
    data.kioskOfficeOpensAt = t;
  }
  if (body.kioskOfficeClosesAt !== undefined) {
    const t = optionalHHmm(body.kioskOfficeClosesAt);
    if (t === undefined) {
      return NextResponse.json(
        { error: "kioskOfficeClosesAt must be HH:mm or null" },
        { status: 400 },
      );
    }
    data.kioskOfficeClosesAt = t;
  }
  if (body.kioskCutoffTime !== undefined) {
    const t = optionalHHmm(body.kioskCutoffTime);
    if (t === undefined) {
      return NextResponse.json({ error: "kioskCutoffTime must be HH:mm or null" }, { status: 400 });
    }
    data.kioskCutoffTime = t;
  }
  if (typeof body.kioskTimezone === "string") {
    const tz = body.kioskTimezone.trim();
    if (tz.length < 2 || tz.length > 64) {
      return NextResponse.json({ error: "Invalid kioskTimezone" }, { status: 400 });
    }
    data.kioskTimezone = tz;
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
        kioskOfficeOpensAt: true,
        kioskOfficeClosesAt: true,
        kioskCutoffTime: true,
        kioskTimezone: true,
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

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
