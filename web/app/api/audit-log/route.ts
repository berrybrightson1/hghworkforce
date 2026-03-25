import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/api-auth";

/**
 * GET /api/audit-log
 * Super Admin: recent platform-wide entries.
 * Company Admin / HR: entries whose actor belongs to the same company.
 */
export async function GET() {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const role = auth.dbUser.role;
  if (
    role !== UserRole.SUPER_ADMIN &&
    role !== UserRole.COMPANY_ADMIN &&
    role !== UserRole.HR
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    if (role === UserRole.SUPER_ADMIN) {
      const logs = await prisma.auditLog.findMany({
        include: { actor: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json(logs);
    }

    if (!auth.dbUser.companyId) {
      return NextResponse.json([]);
    }

    const logs = await prisma.auditLog.findMany({
      where: { actor: { companyId: auth.dbUser.companyId } },
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(logs);
  } catch {
    return NextResponse.json({ error: "Failed to load audit logs" }, { status: 500 });
  }
}
