export type PlanModule =
  | "payroll"
  | "attendance"
  | "leave"
  | "loans"
  | "staff_portal_full"
  | "reports_advanced"
  | "reports_basic"
  | "staff_portal_basic";

export type PlanName =
  | "TRIAL"
  | "STARTER_PAYROLL"
  | "STARTER_ATTENDANCE"
  | "PRO";

export const PLAN_MODULES: Record<PlanName, PlanModule[]> = {
  TRIAL: [
    "payroll",
    "attendance",
    "leave",
    "loans",
    "staff_portal_full",
    "reports_advanced",
  ],
  STARTER_PAYROLL: [
    "payroll",
    "staff_portal_basic",
    "reports_basic",
  ],
  STARTER_ATTENDANCE: [
    "attendance",
    "staff_portal_basic",
    "reports_basic",
  ],
  PRO: [
    "payroll",
    "attendance",
    "leave",
    "loans",
    "staff_portal_full",
    "reports_advanced",
  ],
};

export function canAccess(plan: string, module: PlanModule): boolean {
  const key = (plan as PlanName) || "TRIAL";
  return PLAN_MODULES[key]?.includes(module) ?? false;
}
