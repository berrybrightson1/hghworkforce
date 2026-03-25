import { NextRequest, NextResponse } from "next/server";
import { isIP } from "node:net";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireDbUser,
  canAccessCompany,
  canManageCheckinSecurity,
} from "@/lib/api-auth";

/**
 * GET /api/ip-access-requests?companyId=optional
 * Super Admin: all pending/recent. Company staff: own company only.
 */
export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (!canManageCheckinSecurity(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyIdParam = req.nextUrl.searchParams.get("companyId");

  try {
    const where =
      auth.dbUser.role === UserRole.SUPER_ADMIN
        ? companyIdParam
          ? { companyId: companyIdParam }
          : {}
        : auth.dbUser.companyId
          ? { companyId: auth.dbUser.companyId }
          : { companyId: "__none__" };

    if (auth.dbUser.role !== UserRole.SUPER_ADMIN && companyIdParam) {
      if (!canAccessCompany(auth.dbUser, companyIdParam)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const rows = await prisma.iPAccessRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        company: { select: { id: true, name: true } },
        requestedBy: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true, email: true } },
      },
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}

/**
 * POST /api/ip-access-requests
 * Body: { companyId, requestedIp, note? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (!canManageCheckinSecurity(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { companyId?: string; requestedIp?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const companyId = typeof body.companyId === "string" ? body.companyId : "";
  const requestedIp = typeof body.requestedIp === "string" ? body.requestedIp.trim() : "";
  const note = typeof body.note === "string" ? body.note.trim() || null : null;

  if (!companyId || !canAccessCompany(auth.dbUser, companyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!requestedIp || isIP(requestedIp) === 0) {
    return NextResponse.json({ error: "Valid IPv4 or IPv6 address required" }, { status: 400 });
  }

  try {
    const row = await prisma.iPAccessRequest.create({
      data: {
        companyId,
        requestedByUserId: auth.dbUser.id,
        requestedIp,
        note,
      },
      include: {
        company: { select: { id: true, name: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "IP_ACCESS_REQUEST_CREATED",
        entityType: "Company",
        entityId: companyId,
        afterState: { id: row.id, requestedIp },
      },
    });

    return NextResponse.json(row, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}
