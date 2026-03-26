import { NextRequest, NextResponse } from "next/server";
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

    // List view: no face vectors; flag only for admin UX (kiosk checklist)
    const masked = employees.map(
      ({ faceDescriptor, ssnitEncrypted, tinEncrypted, bankAccountEncrypted, ...rest }) => ({
        ...rest,
        hasFaceEnrolled: faceDescriptor != null,
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

    const employee = await prisma.$transaction(async (tx) => {
      const code = await allocateEmployeeCode(tx, companyId, company.name);
      return tx.employee.create({
        data: {
          employeeCode: code,
          name,
          companyId,
          department: body.department,
          jobTitle: body.jobTitle,
          employmentType: body.employmentType || "FULL_TIME",
          startDate: new Date(body.startDate),
          basicSalary: body.basicSalary,
          ssnitEncrypted: encrypt(body.ssnit),
          tinEncrypted: encrypt(body.tin),
          bankNameEncrypted: encrypt(body.bankName),
          bankAccountEncrypted: encrypt(body.bankAccount),
          bankBranchEncrypted: encrypt(body.bankBranch),
        },
        include: {
          company: { select: { name: true } },
          user: { select: { name: true, email: true } },
        },
      });
    });
    return NextResponse.json(employee, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
  }
}
