import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/api-auth";

function csvEscape(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * GET /api/audit-log?action=&entityType=&from=&to=&take=&format=json|csv
 */
export async function GET(req: NextRequest) {
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

  const { searchParams } = req.nextUrl;
  const actionFilter = searchParams.get("action")?.trim();
  const entityTypeFilter = searchParams.get("entityType")?.trim();
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");
  const take = Math.min(Number(searchParams.get("take")) || 200, 2000);
  const format = searchParams.get("format") === "csv" ? "csv" : "json";

  const from = fromStr ? new Date(fromStr) : null;
  const to = toStr ? new Date(toStr) : null;
  if (from && Number.isNaN(from.getTime())) {
    return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
  }
  if (to && Number.isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
  }

  const where: Record<string, unknown> = {};
  if (actionFilter) where.action = { contains: actionFilter };
  if (entityTypeFilter) where.entityType = { contains: entityTypeFilter };
  if (from || to) {
    where.createdAt = {};
    if (from) (where.createdAt as Record<string, Date>).gte = from;
    if (to) (where.createdAt as Record<string, Date>).lte = to;
  }

  try {
    if (role === UserRole.SUPER_ADMIN) {
      const logs = await prisma.auditLog.findMany({
        where,
        include: { actor: { select: { name: true, email: true, companyId: true } } },
        orderBy: { createdAt: "desc" },
        take,
      });
      if (format === "csv") {
        const header = ["createdAt", "action", "entityType", "entityId", "actorEmail", "actorName"];
        const lines = [
          header.join(","),
          ...logs.map((l) =>
            [
              l.createdAt.toISOString(),
              csvEscape(l.action),
              csvEscape(l.entityType),
              csvEscape(l.entityId),
              csvEscape(l.actor.email),
              csvEscape(l.actor.name),
            ].join(","),
          ),
        ];
        return new NextResponse(lines.join("\n"), {
          headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="audit-log.csv"`,
          },
        });
      }
      return NextResponse.json(logs);
    }

    if (!auth.dbUser.companyId) {
      return format === "csv"
        ? new NextResponse("createdAt,action,entityType,entityId,actorEmail,actorName\n", {
            headers: { "Content-Type": "text/csv; charset=utf-8" },
          })
        : NextResponse.json([]);
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        ...where,
        actor: { companyId: auth.dbUser.companyId },
      },
      include: { actor: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take,
    });
    if (format === "csv") {
      const header = ["createdAt", "action", "entityType", "entityId", "actorEmail", "actorName"];
      const lines = [
        header.join(","),
        ...logs.map((l) =>
          [
            l.createdAt.toISOString(),
            csvEscape(l.action),
            csvEscape(l.entityType),
            csvEscape(l.entityId),
            csvEscape(l.actor.email),
            csvEscape(l.actor.name),
          ].join(","),
        ),
      ];
      return new NextResponse(lines.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit-log.csv"`,
        },
      });
    }
    return NextResponse.json(logs);
  } catch {
    return NextResponse.json({ error: "Failed to load audit logs" }, { status: 500 });
  }
}
