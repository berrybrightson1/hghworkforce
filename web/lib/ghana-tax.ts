/**
 * Ghana payroll: SSNIT + progressive PAYE on chargeable income.
 * All product tax math must go through this module (HGH skill / PRD).
 *
 * PAYE brackets should be loaded from `TaxBracket` (editable by Super Admin).
 * Align seed data with current GRA monthly bands; add statutory reliefs when required.
 */

export const SSNIT_EMPLOYEE_RATE = 0.055;
export const SSNIT_EMPLOYER_RATE = 0.13;

export interface TaxBracketInput {
  minAmount: number;
  maxAmount: number | null;
  ratePercent: number;
}

export interface DeductionLine {
  code: string;
  label: string;
  amount: number;
}

export interface PayrollCalculationInput {
  basicSalary: number;
  /** Sum of recurring + one-off allowances for the period */
  allowanceTotal: number;
  /** Other employee deductions (excl. SSNIT employee & PAYE), e.g. provident, loans */
  otherDeductionsTotal: number;
  /** Monthly PAYE brackets (GRA), sorted by minAmount ascending */
  payeBrackets: TaxBracketInput[];
  /** Optional chargeable-income adjustment (e.g. statutory monthly reliefs) */
  monthlyRelief?: number;
  /** If false, skip SSNIT (e.g. some contractors) */
  applySsnit?: boolean;
}

export interface PayrollCalculation {
  grossPay: number;
  ssnitEmployee: number;
  ssnitEmployer: number;
  taxablePay: number;
  chargeableIncome: number;
  payeTax: number;
  providentAndOther: number;
  netPay: number;
  breakdown: DeductionLine[];
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculatePAYE(
  chargeableIncome: number,
  brackets: TaxBracketInput[],
): number {
  if (chargeableIncome <= 0) return 0;

  const sorted = [...brackets].sort((a, b) => a.minAmount - b.minAmount);
  let tax = 0;
  let remaining = chargeableIncome;

  for (const bracket of sorted) {
    if (remaining <= 0) break;

    const upper = bracket.maxAmount;
    const bandWidth =
      upper === null
        ? Number.POSITIVE_INFINITY
        : Math.max(0, upper - bracket.minAmount);

    const taxableInBand = Math.min(remaining, bandWidth);
    if (taxableInBand <= 0) continue;

    tax += taxableInBand * (bracket.ratePercent / 100);
    remaining -= taxableInBand;
  }

  return roundMoney(tax);
}

/** Default GRA-style monthly bands from project reference (verify yearly with GRA). */
export const DEFAULT_MONTHLY_PAYE_BRACKETS: TaxBracketInput[] = [
  { minAmount: 0, maxAmount: 402, ratePercent: 0 },
  { minAmount: 402, maxAmount: 510, ratePercent: 5 },
  { minAmount: 510, maxAmount: 840, ratePercent: 10 },
  { minAmount: 840, maxAmount: 1000, ratePercent: 17.5 },
  { minAmount: 1000, maxAmount: 4166.67, ratePercent: 25 },
  { minAmount: 4166.67, maxAmount: null, ratePercent: 30 },
];

export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculation {
  const applySsnit = input.applySsnit !== false;
  const grossPay = roundMoney(input.basicSalary + input.allowanceTotal);
  const ssnitEmployee = applySsnit
    ? roundMoney(input.basicSalary * SSNIT_EMPLOYEE_RATE)
    : 0;
  const ssnitEmployer = applySsnit
    ? roundMoney(input.basicSalary * SSNIT_EMPLOYER_RATE)
    : 0;
  const taxablePay = roundMoney(grossPay - ssnitEmployee);
  const relief = input.monthlyRelief ?? 0;
  const chargeableIncome = roundMoney(Math.max(0, taxablePay - relief));
  const payeTax = calculatePAYE(chargeableIncome, input.payeBrackets);
  const providentAndOther = roundMoney(input.otherDeductionsTotal);
  const netPay = roundMoney(taxablePay - payeTax - providentAndOther);

  const breakdown: DeductionLine[] = [
    { code: "SSNIT_EE", label: "SSNIT (Employee)", amount: ssnitEmployee },
    { code: "PAYE", label: "PAYE", amount: payeTax },
  ];
  if (providentAndOther > 0) {
    breakdown.push({
      code: "OTHER",
      label: "Other deductions",
      amount: providentAndOther,
    });
  }

  return {
    grossPay,
    ssnitEmployee,
    ssnitEmployer,
    taxablePay,
    chargeableIncome,
    payeTax,
    providentAndOther,
    netPay,
    breakdown,
  };
}
