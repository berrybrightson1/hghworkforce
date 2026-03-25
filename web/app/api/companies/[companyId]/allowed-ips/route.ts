import { NextRequest, NextResponse } from "next/server";
import { isIP } from "node:net";
import { prisma } from "@/lib/prisma";
import { requireDbUser, canAccessCompany, canManageCheckinSecurity } from "@/lib/api-auth";

/**
 * GET /api/companies/[companyId]/allowed-ips
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
    const rows = await prisma.allowedIP.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        label: true,
        address: true,
        createdAt: true,
        createdBy: { select: { name: true, email: true } },
      },
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Failed to list IPs" }, { status: 500 });
  }
}

/**
 * POST /api/companies/[companyId]/allowed-ips
 * Body: { address: string, label?: string }
 */
export async function POST(
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

  let body: { address?: string; label?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const address = typeof body.address === "string" ? body.address.trim() : "";
  if (!address || isIP(address) === 0) {
    return NextResponse.json({ error: "Valid IPv4 or IPv6 address required" }, { status: 400 });
  }
  const label = typeof body.label === "string" ? body.label.trim() || null : null;

  try {
    const row = await prisma.allowedIP.create({
      data: {
        companyId,
        address,
        label,
        createdById: auth.dbUser.id,
      },
      select: {
        id: true,
        label: true,
        address: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "ALLOWED_IP_CREATED",
        entityType: "Company",
        entityId: companyId,
        afterState: row,
      },
    });

    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to add IP" }, { status: 500 });
  }
}
