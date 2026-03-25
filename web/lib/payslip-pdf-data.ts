import type { Company, Employee, Payrun, PayrunLine, User } from "@prisma/client";

type Snapshot = { basicSalary?: number; allowanceTotal?: number };

/** Build props for PayslipDocument from a payrun line + its payrun (server-safe). */
export function buildPayslipPdfData(
  line: PayrunLine & { employee: Employee & { user: User | null } },
  payrun: Payrun & { company: Company },
) {
  const snapshot = line.salarySnapshot as Snapshot;
  const basic = Number(snapshot.basicSalary ?? 0);
  const allowanceTotal = Number(snapshot.allowanceTotal ?? 0);

  return {
    company: {
      name: payrun.company.name,
      address: payrun.company.address || undefined,
      logoUrl: payrun.company.logoUrl || undefined,
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
    earnings: [
      { name: "Basic Salary", amount: basic },
      ...(allowanceTotal > 0 ? [{ name: "Allowances", amount: allowanceTotal }] : []),
    ],
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
