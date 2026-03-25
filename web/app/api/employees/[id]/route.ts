import { NextRequest, NextResponse } from "next/server";
import { canAccessCompany, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt, maskSensitive } from "@/lib/crypto";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;
  const { searchParams } = req.nextUrl;
  const decryptRequested = searchParams.get("decrypt") === "true";

  try {
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        salaryComponents: { orderBy: { createdAt: "desc" } },
        user: { select: { email: true, name: true } },
      },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    
    const isSelf = auth.dbUser.id === employee.userId;
    const isCompanyAdmin = canAccessCompany(auth.dbUser, employee.companyId);

    if (!isSelf && !isCompanyAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const data: Record<string, unknown> = { ...employee };
    delete data.faceDescriptor;
    delete data.faceRegisteredAt;

    const canSeeFaceMeta = isSelf || isCompanyAdmin;

    // Decrypt if requested and authorized
    if (decryptRequested && isCompanyAdmin) {
      data.ssnit = decrypt(employee.ssnitEncrypted);
      data.tin = decrypt(employee.tinEncrypted);
      data.bankName = decrypt(employee.bankNameEncrypted);
      data.bankAccount = decrypt(employee.bankAccountEncrypted);
      data.bankBranch = decrypt(employee.bankBranchEncrypted);
    } else {
      data.ssnit = employee.ssnitEncrypted ? maskSensitive("SSNIT") : null;
      data.tin = employee.tinEncrypted ? maskSensitive("TIN") : null;
      data.bankName = employee.bankNameEncrypted ? "********" : null;
      data.bankAccount = employee.bankAccountEncrypted ? maskSensitive("BANK") : null;
      data.bankBranch = employee.bankBranchEncrypted ? "********" : null;
    }

    // Don't leak raw encrypted strings to the client
    delete data.ssnitEncrypted;
    delete data.tinEncrypted;
    delete data.bankNameEncrypted;
    delete data.bankAccountEncrypted;
    delete data.bankBranchEncrypted;

    return NextResponse.json({
      ...data,
      hasFaceEnrolled: employee.faceDescriptor != null,
      faceRegisteredAt:
        canSeeFaceMeta && employee.faceRegisteredAt
          ? employee.faceRegisteredAt.toISOString()
          : canSeeFaceMeta
            ? null
            : undefined,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load employee" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    if (!canAccessCompany(auth.dbUser, employee.companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prepare update data
    const updateData: any = { ...body };
    delete updateData.companyId;
    delete updateData.employeeCode;
    delete updateData.userId;
    delete updateData.id;
    delete updateData.faceDescriptor;
    delete updateData.faceRegisteredAt;

    // Handle sensitive fields
    if ("ssnit" in body) updateData.ssnitEncrypted = encrypt(body.ssnit);
    if ("tin" in body) updateData.tinEncrypted = encrypt(body.tin);
    if ("bankName" in body) updateData.bankNameEncrypted = encrypt(body.bankName);
    if ("bankAccount" in body) updateData.bankAccountEncrypted = encrypt(body.bankAccount);
    if ("bankBranch" in body) updateData.bankBranchEncrypted = encrypt(body.bankBranch);

    // Remove raw fields from updateData
    delete updateData.ssnit;
    delete updateData.tin;
    delete updateData.bankName;
    delete updateData.bankAccount;
    delete updateData.bankBranch;

    const updated = await prisma.employee.update({
      where: { id },
      data: updateData,
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "EMPLOYEE_UPDATED",
        entityType: "Employee",
        entityId: id,
        afterState: updated as any,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;
  const { id } = await ctx.params;

  try {
    const employee = await prisma.employee.findUnique({ where: { id } });
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    if (!canAccessCompany(auth.dbUser, employee.companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.employee.update({
      where: { id },
      data: { deletedAt: new Date(), status: "TERMINATED" },
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "EMPLOYEE_DELETED",
        entityType: "Employee",
        entityId: id,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
  }
}
