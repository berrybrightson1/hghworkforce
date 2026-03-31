import { NextRequest, NextResponse } from "next/server";
import { gateBillingForEmployeeSelf, requireEmployeeSelf } from "@/lib/api-auth";
import { logServerError } from "@/lib/server-log";
import { prisma } from "@/lib/prisma";

/** Auth-gated redirect to stored file (blob URL). List endpoint does not expose raw URLs. */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ docId: string }> },
) {
  const self = await requireEmployeeSelf();
  if (!self.ok) return self.response;

  const billing = await gateBillingForEmployeeSelf(self.employee, self.via, self.dbUser);
  if (billing) return billing;

  const { docId } = await ctx.params;

  try {
    const doc = await prisma.employeeDocument.findFirst({
      where: { id: docId, employeeId: self.employee.id },
      select: { fileUrl: true },
    });
    if (!doc?.fileUrl) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.redirect(doc.fileUrl);
  } catch (e) {
    logServerError("me/documents/download", e, { docId });
    return NextResponse.json({ error: "Failed to open document" }, { status: 500 });
  }
}
