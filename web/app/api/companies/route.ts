import { addDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { gateCompanyBilling, requireDbUser, canAccessCompany, canApprovePayroll } from "@/lib/api-auth";
import { TRIAL_DAYS } from "@/lib/billing/access";
import { prisma } from "@/lib/prisma";

/** Explicit fields only — avoids stale clients querying dropped columns (e.g. legacy `planTier`). */
const companyApiSelect = {
  id: true,
  name: true,
  logoUrl: true,
  registrationNumber: true,
  address: true,
  isActive: true,
  subscriptionStatus: true,
  trialEndsAt: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { employees: true } },
} as const;

/**
 * GET /api/companies
 * Authenticated. Super Admin: all companies. Others: only their assigned company (for switcher).
 */
export async function GET() {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  try {
    if (auth.dbUser.role === UserRole.SUPER_ADMIN) {
      const companies = await prisma.company.findMany({
        orderBy: { createdAt: "desc" },
        select: companyApiSelect,
      });
      return NextResponse.json(companies);
    }

    if (
      auth.dbUser.role !== UserRole.COMPANY_ADMIN &&
      auth.dbUser.role !== UserRole.HR
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!auth.dbUser.companyId) {
      return NextResponse.json([]);
    }

    const company = await prisma.company.findUnique({
      where: { id: auth.dbUser.companyId },
      select: companyApiSelect,
    });
    return NextResponse.json(company ? [company] : []);
  } catch {
    return NextResponse.json({ error: "Failed to load companies" }, { status: 500 });
  }
}

/**
 * POST /api/companies
 * Super Admin only — creates a new tenant company.
 */
export async function POST(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (auth.dbUser.role !== UserRole.SUPER_ADMIN) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name || name.length < 2) {
      return NextResponse.json({ error: "A valid company name is required" }, { status: 400 });
    }

    const trialEndsAt = addDays(new Date(), TRIAL_DAYS);
    const company = await prisma.company.create({
      data: {
        name,
        registrationNumber:
          typeof body.registrationNumber === "string" ? body.registrationNumber.trim() || null : null,
        address: typeof body.address === "string" ? body.address.trim() || null : null,
        trialEndsAt,
      },
      select: companyApiSelect,
    });
    return NextResponse.json(company, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}

/**
 * PATCH /api/companies
 * Body: { companyId, name?, address? }
 * Update company settings (admin only).
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (!canApprovePayroll(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const companyId = body.companyId as string;
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }
    const billing = await gateCompanyBilling(auth.dbUser, companyId);
    if (billing) return billing;

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.address !== undefined) data.address = body.address || null;

    const updated = await prisma.company.update({
      where: { id: companyId },
      data,
      select: companyApiSelect,
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update company" }, { status: 500 });
  }
}
