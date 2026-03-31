import { NextResponse } from "next/server";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/** Documents uploaded by HR for this employee (metadata only; download via /api/me/documents/[id]/download). */
export async function GET() {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;

  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  try {
    const documents = await prisma.employeeDocument.findMany({
      where: { employeeId: self.employee.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        fileType: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(documents);
  } catch {
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }
}
