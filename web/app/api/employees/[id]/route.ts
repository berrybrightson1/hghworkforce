import { NextRequest, NextResponse } from "next/server";
import { EmploymentType, EmployeeStatus, Prisma } from "@prisma/client";
import {
  canAccessCompany,
  canManagePayroll,
  gateCompanyBilling,
  requireDbUser,
} from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { decrypt, encrypt, isEncryptionKeyError, maskSensitive } from "@/lib/crypto";
import { isRedactedLikeInput } from "@/lib/redacted-sensitive";
import { normalizeMomoProvider } from "@/lib/momo-providers";

const EMPLOYMENT_TYPES = new Set<string>(Object.values(EmploymentType));
const EMPLOYEE_STATUSES = new Set<string>(Object.values(EmployeeStatus));

function safeAuditSnapshot(emp: {
  id: string;
  name: string | null;
  department: string;
  jobTitle: string;
  employmentType: EmploymentType;
  startDate: Date;
  status: EmployeeStatus;
  basicSalary: Prisma.Decimal;
}) {
  return {
    id: emp.id,
    name: emp.name,
    department: emp.department,
    jobTitle: emp.jobTitle,
    employmentType: emp.employmentType,
    startDate: emp.startDate.toISOString(),
    status: emp.status,
    basicSalary: emp.basicSalary.toString(),
  } as Prisma.InputJsonValue;
}

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

    const billing = await gateCompanyBilling(auth.dbUser, employee.companyId);
    if (billing) return billing;

    const data: Record<string, unknown> = { ...employee };
    delete data.kioskDeviceTokenHash;

    // Decrypt if requested and authorized
    if (decryptRequested && isCompanyAdmin) {
      data.ssnit = decrypt(employee.ssnitEncrypted);
      data.tin = decrypt(employee.tinEncrypted);
      data.bankName = decrypt(employee.bankNameEncrypted);
      data.bankAccount = decrypt(employee.bankAccountEncrypted);
      data.bankBranch = decrypt(employee.bankBranchEncrypted);
      data.momoMsisdn = decrypt(employee.momoMsisdnEncrypted);
    } else {
      data.ssnit = employee.ssnitEncrypted ? maskSensitive("SSNIT") : null;
      data.tin = employee.tinEncrypted ? maskSensitive("TIN") : null;
      data.bankName = employee.bankNameEncrypted ? "********" : null;
      data.bankAccount = employee.bankAccountEncrypted ? maskSensitive("BANK") : null;
      data.bankBranch = employee.bankBranchEncrypted ? "********" : null;
      data.momoMsisdn = employee.momoMsisdnEncrypted ? maskSensitive("MOMO") : null;
    }
    data.momoProvider = employee.momoProvider;

    // Don't leak raw encrypted strings to the client
    delete data.ssnitEncrypted;
    delete data.tinEncrypted;
    delete data.bankNameEncrypted;
    delete data.bankAccountEncrypted;
    delete data.bankBranchEncrypted;
    delete data.momoMsisdnEncrypted;

    return NextResponse.json({
      ...data,
      hasDeviceBound: !!employee.kioskDeviceTokenHash,
      deviceBoundAt: employee.deviceBoundAt ?? null,
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

  let body: Record<string, unknown>;
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
    const billing = await gateCompanyBilling(auth.dbUser, employee.companyId);
    if (billing) return billing;

    const isSelf = employee.userId === auth.dbUser.id;
    const inCompany = canAccessCompany(auth.dbUser, employee.companyId);
    const isPayrollStaff = canManagePayroll(auth.dbUser.role) && inCompany;
    if (!isSelf && !isPayrollStaff) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data: Prisma.EmployeeUpdateInput = {};

    if (typeof body.name === "string") {
      data.name = body.name.trim() || null;
    }

    if (typeof body.department === "string") {
      const v = body.department.trim();
      if (!v) {
        return NextResponse.json({ error: "department cannot be empty" }, { status: 400 });
      }
      data.department = v;
    }

    if (typeof body.jobTitle === "string") {
      const v = body.jobTitle.trim();
      if (!v) {
        return NextResponse.json({ error: "jobTitle cannot be empty" }, { status: 400 });
      }
      data.jobTitle = v;
    }

    if (body.employmentType !== undefined) {
      const et = String(body.employmentType);
      if (!EMPLOYMENT_TYPES.has(et)) {
        return NextResponse.json({ error: "Invalid employmentType" }, { status: 400 });
      }
      data.employmentType = et as EmploymentType;
    }

    if (body.basicSalary !== undefined) {
      const n = Number(body.basicSalary);
      if (!Number.isFinite(n) || n <= 0) {
        return NextResponse.json({ error: "basicSalary must be a positive number" }, { status: 400 });
      }
      data.basicSalary = new Prisma.Decimal(n.toFixed(2));
    }

    if (body.startDate !== undefined) {
      const d = new Date(String(body.startDate));
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
      }
      data.startDate = d;
    }

    if (body.status !== undefined && isPayrollStaff) {
      const st = String(body.status);
      if (!EMPLOYEE_STATUSES.has(st)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.status = st as EmployeeStatus;
      if (st === "TERMINATED") {
        data.deletedAt = new Date();
        data.kioskDeviceTokenHash = null;
        data.deviceBoundAt = null;
      } else if (st === "ACTIVE") {
        data.deletedAt = null;
      }
    } else if (body.status !== undefined && !isPayrollStaff) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isPayrollStaff) {
      if ("ssnit" in body && !isRedactedLikeInput(body.ssnit)) {
        const raw = typeof body.ssnit === "string" ? body.ssnit.trim() : "";
        data.ssnitEncrypted = encrypt(raw || null);
      }
      if ("tin" in body && !isRedactedLikeInput(body.tin)) {
        const raw = typeof body.tin === "string" ? body.tin.trim() : "";
        data.tinEncrypted = encrypt(raw || null);
      }
      if ("bankName" in body && !isRedactedLikeInput(body.bankName)) {
        const raw = typeof body.bankName === "string" ? body.bankName.trim() : "";
        data.bankNameEncrypted = encrypt(raw || null);
      }
      if ("bankAccount" in body && !isRedactedLikeInput(body.bankAccount)) {
        const raw = typeof body.bankAccount === "string" ? body.bankAccount.trim() : "";
        data.bankAccountEncrypted = encrypt(raw || null);
      }
      if ("bankBranch" in body && !isRedactedLikeInput(body.bankBranch)) {
        const raw = typeof body.bankBranch === "string" ? body.bankBranch.trim() : "";
        data.bankBranchEncrypted = encrypt(raw || null);
      }
      if ("momoProvider" in body) {
        const raw = typeof body.momoProvider === "string" ? body.momoProvider.trim() : "";
        const norm = normalizeMomoProvider(raw);
        data.momoProvider = norm;
        if (!norm) {
          data.momoMsisdnEncrypted = encrypt(null);
        }
      }
      if ("momoMsisdn" in body && !isRedactedLikeInput(body.momoMsisdn)) {
        const raw =
          typeof body.momoMsisdn === "string" ? body.momoMsisdn.replace(/\s+/g, "").trim() : "";
        const prov =
          "momoProvider" in body
            ? normalizeMomoProvider(body.momoProvider)
            : employee.momoProvider;
        if (raw && !prov) {
          return NextResponse.json(
            { error: "Select a mobile money provider before saving a wallet number." },
            { status: 400 },
          );
        }
        data.momoMsisdnEncrypted = encrypt(raw || null);
      }
    }

    const optionalNokKeys = ["nokName", "nokPhone", "nokRelationship"] as const;
    for (const key of optionalNokKeys) {
      if (typeof body[key] === "string") {
        const v = body[key].trim();
        (data as Record<string, unknown>)[key] = v || null;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const updated = await prisma.employee.update({
      where: { id },
      data,
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.dbUser.id,
        action: "EMPLOYEE_UPDATED",
        entityType: "Employee",
        entityId: id,
        afterState: safeAuditSnapshot(updated),
      },
    });

    return NextResponse.json(updated);
  } catch (e) {
    if (isEncryptionKeyError(e)) {
      return NextResponse.json(
        {
          error:
            "ENCRYPTION_KEY is missing or invalid in production. Add a 64-character hex key to your host environment and redeploy.",
          code: "ENCRYPTION_CONFIG",
        },
        { status: 503 },
      );
    }
    console.error("[employees PATCH]", e);
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
    const billing = await gateCompanyBilling(auth.dbUser, employee.companyId);
    if (billing) return billing;

    const isSelf = employee.userId === auth.dbUser.id;
    const inCompany = canAccessCompany(auth.dbUser, employee.companyId);
    const isPayrollStaff = canManagePayroll(auth.dbUser.role) && inCompany;
    if (!isSelf && !isPayrollStaff) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.employee.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: "TERMINATED",
        kioskDeviceTokenHash: null,
        deviceBoundAt: null,
      },
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
