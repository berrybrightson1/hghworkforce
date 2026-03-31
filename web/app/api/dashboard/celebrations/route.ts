import { NextRequest, NextResponse } from "next/server";
import { canManage, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/** Upcoming birthdays and work anniversaries for dashboard widget. */
export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  if (!canManage(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }

  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        showBirthdaysOnDashboard: true,
        birthdayLookaheadDays: true,
      },
    });
    if (!company?.showBirthdaysOnDashboard) {
      return NextResponse.json({
        enabled: false,
        birthdays: [],
        anniversaries: [],
      });
    }

    const days = company.birthdayLookaheadDays ?? 30;
    const today = new Date();
    const end = new Date(today.getTime() + days * 86400000);

    const employees = await prisma.employee.findMany({
      where: { companyId, deletedAt: null, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        employeeCode: true,
        dateOfBirth: true,
        startDate: true,
      },
    });

    const y = today.getFullYear();
    const birthdays: { employeeId: string; name: string; code: string; nextDate: string }[] = [];
    const anniversaries: { employeeId: string; name: string; code: string; years: number; nextDate: string }[] = [];

    for (const e of employees) {
      if (e.dateOfBirth) {
        const d = new Date(e.dateOfBirth);
        const next = new Date(y, d.getMonth(), d.getDate());
        if (next < today) next.setFullYear(y + 1);
        if (next <= end) {
          birthdays.push({
            employeeId: e.id,
            name: e.name?.trim() || e.employeeCode,
            code: e.employeeCode,
            nextDate: next.toISOString().slice(0, 10),
          });
        }
      }

      const sd = new Date(e.startDate);
      const ann = new Date(y, sd.getMonth(), sd.getDate());
      if (ann < today) ann.setFullYear(y + 1);
      if (ann <= end) {
        const years = ann.getFullYear() - sd.getFullYear();
        if (years >= 1) {
          anniversaries.push({
            employeeId: e.id,
            name: e.name?.trim() || e.employeeCode,
            code: e.employeeCode,
            years,
            nextDate: ann.toISOString().slice(0, 10),
          });
        }
      }
    }

    birthdays.sort((a, b) => a.nextDate.localeCompare(b.nextDate));
    anniversaries.sort((a, b) => a.nextDate.localeCompare(b.nextDate));

    return NextResponse.json({ enabled: true, birthdays, anniversaries });
  } catch {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
