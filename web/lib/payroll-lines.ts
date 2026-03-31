import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  calculatePayroll,
  DEFAULT_MONTHLY_PAYE_BRACKETS,
  type TaxBracketInput,
} from "@/lib/ghana-tax";

export function moneyDec(n: number): Prisma.Decimal {
  return new Prisma.Decimal((Math.round(n * 100) / 100).toFixed(2));
}

export async function resolvePayeBrackets(
  companyId: string,
  year: number,
): Promise<TaxBracketInput[]> {
  const companyRows = await prisma.taxBracket.findMany({
    where: { companyId, year, isActive: true },
    orderBy: { minAmount: "asc" },
  });
  const globalRows =
    companyRows.length === 0
      ? await prisma.taxBracket.findMany({
          where: { companyId: null, year, isActive: true },
          orderBy: { minAmount: "asc" },
        })
      : [];
  const rows = companyRows.length > 0 ? companyRows : globalRows;
  if (rows.length === 0) return DEFAULT_MONTHLY_PAYE_BRACKETS;
  return rows.map((r) => ({
    minAmount: Number(r.minAmount),
    maxAmount: r.maxAmount === null ? null : Number(r.maxAmount),
    ratePercent: Number(r.rate),
  }));
}

function componentInPeriod(
  startDate: Date,
  endDate: Date | null,
  periodStart: Date,
  periodEnd: Date,
): boolean {
  if (startDate > periodEnd) return false;
  if (endDate && endDate < periodStart) return false;
  return true;
}

export async function regeneratePayrunLines(
  payrunId: string,
  actorId: string,
): Promise<{ created: number }> {
  const payrun = await prisma.payrun.findUnique({
    where: { id: payrunId },
    include: {
      company: {
        select: {
          tier2PensionEnabled: true,
          tier2EmployeePercent: true,
          tier2EmployerPercent: true,
          includeAttendanceOvertimeInPayrun: true,
          overtimeHourlyMultiplier: true,
          standardHoursPerMonth: true,
        },
      },
    },
  });
  if (!payrun) throw new Error("Pay run not found");
  if (payrun.status !== "DRAFT") {
    throw new Error("Only draft pay runs can be calculated");
  }

  const periodStart = payrun.periodStart;
  const periodEnd = payrun.periodEnd;
  const year = periodEnd.getFullYear();
  const payeBrackets = await resolvePayeBrackets(payrun.companyId, year);

  const employees = await prisma.employee.findMany({
    where: {
      companyId: payrun.companyId,
      status: "ACTIVE",
      deletedAt: null,
    },
    include: {
      salaryComponents: true,
      loans: { where: { status: "ACTIVE" } },
    },
  });

  return prisma.$transaction(async (tx) => {
    await tx.payrunLine.deleteMany({ where: { payrunId } });

    for (const emp of employees) {
      const basic = Number(emp.basicSalary);
      let allowanceTotal = 0;
      let provident = 0;
      let otherDed = 0;

      for (const c of emp.salaryComponents) {
        if (!componentInPeriod(c.startDate, c.endDate, periodStart, periodEnd)) continue;
        const amt = Number(c.amount);
        if (c.type === "ALLOWANCE") allowanceTotal += amt;
        else if (c.name.toLowerCase().includes("provident")) provident += amt;
        else otherDed += amt;
      }

      const componentAllowanceTotal = allowanceTotal;

      let overtimePay = 0;
      let overtimeHoursInPeriod = 0;
      if (payrun.company.includeAttendanceOvertimeInPayrun) {
        const checkins = await prisma.checkIn.findMany({
          where: {
            employeeId: emp.id,
            clockIn: { gte: periodStart, lte: periodEnd },
          },
          select: { overtimeHours: true },
        });
        overtimeHoursInPeriod = checkins.reduce(
          (s, c) => s + (c.overtimeHours ? Number(c.overtimeHours) : 0),
          0,
        );
        if (overtimeHoursInPeriod > 0 && basic > 0) {
          const stdHours = Number(payrun.company.standardHoursPerMonth) || 173;
          const mult = Number(payrun.company.overtimeHourlyMultiplier) || 1.5;
          const hourly = basic / stdHours;
          overtimePay = Math.round(overtimeHoursInPeriod * hourly * mult * 100) / 100;
          allowanceTotal = componentAllowanceTotal + overtimePay;
        }
      }

      let loanMonthly = 0;
      for (const l of emp.loans) {
        loanMonthly += Number(l.monthlyRepayment);
      }

      const applySsnit = emp.employmentType !== "CONTRACTOR";
      const calc = calculatePayroll({
        basicSalary: basic,
        allowanceTotal,
        otherDeductionsTotal: provident + loanMonthly + otherDed,
        payeBrackets,
        applySsnit,
      });

      const tier2On =
        payrun.company.tier2PensionEnabled &&
        applySsnit &&
        emp.employmentType !== "CONTRACTOR";
      const t2eePct = Number(payrun.company.tier2EmployeePercent) / 100;
      const t2erPct = Number(payrun.company.tier2EmployerPercent) / 100;
      const tier2Employee = tier2On ? Math.round(basic * t2eePct * 100) / 100 : 0;
      const tier2Employer = tier2On ? Math.round(basic * t2erPct * 100) / 100 : 0;

      const totalDed =
        calc.ssnitEmployee +
        calc.payeTax +
        provident +
        loanMonthly +
        otherDed +
        tier2Employee;
      const netPay = calc.netPay - tier2Employee;

      await tx.payrunLine.create({
        data: {
          payrunId,
          employeeId: emp.id,
          grossPay: moneyDec(calc.grossPay),
          ssnitEmployee: moneyDec(calc.ssnitEmployee),
          ssnitEmployer: moneyDec(calc.ssnitEmployer),
          taxablePay: moneyDec(calc.taxablePay),
          payeTax: moneyDec(calc.payeTax),
          provident: moneyDec(provident),
          loanDeductions: moneyDec(loanMonthly),
          otherDeductions: moneyDec(otherDed),
          tier2Employee: moneyDec(tier2Employee),
          tier2Employer: moneyDec(tier2Employer),
          totalDeductions: moneyDec(totalDed),
          netPay: moneyDec(netPay),
          salarySnapshot: JSON.parse(
            JSON.stringify({
              basicSalary: basic,
              employmentType: emp.employmentType,
              allowanceTotal: componentAllowanceTotal,
              overtimeHoursInPeriod,
              overtimePay,
              overtimeMultiplier: Number(payrun.company.overtimeHourlyMultiplier),
              provident,
              loanDeductions: loanMonthly,
              otherDeductions: otherDed,
              tier2Employee,
           tier2Employer,
              tier2Enabled: tier2On,
              payeBracketsYear: year,
              breakdown: calc.breakdown,
              chargeableIncome: calc.chargeableIncome,
            }),
          ) as Prisma.InputJsonValue,
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actorId,
        action: "PAYRUN_LINES_GENERATED",
        entityType: "Payrun",
        entityId: payrunId,
        afterState: { employeeCount: employees.length } as Prisma.InputJsonValue,
      },
    });

    return { created: employees.length };
  });
}
