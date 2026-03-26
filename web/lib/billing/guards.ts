import { NextResponse } from "next/server";
import type { Company, UserRole } from "@prisma/client";
import { companyHasFullAccess } from "@/lib/billing/access";
import { subscriptionRequiredResponse } from "@/lib/api-auth";

/**
 * Block mutating operations when the company trial has ended and subscription is not ACTIVE.
 * Super admins bypass (platform operations).
 */
export function guardCompanyFullAccess(company: Company, actorRole?: UserRole): NextResponse | null {
  if (actorRole === "SUPER_ADMIN") return null;
  if (!companyHasFullAccess(company)) {
    return subscriptionRequiredResponse();
  }
  return null;
}

/** @deprecated Use guardCompanyFullAccess — tier caps removed. */
export function guardEmployeeCreation(company: Company, actorRole?: UserRole): NextResponse | null {
  return guardCompanyFullAccess(company, actorRole);
}

/** @deprecated Use guardCompanyFullAccess — tier caps removed. */
export function guardPayrunCreation(company: Company, actorRole?: UserRole): NextResponse | null {
  return guardCompanyFullAccess(company, actorRole);
}
