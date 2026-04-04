import { NextRequest, NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { createElement } from "react";
import JSZip from "jszip";
import { canManagePayroll, gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { buildPayslipPdfData } from "@/lib/payslip-pdf-data";
import { prisma } from "@/lib/prisma";
import { PayslipDocument } from "@/components/payroll/PayslipDocument";

export const runtime = "nodejs";

async function payslipElementToBuffer(
  doc: ReturnType<typeof createElement>,
): Promise<Buffer> {
  const stream = await renderToStream(doc as Parameters<typeof renderToStream>[0]);
  const webLike = stream as unknown as { getReader?: () => ReadableStreamDefaultReader<Uint8Array> };
  if (stream && typeof webLike.getReader === "function") {
    const reader = webLike.getReader();
    const parts: Buffer[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.byteLength) parts.push(Buffer.from(value));
    }
    return Buffer.concat(parts);
  }
  const nodeStream = stream as import("stream").Readable;
  if (typeof nodeStream[Symbol.asyncIterator] === "function") {
    const chunks: Buffer[] = [];
    for await (const chunk of nodeStream as AsyncIterable<Buffer | string | Uint8Array>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
  return await new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    nodeStream.on("data", (c: string | Buffer) =>
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)),
    );
    nodeStream.on("end", () => resolve(Buffer.concat(chunks)));
    nodeStream.on("error", reject);
  });
}

/**
 * GET /api/payruns/[id]/payslips-zip
 * ZIP of all payslip PDFs for an approved payrun (HR / admins only).
 */
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  if (!canManagePayroll(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id: payrunId } = await ctx.params;

  try {
    const payrun = await prisma.payrun.findUnique({
      where: { id: payrunId },
      include: {
        company: true,
        lines: {
          include: {
            employee: { include: { user: true } },
          },
          orderBy: { id: "asc" },
        },
      },
    });

    if (!payrun) {
      return NextResponse.json({ error: "Pay run not found" }, { status: 404 });
    }

    const billing = await gateCompanyBilling(auth.dbUser, payrun.companyId);
    if (billing) return billing;

    if (payrun.status !== "APPROVED") {
      return NextResponse.json(
        { error: "Only approved pay runs can be exported as payslip ZIP" },
        { status: 400 },
      );
    }

    if (payrun.lines.length === 0) {
      return NextResponse.json({ error: "No payroll lines to export" }, { status: 400 });
    }

    const zip = new JSZip();
    const periodSlug = payrun.periodEnd.toISOString().split("T")[0];

    for (const line of payrun.lines) {
      const data = buildPayslipPdfData(line, payrun);
      const doc = createElement(PayslipDocument, { data });
      const buf = await payslipElementToBuffer(doc);
      const safeCode = line.employee.employeeCode.replace(/[^\w.-]+/g, "_");
      const unique = line.id.replace(/[^\w.-]+/g, "_").slice(0, 12);
      zip.file(`payslip-${safeCode}-${periodSlug}-${unique}.pdf`, buf);
    }

    const bytes = await zip.generateAsync({ type: "uint8array" });
    const filename = `payslips-${payrun.company.name.replace(/[^\w.-]+/g, "_")}-${periodSlug}.zip`;

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Payslip ZIP error:", err);
    return NextResponse.json(
      {
        error: "Failed to build payslip ZIP",
        ...(process.env.NODE_ENV === "development" ? { detail: message } : {}),
      },
      { status: 500 },
    );
  }
}
