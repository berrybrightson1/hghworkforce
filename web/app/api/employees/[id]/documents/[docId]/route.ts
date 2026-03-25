import { NextRequest, NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { canAccessCompany, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string; docId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { id, docId } = await ctx.params;

  try {
    const document = await prisma.employeeDocument.findUnique({
      where: { id: docId },
      include: { employee: { select: { companyId: true } } },
    });

    if (!document || document.employeeId !== id) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (!canAccessCompany(auth.dbUser, document.employee.companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete from Vercel Blob
    await del(document.fileUrl).catch(() => {});

    await prisma.employeeDocument.delete({
      where: { id: docId },
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "EMPLOYEE_DOCUMENT_DELETED",
        entityType: "EmployeeDocument",
        entityId: docId,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete document" }, { status: 500 });
  }
}
