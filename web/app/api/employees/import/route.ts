import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { guardEmployeeCreation } from "@/lib/billing/guards";
import { allocateEmployeeCode } from "@/lib/employee-code";
import { prisma } from "@/lib/prisma";

interface ImportRow {
  name?: string;
  employeeName?: string;
  employeeCode?: string;
  department: string;
  jobTitle: string;
  basicSalary: string;
  employmentType: string;
  startDate: string;
}

export async function POST(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  let body: { companyId: string; employees: ImportRow[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { companyId, employees } = body;
  if (!companyId || !employees || !Array.isArray(employees)) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  const company = await prisma.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const blocked = guardEmployeeCreation(company, auth.dbUser.role);
  if (blocked) return blocked;

  try {
    const results = await prisma.$transaction(async (tx) => {
      let created = 0;
      for (const emp of employees) {
        const rawName =
          typeof emp.name === "string"
            ? emp.name
            : typeof emp.employeeName === "string"
              ? emp.employeeName
              : "";
        const nameTrim = rawName.trim();
        const dept = typeof emp.department === "string" ? emp.department.trim() : "";
        const title = typeof emp.jobTitle === "string" ? emp.jobTitle.trim() : "";
        if (!nameTrim || !dept || !title || !emp.basicSalary) continue;

        const duplicate = await tx.employee.findFirst({
          where: {
            companyId,
            deletedAt: null,
            name: { equals: nameTrim, mode: "insensitive" },
            department: { equals: dept, mode: "insensitive" },
            jobTitle: { equals: title, mode: "insensitive" },
          },
        });
        if (duplicate) continue;

        const code = await allocateEmployeeCode(tx, companyId, company.name);

        await tx.employee.create({
          data: {
            companyId,
            employeeCode: code,
            name: nameTrim,
            department: dept,
            jobTitle: title,
            basicSalary: new Prisma.Decimal(emp.basicSalary),
            employmentType: (emp.employmentType || "FULL_TIME") as "FULL_TIME" | "PART_TIME" | "CONTRACTOR",
            startDate: new Date(emp.startDate || new Date()),
            status: "ACTIVE",
          },
        });
        created++;
      }

      await tx.auditLog.create({
        data: {
          actorId: auth.dbUser.id,
          action: "EMPLOYEES_BULK_IMPORT",
          entityType: "Company",
          entityId: companyId,
          afterState: { count: created } as Prisma.InputJsonValue,
        },
      });

      return created;
    });

    return NextResponse.json({ count: results });
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ error: "Failed to import employees" }, { status: 500 });
  }
}
