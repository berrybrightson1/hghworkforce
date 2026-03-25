import { NextRequest, NextResponse } from "next/server";
import { canAccessCompany, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ lineId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { lineId } = await ctx.params;

  const line = await prisma.payrunLine.findUnique({
    where: { id: lineId },
    include: {
      payrun: true,
      employee: true,
    },
  });

  if (!line) {
    return NextResponse.json({ error: "Payslip not found" }, { status: 404 });
  }

  if (!canAccessCompany(auth.dbUser, line.payrun.companyId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (line.payrun.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Payrun must be approved before emailing payslips" },
      { status: 400 },
    );
  }

  // Placeholder - reset emailedAt since delivery is not yet configured
  await prisma.payslip
    .update({
      where: { payrunLineId: lineId },
      data: { emailedAt: null },
    })
    .catch(() => {});

  return NextResponse.json({
    message:
      "Email delivery is not configured yet. To enable payslip emails, configure a Resend API key in your environment variables.",
    lineId,
    employeeCode: line.employee.employeeCode,
    status: "pending_configuration",
  });
}
