/** HR record name, then linked portal user, then payroll code. */
export function employeeDisplayName(emp: {
  name?: string | null;
  employeeCode: string;
  user?: { name?: string | null } | null;
}): string {
  const fromRecord = emp.name?.trim();
  if (fromRecord) return fromRecord;
  const fromUser = emp.user?.name?.trim();
  if (fromUser) return fromUser;
  return emp.employeeCode;
}
