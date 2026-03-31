import { NextRequest, NextResponse } from "next/server";
import { canManage, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import {
  ghanaPublicHolidayTemplates,
  holidayDateUtc,
} from "@/lib/public-holidays";
import { prisma } from "@/lib/prisma";

/** POST { year?: number } — idempotent insert of template Ghana fixed-date holidays. */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ companyId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { companyId } = await ctx.params;
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;
  if (!canManage(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let year = new Date().getFullYear();
  try {
    const b = await req.json().catch(() => ({}));
    if (typeof b.year === "number" && b.year >= 2000 && b.year <= 2100) year = b.year;
  } catch {
    /* default year */
  }

  const templates = ghanaPublicHolidayTemplates(year);
  for (const t of templates) {
    const date = holidayDateUtc(year, t.month, t.day);
    await prisma.publicHoliday.upsert({
      where: { companyId_date: { companyId, date } },
      create: { companyId, date, name: t.name },
      update: { name: t.name },
    });
  }
  return NextResponse.json({ year, upserted: templates.length });
}
