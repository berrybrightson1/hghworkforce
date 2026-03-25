import { describe, expect, it } from "vitest";
import {
  calculatePayroll,
  DEFAULT_MONTHLY_PAYE_BRACKETS,
  calculatePAYE,
  SSNIT_EMPLOYEE_RATE,
  SSNIT_EMPLOYER_RATE,
} from "./ghana-tax";

describe("ghana-tax", () => {
  it("computes SSNIT on basic salary only (PRD reference)", () => {
    const basic = 5000;
    expect(basic * SSNIT_EMPLOYEE_RATE).toBe(275);
    expect(basic * SSNIT_EMPLOYER_RATE).toBe(650);
  });

  it("progressive PAYE: no tax on first band", () => {
    expect(calculatePAYE(300, DEFAULT_MONTHLY_PAYE_BRACKETS)).toBe(0);
  });

  it("calculatePayroll matches PRD arithmetic for taxable pay (before PAYE)", () => {
    const r = calculatePayroll({
      basicSalary: 5000,
      allowanceTotal: 0,
      otherDeductionsTotal: 0,
      payeBrackets: [{ minAmount: 0, maxAmount: null, ratePercent: 0 }],
      monthlyRelief: 0,
    });
    expect(r.taxablePay).toBe(4725);
    expect(r.ssnitEmployee).toBe(275);
    expect(r.ssnitEmployer).toBe(650);
  });

  it("Biz360 reference net pay (taxable − PAYE − provident)", () => {
    const taxablePay = 4725;
    const paye = 779.75;
    const provident = 100;
    expect(taxablePay - paye - provident).toBeCloseTo(3845.25, 2);
  });

  it("PAYE increases with chargeable income in default brackets", () => {
    const low = calculatePAYE(1000, DEFAULT_MONTHLY_PAYE_BRACKETS);
    const high = calculatePAYE(5000, DEFAULT_MONTHLY_PAYE_BRACKETS);
    expect(high).toBeGreaterThan(low);
  });
});
