import { NextResponse } from "next/server";
import { z } from "zod";
import { canManageBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  companyId: z.string().min(1),
  plan: z.enum(["STARTER_PAYROLL", "STARTER_ATTENDANCE", "PRO"]),
});

export async function POST(req: Request) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  if (!canManageBilling(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { companyId, plan } = parsed.data;
  if (auth.dbUser.role !== "SUPER_ADMIN" && auth.dbUser.companyId !== companyId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await prisma.company.update({
      where: { id: companyId },
      data: {
        plan,
        planActivatedAt: new Date(),
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not activate plan" }, { status: 500 });
  }
}
