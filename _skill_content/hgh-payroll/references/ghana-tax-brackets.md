# Ghana Tax Reference — SSNIT & PAYE

## SSNIT Rates (Tier 1 & 2)

| Contributor | Rate | Applied To |
|---|---|---|
| Employee (Tier 1) | 5.5% | Basic Salary |
| Employer (Tier 1 + 2) | 13.0% | Basic Salary |
| Tier 3 / Provident | Configurable | Configurable basis |

**Note:** SSNIT is applied to Basic Salary only, not total allowances.

---

## GRA PAYE Monthly Tax Bands (Ghana — current)

These are the standard GRA monthly income tax brackets. Load into the `TaxBracket` table
on first seed. Super Admin can update these in the UI when GRA publishes revisions.

| Band | Monthly Income (GHS) | Rate |
|---|---|---|
| First | 0 – 402 | 0% |
| Second | 402.01 – 510 | 5% |
| Third | 510.01 – 840 | 10% |
| Fourth | 840.01 – 1,000 | 17.5% |
| Fifth | 1,000.01 – 4,166.67 | 25% |
| Sixth | Above 4,166.67 | 30% |

**Important:** These bands apply to **Taxable Pay** (Gross Pay minus SSNIT Employee contribution).

### Seed Data (Prisma)

```ts
// prisma/seed.ts — seed default GRA brackets for current year
const brackets = [
  { minAmount: 0,       maxAmount: 402,     rate: 0   },
  { minAmount: 402,     maxAmount: 510,     rate: 5   },
  { minAmount: 510,     maxAmount: 840,     rate: 10  },
  { minAmount: 840,     maxAmount: 1000,    rate: 17.5 },
  { minAmount: 1000,    maxAmount: 4166.67, rate: 25  },
  { minAmount: 4166.67, maxAmount: null,    rate: 30  },
]

await prisma.taxBracket.createMany({
  data: brackets.map(b => ({
    year: new Date().getFullYear(),
    minAmount: b.minAmount,
    maxAmount: b.maxAmount,
    rate: b.rate,
    isActive: true,
    companyId: null, // global default
  }))
})
```

---

## Reference Calculation — Hobort Shipping & Logistics

Based on the payslip provided by the client (Biz360 reference):

| Field | Value |
|---|---|
| Basic Salary | GHS 5,000.00 |
| SSNIT Employee (5.5%) | GHS 275.00 |
| Provident | GHS 100.00 |
| Total Earnings (Taxable) | GHS 5,000.00 |
| SSNIT Employer (13%) | GHS 650.00 |
| Taxable Pay | GHS 4,725.00 |
| PAYE Tax | GHS 779.75 |
| Net Pay | GHS 3,845.25 |

This exact output must be reproducible by `calculatePayroll()` in `lib/ghana-tax.ts`.
Use it as the primary unit test assertion.

---

## Important Notes

- **SSNIT has a monthly ceiling** — verify the current ceiling with SSNIT periodically
- **GRA updates brackets annually** — the `TaxBracket` table is editable by Super Admin for this reason
- **Contractors** — typically exempt from SSNIT; employment type determines whether SSNIT applies
- **Prorated salary** — for partial months, prorate `basicSalary` and all allowances before calculation
- **Unpaid leave** — deduct unpaid leave days from gross before any tax calculation
