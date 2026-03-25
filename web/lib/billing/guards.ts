import { startOfMonth } from "date-fns";
import { NextResponse } from "next/server";
import type { Company } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { shouldApplyPlanLimits } from "@/lib/billing/enforcement";
import { effectiveLimits } from "@/lib/billing/plans";

function jsonError(message: string, code: string, status = 403) {
  return NextResponse.json({ error: message, code }, { status });
}

/**
 * Block adding employees when over plan cap (skipped when billing not enforced).
 */
export async function guardEmployeeCreation(company: Company): Promise<NextResponse | null> {
  const apply = shouldApplyPlanLimits();
  const { maxEmployeesPerCompany, bypassed } = effectiveLimits(company.planTier, apply);
  if (bypassed) return null;

  const count = await prisma.employee.count({
    where: { companyId: company.id, deletedAt: null },
  });
  if (count >= maxEmployeesPerCompany) {
    return jsonError(
      `Your ${company.planTier} plan allows up to ${maxEmployeesPerCompany} employees for this company. Upgrade to add more.`,
      "PLAN_EMPLOYEE_LIMIT",
      403,
    );
  }
  return null;
}

/**
 * Block creating payruns when monthly cap reached (skipped when billing not enforced).
 */
export async function guardPayrunCreation(company: Company): Promise<NextResponse | null> {
  const apply = shouldApplyPlanLimits();
  const { maxPayrunsPerMonth, bypassed } = effectiveLimits(company.planTier, apply);
  if (bypassed) return null;

  const monthStart = startOfMonth(new Date());
  const count = await prisma.payrun.count({
    where: { companyId: company.id, createdAt: { gte: monthStart } },
  });
  if (count >= maxPayrunsPerMonth) {
    return jsonError(
      `Your ${company.planTier} plan allows ${maxPayrunsPerMonth} pay run(s) per calendar month for this company.`,
      "PLAN_PAYRUN_LIMIT",
      403,
    );
  }
  return null;
}
