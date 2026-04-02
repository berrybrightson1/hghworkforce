import { NextResponse } from "next/server";
import { requireDbUser, canAdminCompany, gateCompanyBilling } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { dbUser } = auth;

  if (!canAdminCompany(dbUser.role)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { id } = await params;
  const body = await req.json();
  const { action, paidAt, scheduledPayDate } = body;

  const payrun = await prisma.payrun.findUnique({
    where: { id },
    select: { id: true, companyId: true, status: true, isPaid: true },
  });

  if (!payrun) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const billing = await gateCompanyBilling(dbUser, payrun.companyId);
  if (billing) return billing;

  if (payrun.status !== "APPROVED") {
    return NextResponse.json({ error: "Only approved payruns can be updated" }, { status: 400 });
  }

  if (action === "mark-paid") {
    const updated = await prisma.payrun.update({
      where: { id },
      data: {
        isPaid: true,
        paidAt: paidAt ? new Date(paidAt) : new Date(),
        markedPaidBy: dbUser.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: dbUser.id,
        action: "PAYRUN_MARKED_PAID",
        entityType: "Payrun",
        entityId: id,
        afterState: { isPaid: true, paidAt: updated.paidAt },
      },
    });

    return NextResponse.json(updated);
  }

  if (action === "undo-paid") {
    if (dbUser.role !== "SUPER_ADMIN" && dbUser.role !== "COMPANY_ADMIN") {
      return NextResponse.json({ error: "Only admins can undo payment status" }, { status: 403 });
    }

    const updated = await prisma.payrun.update({
      where: { id },
      data: { isPaid: false, paidAt: null, markedPaidBy: null },
    });

    await prisma.auditLog.create({
      data: {
        actorId: dbUser.id,
        action: "PAYRUN_PAYMENT_UNDONE",
        entityType: "Payrun",
        entityId: id,
      },
    });

    return NextResponse.json(updated);
  }

  if (action === "set-pay-date") {
    if (!scheduledPayDate) {
      return NextResponse.json({ error: "scheduledPayDate required" }, { status: 400 });
    }

    const updated = await prisma.payrun.update({
      where: { id },
      data: { scheduledPayDate: new Date(scheduledPayDate) },
    });

    await prisma.auditLog.create({
      data: {
        actorId: dbUser.id,
        action: "PAYRUN_PAY_DATE_SET",
        entityType: "Payrun",
        entityId: id,
        afterState: { scheduledPayDate },
      },
    });

    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
