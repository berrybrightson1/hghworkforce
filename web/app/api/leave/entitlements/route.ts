import { NextRequest, NextResponse } from "next/server";
import { canManageLeave, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/** GET ?companyId= — leave policy rows for company */
export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  if (!canManageLeave(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  try {
    const rows = await prisma.leaveEntitlement.findMany({
      where: { companyId },
      orderBy: { leaveType: "asc" },
    });
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json({ error: "Failed to load" }, { status: 500 });
  }
}
