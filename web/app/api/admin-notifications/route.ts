import { NextRequest, NextResponse } from "next/server";
import { canManage, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET ?companyId= — recent admin notifications for the current user's workspace.
 * Returns { notifications, unreadCount }.
 */
export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (!canManage(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  try {
    const [rows, unreadCount] = await prisma.$transaction([
      prisma.adminNotification.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.adminNotification.count({
        where: {
          companyId,
          NOT: { readByUserIds: { has: auth.dbUser.id } },
        },
      }),
    ]);

    const notifications = rows.map((n) => ({
      id: n.id,
      type: n.type,
      actorName: n.actorName,
      title: n.title,
      message: n.message,
      linkUrl: n.linkUrl,
      isRead: n.readByUserIds.includes(auth.dbUser.id),
      createdAt: n.createdAt.toISOString(),
    }));

    return NextResponse.json({ notifications, unreadCount });
  } catch {
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}
