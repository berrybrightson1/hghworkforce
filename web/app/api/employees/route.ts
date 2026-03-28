import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { guardEmployeeCreation } from "@/lib/billing/guards";
import { allocateEmployeeCode } from "@/lib/employee-code";
import { prisma } from "@/lib/prisma";
import { encrypt, maskSensitive } from "@/lib/crypto";

export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = req.nextUrl;
    const companyId = searchParams.get("companyId");
    const status = searchParams.get("status");
    const search = searchParams.get("q");

    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }
    const billing = await gateCompanyBilling(auth.dbUser, companyId);
    if (billing) return billing;

    const employees = await prisma.employee.findMany({
      where: {
        companyId,
        ...(status ? { status: status as "ACTIVE" | "SUSPENDED" | "TERMINATED" } : {}),
        ...(search
          ? {
              OR: [
                { employeeCode: { contains: search, mode: "insensitive" as const } },
                { name: { contains: search, mode: "insensitive" as const } },
                { jobTitle: { contains: search, mode: "insensitive" as const } },
                { department: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
        deletedAt: null,
      },
      include: {
        company: { select: { name: true } },
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    // List view: flag only for admin UX (kiosk checklist)
    const masked = employees.map(
      ({ kioskDeviceTokenHash, ssnitEncrypted, tinEncrypted, bankAccountEncrypted, ...rest }) => ({
        ...rest,
        hasDeviceBound: kioskDeviceTokenHash != null,
        ssnitEncrypted: ssnitEncrypted ? maskSensitive("SSNIT") : null,
        tinEncrypted: tinEncrypted ? maskSensitive("TIN") : null,
        bankAccountEncrypted: bankAccountEncrypted ? maskSensitive("BANK") : null,
      }),
    );

    return NextResponse.json(masked);
  } catch {
    return NextResponse.json({ error: "Failed to load employees" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const companyId = body.companyId as string | undefined;
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }
    const billing = await gateCompanyBilling(auth.dbUser, companyId);
    if (billing) return billing;

    const company = await prisma.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const blocked = guardEmployeeCreation(company, auth.dbUser.role);
    if (blocked) return blocked;

    const name =
      typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const department =
      typeof body.department === "string" ? body.department.trim() : "";
    if (!department) {
      return NextResponse.json({ error: "department is required" }, { status: 400 });
    }

    const jobTitle =
      typeof body.jobTitle === "string" ? body.jobTitle.trim() : "";
    if (!jobTitle) {
      return NextResponse.json({ error: "jobTitle is required" }, { status: 400 });
    }

    const startRaw = body.startDate;
    if (startRaw == null || String(startRaw).trim() === "") {
      return NextResponse.json({ error: "startDate is required" }, { status: 400 });
    }
    const startDate = new Date(String(startRaw));
    if (Number.isNaN(startDate.getTime())) {
      return NextResponse.json({ error: "Invalid startDate" }, { status: 400 });
    }

    const basicN = Number(body.basicSalary);
    if (!Number.isFinite(basicN) || basicN <= 0) {
      return NextResponse.json({ error: "basicSalary must be a positive number" }, { status: 400 });
    }

    let employmentType = "FULL_TIME";
    if (body.employmentType != null && String(body.employmentType).trim() !== "") {
      employmentType = String(body.employmentType);
    }
    if (!["FULL_TIME", "PART_TIME", "CONTRACTOR"].includes(employmentType)) {
      return NextResponse.json({ error: "Invalid employmentType" }, { status: 400 });
    }

    const basicDec = new Prisma.Decimal(basicN.toFixed(2));
    const recentCutoff = new Date(Date.now() - 90_000);

    try {
      const employee = await prisma.$transaction(async (tx) => {
      const duplicateRecent = await tx.employee.findFirst({
        where: {
          companyId,
          deletedAt: null,
          name,
          department,
          jobTitle,
          employmentType: employmentType as "FULL_TIME" | "PART_TIME" | "CONTRACTOR",
          basicSalary: basicDec,
          startDate,
          createdAt: { gte: recentCutoff },
        },
        select: { id: true, employeeCode: true },
      });
      if (duplicateRecent) {
        const err = new Error("DUPLICATE_RECENT") as Error & {
          duplicate?: { id: string; employeeCode: string };
        };
        err.duplicate = duplicateRecent;
        throw err;
      }

      const code = await allocateEmployeeCode(tx, companyId, company.name);
      return tx.employee.create({
        data: {
          employeeCode: code,
          name,
          companyId,
          department,
          jobTitle,
          employmentType: employmentType as "FULL_TIME" | "PART_TIME" | "CONTRACTOR",
          startDate,
          basicSalary: basicDec,
          ssnitEncrypted: encrypt(
            typeof body.ssnit === "string" && body.ssnit.trim() ? body.ssnit.trim() : null,
          ),
          tinEncrypted: encrypt(
            typeof body.tin === "string" && body.tin.trim() ? body.tin.trim() : null,
          ),
          bankNameEncrypted: encrypt(
            typeof body.bankName === "string" && body.bankName.trim() ? body.bankName.trim() : null,
          ),
          bankAccountEncrypted: encrypt(
            typeof body.bankAccount === "string" && body.bankAccount.trim()
              ? body.bankAccount.trim()
              : null,
          ),
          bankBranchEncrypted: encrypt(
            typeof body.bankBranch === "string" && body.bankBranch.trim()
              ? body.bankBranch.trim()
              : null,
          ),
        },
        include: {
          company: { select: { name: true } },
          user: { select: { name: true, email: true } },
        },
      });
      });
      return NextResponse.json(employee, { status: 201 });
    } catch (e: unknown) {
      if (
        e instanceof Error &&
        e.message === "DUPLICATE_RECENT" &&
        "duplicate" in e &&
        e.duplicate &&
        typeof e.duplicate === "object" &&
        "id" in e.duplicate &&
        "employeeCode" in e.duplicate
      ) {
        const d = e.duplicate as { id: string; employeeCode: string };
        return NextResponse.json(
          {
            error:
              "The same employee details were saved a few seconds ago. This usually means the form was submitted more than once. Use the list to remove extras, or “Terminate by code” with the payroll code.",
            duplicateOfId: d.id,
            employeeCode: d.employeeCode,
          },
          { status: 409 },
        );
      }
      throw e;
    }
  } catch (e) {
    console.error("[employees POST]", e);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}
