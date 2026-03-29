import { NextRequest, NextResponse } from "next/server";
import { gateCompanyBilling, requireDbUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { mergeDepartmentOptions, mergeJobTitleOptions } from "@/lib/ghana-hr-field-presets";

/**
 * GET /api/employees/field-options?companyId=
 * Distinct department and job title values from existing employees (for datalist / combobox).
 * Does not expose other employees' TIN, SSNIT, or bank data.
 */
export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }
  const billing = await gateCompanyBilling(auth.dbUser, companyId);
  if (billing) return billing;

  try {
    const rows = await prisma.employee.findMany({
      where: { companyId, deletedAt: null },
      select: { department: true, jobTitle: true },
    });
    const fromDept = [...new Set(rows.map((r) => r.department).filter(Boolean))];
    const fromTitles = [...new Set(rows.map((r) => r.jobTitle).filter(Boolean))];
    const departments = mergeDepartmentOptions(fromDept);
    const jobTitles = mergeJobTitleOptions(fromTitles);
    return NextResponse.json({ departments, jobTitles });
  } catch {
    return NextResponse.json({ error: "Failed to load options" }, { status: 500 });
  }
}
