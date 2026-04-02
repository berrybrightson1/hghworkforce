import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { canManage, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.union([
  z.object({ ids: z.array(z.string().min(1)).min(1) }),
  z.object({ all: z.literal(true), companyId: z.string().min(1) }),
]);

/**
 * PATCH — mark admin notifications as read for the current user.
 * Body: { ids: string[] } or { all: true, companyId: string }
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (!canManage(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Provide { ids } or { all, companyId }" }, { status: 400 });
  }

  const userId = auth.dbUser.id;

  try {
    if ("all" in parsed.data) {
      const { companyId } = parsed.data;
      const billing = await gateCompanyBilling(auth.dbUser, companyId);
      if (billing) return billing;

      // Find unread notifications for this company/user
      const unread = await prisma.adminNotification.findMany({
        where: {
          companyId,
          NOT: { readByUserIds: { has: userId } },
        },
        select: { id: true },
      });

      if (unread.length > 0) {
        await prisma.$transaction(
          unread.map((n) =>
            prisma.adminNotification.update({
              where: { id: n.id },
              data: { readByUserIds: { push: userId } },
            }),
          ),
        );
      }
    } else {
      const { ids } = parsed.data;
      // Only push userId to notifications that don't already include it
      const rows = await prisma.adminNotification.findMany({
        where: {
          id: { in: ids },
          NOT: { readByUserIds: { has: userId } },
        },
        select: { id: true },
      });

      if (rows.length > 0) {
        await prisma.$transaction(
          rows.map((n) =>
            prisma.adminNotification.update({
              where: { id: n.id },
              data: { readByUserIds: { push: userId } },
            }),
          ),
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
