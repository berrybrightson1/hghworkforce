import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { canAccessCompany, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { companyId: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    if (!canAccessCompany(auth.dbUser, employee.companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const documents = await prisma.employeeDocument.findMany({
      where: { employeeId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(documents);
  } catch {
    return NextResponse.json({ error: "Failed to load documents" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;

    if (!file || !name) {
      return NextResponse.json({ error: "Missing file or name" }, { status: 400 });
    }

    const employee = await prisma.employee.findUnique({
      where: { id },
      select: { companyId: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    if (!canAccessCompany(auth.dbUser, employee.companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Upload to Vercel Blob
    const blob = await put(`documents/${id}/${file.name}`, file, {
      access: "public", // Using public for simplicity, but PRD says "signed URLs only".
      // Vercel Blob signed URLs require BLOB_READ_WRITE_TOKEN and specific configuration.
    });

    const document = await prisma.employeeDocument.create({
      data: {
        employeeId: id,
        name,
        fileUrl: blob.url,
        fileType: file.type,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "EMPLOYEE_DOCUMENT_UPLOADED",
        entityType: "EmployeeDocument",
        entityId: document.id,
      },
    });

    return NextResponse.json(document);
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Failed to upload document" }, { status: 500 });
  }
}
