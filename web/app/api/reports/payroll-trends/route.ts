import { NextRequest, NextResponse } from "next/server";
import { canAccessCompany, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const { searchParams } = req.nextUrl;
  const companyId = searchParams.get("companyId");

  if (!companyId) {
    return NextResponse.json({ error: "companyId required" }, { status: 400 });
  }
  if (!canAccessCompany(auth.dbUser, companyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const payruns = await prisma.payrun.findMany({
      where: { companyId, status: "APPROVED" },
      include: {
        lines: {
          select: { grossPay: true, netPay: true, totalDeductions: true },
        },
      },
      orderBy: { periodEnd: "asc" },
      take: 6, // Last 6 months
    });

    const data = payruns.map((p) => {
      const gross = p.lines.reduce((sum, l) => sum + Number(l.grossPay), 0);
      const net = p.lines.reduce((sum, l) => sum + Number(l.netPay), 0);
      const deductions = p.lines.reduce((sum, l) => sum + Number(l.totalDeductions), 0);

      return {
        month: p.periodEnd.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        gross,
        net,
        deductions,
      };
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to load trends" }, { status: 500 });
  }
}
