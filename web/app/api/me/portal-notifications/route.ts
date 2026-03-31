import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;

  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";

  try {
    const rows = await prisma.portalNotification.findMany({
      where: {
        employeeId: self.employee.id,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

const patchSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  read: z.boolean(),
});

export async function PATCH(req: NextRequest) {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;

  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "ids[] and read required" }, { status: 400 });
  }

  const { ids, read } = parsed.data;

  try {
    await prisma.portalNotification.updateMany({
      where: {
        id: { in: ids },
        employeeId: self.employee.id,
      },
      data: { isRead: read },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
