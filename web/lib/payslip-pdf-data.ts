import type { Company, Employee, Payrun, PayrunLine, User } from "@prisma/client";

type Snapshot = {
  basicSalary?: number;
  allowanceTotal?: number;
  overtimePay?: number;
  overtimeHoursInPeriod?: number;
};

/** Build props for PayslipDocument from a payrun line + its payrun (server-safe). */
export function buildPayslipPdfData(
  line: PayrunLine & { employee: Employee & { user: User | null } },
  payrun: Payrun & { company: Company },
) {
  const snapshot = line.salarySnapshot as Snapshot;
  const basic = Number(snapshot.basicSalary ?? 0);
  const allowanceOnly = Number(snapshot.allowanceTotal ?? 0);
  const overtimePay = Number(snapshot.overtimePay ?? 0);
  const overtimeHours = Number(snapshot.overtimeHoursInPeriod ?? 0);

  const earnings: { name: string; amount: number }[] = [
    { name: "Basic Salary", amount: basic },
  ];
  if (allowanceOnly > 0) {
    earnings.push({ name: "Allowances", amount: allowanceOnly });
  }
  if (overtimePay > 0) {
    earnings.push({
      name:
        overtimeHours > 0
          ? `Overtime (${overtimeHours.toFixed(2)}h × policy)`
          : "Overtime pay",
      amount: overtimePay,
    });
  }

  return {
    company: {
      name: payrun.company.name,
      address: payrun.company.address || undefined,
      logoUrl: payrun.company.logoUrl || undefined,
    },
    theme: {
      primaryHex: payrun.company.payslipPrimaryHex ?? "#0f172a",
      accentHex: payrun.company.payslipAccentHex ?? "#b45309",
      variant: payrun.company.payslipThemeVariant ?? "DEFAULT",
    },
    employee: {
      name:
        line.employee.name?.trim() ||
        line.employee.user?.name ||
        "Employee",
      code: line.employee.employeeCode,
      department: line.employee.department,
      jobTitle: line.employee.jobTitle,
    },
    period: {
      start: payrun.periodStart.toISOString(),
      end: payrun.periodEnd.toISOString(),
    },
    earnings,
    deductions: [
      { name: "SSNIT (5.5%)", amount: Number(line.ssnitEmployee) },
      { name: "PAYE Income Tax", amount: Number(line.payeTax) },
      ...(Number(line.provident) > 0 ? [{ name: "Provident Fund", amount: Number(line.provident) }] : []),
      ...(Number(line.loanDeductions) > 0 ? [{ name: "Loan Repayment", amount: Number(line.loanDeductions) }] : []),
      ...(Number(line.otherDeductions) > 0 ? [{ name: "Other Deductions", amount: Number(line.otherDeductions) }] : []),
    ],
    summary: {
      grossPay: Number(line.grossPay),
      totalDeductions: Number(line.totalDeductions),
      netPay: Number(line.netPay),
    },
  };
}
