---
name: hgh-payroll
description: >
  Full project context and build guide for the HGH (Hoggar Global Holdings) Payroll
  Management System. Use this skill for ANY task related to this project — writing code,
  building components, designing schemas, writing API routes, generating payslips, 
  calculating Ghana taxes, designing UI, writing tests, or continuing any feature from
  the PRD. Triggers on: "hgh payroll", "hoggar", "hobort", "payroll system", "ghana tax",
  "payslip", "SSNIT", "PAYE", "hgh component", "hgh design", "hgh feature", "build the
  payroll", "continue the project", or any reference to the multi-company payroll app.
  Always use this skill before writing any code for this project.
---

# HGH Payroll — Project Skill

**Owner:** Hoggar Global Holdings (HGH)
**Businesses:** Hobort Shipping & Logistics · Hobort Auto Parts Express
**Deploy target:** Vercel (Next.js 14, App Router)
**Full PRD:** See `references/prd-summary.md` for complete feature list.

---

## Non-Negotiable Rules (enforce on every task)

1. **No emoji anywhere in the UI** — use **Lucide React** icons (`lucide-react`), not Material Symbols
2. **No native browser alerts** — use the HGH Toast system (`useToast()` hook) for all feedback
3. **No default Tailwind colors** — only HGH brand tokens (see Design System below)
4. **No shadcn defaults** — extend with HGH `cva` variants in every component
5. **All tax math** goes through `lib/ghana-tax.ts` — never inline calculations
6. **All API routes** must verify **Supabase Auth** (`requireDbUser`) + role before any DB call
7. **All DB queries** must be scoped by `companyId` from session context (unless Super Admin)
8. **Sensitive or security-relevant state changes** should write to `AuditLog` where applicable
9. **Approved payruns are immutable** — check locking rules in API routes before mutations
10. **Forms use React Hook Form + Zod** — no ad-hoc validation logic

---

## Tech Stack

| Layer | Package | Notes |
|---|---|---|
| Framework | Next.js 15+ App Router | `/app` directory, server components default |
| Styling | Tailwind CSS | Custom HGH token config only |
| Components | shadcn/ui (headless) + custom | Always override with HGH variants |
| Icons | **Lucide React** | `import { Icon } from "lucide-react"` |
| Toast | Custom HGH Toast | See Toast System section |
| Database | **PostgreSQL on Supabase** | `DATABASE_URL` + `DIRECT_URL` in Prisma |
| ORM | Prisma | Schema in `web/prisma/schema.prisma`; user runs migrations / SQL on Supabase |
| Auth | **Supabase Auth** + app `User` row | RBAC: SUPER_ADMIN, COMPANY_ADMIN, HR, EMPLOYEE |
| PDF | @react-pdf/renderer | Branded payslip output |
| Forms | React Hook Form + Zod | All forms |
| Email | Resend (if configured) | Payslip delivery + notifications |
| Rate Limit | Upstash Redis | Middleware + API when env present |
| Charts | Recharts | Dashboard analytics |
| Blobs | Vercel Blob | Employee docs + payslip PDFs |

---

## HGH Design System

### Brand Tokens — `tailwind.config.ts`

```ts
colors: {
  hgh: {
    navy:       '#0A1628',  // Primary bg, navbars, headers
    'navy-light': '#1A2E4A', // Hover states on navy
    gold:       '#C9A84C',  // Accents, CTAs, active states
    'gold-light': '#F5E6C0', // Badge backgrounds, hover
    slate:      '#2D3748',  // Body text, labels
    muted:      '#6B7280',  // Placeholders, metadata
    offwhite:   '#F8F7F4',  // Page backgrounds, alternating rows
    border:     '#E2E8F0',  // All dividers and borders
    success:    '#0D9488',  // Success toasts, approved badges
    danger:     '#DC2626',  // Error toasts, rejected badges
    warning:    '#C9A84C',  // Warning toasts (same as gold)
  }
}
```

### Icon Usage Pattern

```tsx
// Import once in layout via Google Fonts CDN
// <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined" rel="stylesheet" />

// Usage — always with size class, never hardcoded px in style
<span className="material-symbols-outlined text-hgh-gold text-[20px]">
  payments
</span>

// Common icons for this project:
// payments, group, business, receipt_long, check_circle,
// error, warning, info, logout, settings, download,
// calendar_month, account_balance, trending_up, add_circle
```

### Component Patterns

All components live in `components/ui/` and use `cva` for variants:

```tsx
// Example: HGH Button
const buttonVariants = cva(
  'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-hgh-gold focus:ring-offset-2',
  {
    variants: {
      variant: {
        primary:   'bg-hgh-gold text-hgh-navy hover:bg-hgh-gold/90',
        secondary: 'bg-hgh-navy text-white hover:bg-hgh-navy-light',
        ghost:     'text-hgh-slate hover:bg-hgh-offwhite',
        danger:    'bg-hgh-danger text-white hover:bg-hgh-danger/90',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
      }
    },
    defaultVariants: { variant: 'primary', size: 'md' }
  }
)
```

---

## Toast System (TikTok-Style)

**Location:** `components/toast/` — `ToastProvider.tsx`, `Toast.tsx`, `useToast.ts`

### Behavior Spec
- Slides in from **bottom-right** with spring animation (`cubic-bezier(0.34, 1.56, 0.64, 1)`)
- Auto-dismisses after **4 seconds** with a shrinking progress bar at the bottom
- **Stacks** — newer toasts push up; oldest auto-dismisses first
- Swipe-right or click X to manually dismiss
- `role="alert"` on each toast for screen reader accessibility

### Four Variants

| Variant | Background | Icon | Icon color |
|---|---|---|---|
| `success` | `hgh-navy` + teal left border | `check_circle` | `hgh-success` |
| `error` | `hgh-navy` + red left border | `error` | `hgh-danger` |
| `warning` | `hgh-navy` + gold left border | `warning` | `hgh-gold` |
| `info` | `hgh-navy` + navy-light left border | `info` | `white` |

All toasts: white text, `backdrop-blur-sm`, semi-transparent `bg-hgh-navy/95`.

### Usage (everywhere in the app)

```tsx
const { toast } = useToast()

toast.success('Payroll approved for Hobort Shipping & Logistics')
toast.error('PAYE calculation failed — check employee HSL-0042')
toast.warning('3 employees are missing bank details')
toast.info('Payrun submitted for approval')
```

### Implementation Skeleton

```tsx
// components/toast/useToast.ts
export function useToast() {
  const context = useContext(ToastContext)
  return {
    toast: {
      success: (msg: string) => context.add({ variant: 'success', message: msg }),
      error:   (msg: string) => context.add({ variant: 'error',   message: msg }),
      warning: (msg: string) => context.add({ variant: 'warning', message: msg }),
      info:    (msg: string) => context.add({ variant: 'info',    message: msg }),
    }
  }
}
```

Add `<ToastProvider>` at the root of `app/layout.tsx` (alongside Supabase / app providers).

---

## Enterprise Check-in Module

**PRD:** `references/prd-summary.md` (Enterprise Check-in section).

**Implemented primitives (v1):**

| Area | Location / behavior |
|---|---|
| Schema | `Company` check-in flags; `Employee.faceDescriptor`; `CheckinSession`, `CheckinEvent`, `AllowedIP`, `IPAccessRequest`, `FaceMismatchAlert`; `CheckIn.checkinSessionId` |
| IP gate | `GET /api/checkins/ip-gate`; middleware redirects `GET /portal/checkin` → `/portal/checkin/denied` when blocked; API re-checks on `POST /api/checkins` |
| Sessions | `POST /api/checkins/session`; `POST /api/checkins/session/[sessionId]/events`; portal records tab visibility |
| Face | `POST /api/employees/[id]/face-descriptor`; L2 distance in `lib/face-math.ts`; **production UI still expects a camera/embedding pipeline** (e.g. face-api.js); dev-only JSON paste on portal when `NODE_ENV === "development"` |
| Admin UI | Dashboard **Settings** → “Check-in security”; allowed IPs; IP access requests (approve: Company Admin / Super Admin) |
| SQL | Additive section at end of `web/prisma/init-from-schema.sql` — user runs in Supabase SQL Editor after schema sync |

**Auth helpers:** `canManageCheckinSecurity` in `lib/api-auth.ts` (Super Admin, Company Admin, HR).

---

## Ghana Tax Engine — `lib/ghana-tax.ts`

### Calculation Order

```
1. Gross Pay        = Basic Salary + All Allowances
2. SSNIT Employee   = Basic Salary × 5.5%
3. SSNIT Employer   = Basic Salary × 13.0%   (employer cost, shown on payslip)
4. Taxable Pay      = Gross Pay − SSNIT Employee
5. PAYE Tax         = tiered(Taxable Pay)     (from TaxBracket table)
6. Total Deductions = SSNIT Employee + PAYE + Provident + Loans + Custom
7. Net Pay          = Taxable Pay − PAYE − Provident − Loans − Custom Deductions
```

### PAYE Tiered Function Pattern

```ts
export function calculatePAYE(taxablePay: number, brackets: TaxBracket[]): number {
  let tax = 0
  let remaining = taxablePay
  for (const bracket of brackets.sort((a, b) => a.minAmount - b.minAmount)) {
    if (remaining <= 0) break
    const bandSize = bracket.maxAmount === null
      ? remaining
      : Math.min(remaining, bracket.maxAmount - bracket.minAmount)
    tax += bandSize * (bracket.rate / 100)
    remaining -= bandSize
  }
  return Math.round(tax * 100) / 100
}
```

### Key Types

```ts
export interface PayrollCalculation {
  employeeId:     string
  grossPay:       number
  ssnitEmployee:  number
  ssnitEmployer:  number
  taxablePay:     number
  payeTax:        number
  provident:      number
  otherDeductions: number
  netPay:         number
  breakdown:      DeductionLine[]
}
```

Always unit test with: Basic = 5,000 → SSNIT Emp = 275, SSNIT Employer = 650, Taxable = 4,725.

---

## Database Schema (Prisma — key models)

See `references/schema.md` for the full Prisma schema. Core models:

- **Company** — `id, name, logo, registrationNumber, isActive`
- **User** — `id, clerkId, role (SUPER_ADMIN|COMPANY_ADMIN|HR|EMPLOYEE), companyId`
- **Employee** — `id, employeeCode, companyId, department, basicSalary, ssnitEncrypted, tinEncrypted, bankAccountEncrypted, status`
- **SalaryComponent** — `employeeId, type (ALLOWANCE|DEDUCTION), name, amount, isRecurring`
- **Payrun** — `id, companyId, periodStart, periodEnd, status (DRAFT|PENDING|APPROVED|REJECTED), lockedAt`
- **PayrunLine** — `payrunId, employeeId, grossPay, ssnitEmployee, ssnitEmployer, taxablePay, payeTax, netPay, salarySnapshot (Json)`
- **Payslip** — `payrunLineId, employeeId, pdfUrl, emailedAt`
- **LeaveRequest** — `employeeId, type, startDate, endDate, status`
- **Loan** — `employeeId, type (LOAN|ADVANCE), amount, balance, monthlyRepayment, status`
- **AuditLog** — `actorId, action, entityType, entityId, beforeState (Json), afterState (Json), ipAddress`
- **TaxBracket** — `year, minAmount, maxAmount, rate, isActive`

### RLS Middleware Pattern

```ts
// lib/prisma.ts — always scope by companyId
const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async $allOperations({ args, query }) {
        // inject companyId from AsyncLocalStorage session context
        return query(args)
      }
    }
  }
})
```

---

## RBAC Roles

| Role | Access Scope |
|---|---|
| `SUPER_ADMIN` | All companies, all features, GRA tax bracket editor, audit logs |
| `COMPANY_ADMIN` | Own company only — can approve/reject payruns |
| `HR` | Own company — manage employees, create payrun drafts, manage leave/loans |
| `EMPLOYEE` | Self-service portal only — own payslips, leave requests, loan balance |

### Clerk Middleware Pattern

```ts
// middleware.ts
export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth()
  const role = sessionClaims?.metadata?.role
  // Protect admin routes
  if (req.nextUrl.pathname.startsWith('/dashboard') && !userId) {
    return redirectToSignIn()
  }
  // Block employees from admin
  if (role === 'EMPLOYEE' && !req.nextUrl.pathname.startsWith('/portal')) {
    return NextResponse.redirect(new URL('/portal', req.url))
  }
})
```

---

## App Routes

```
/                          → Redirect to /login or /dashboard
/login                     → Clerk sign-in (HGH branded)
/dashboard/                → Super Admin home (all companies overview)
/dashboard/companies/      → Company CRUD
/dashboard/employees/      → Employee list + CRUD (scoped to company)
/dashboard/payroll/        → Payrun list, create, review, approve
/dashboard/payroll/[id]    → Payrun detail + line items
/dashboard/leave/          → Leave management
/dashboard/loans/          → Loan & advance tracker
/dashboard/reports/        → Analytics + exports
/dashboard/settings/       → Tax brackets, company settings, audit log
/portal/                   → Employee self-service home
/portal/payslips/          → Employee payslip list + PDF download
/portal/leave/             → Employee leave requests
/portal/loans/             → Employee loan balance
```

---

## Payrun Workflow States

```
DRAFT → PENDING → APPROVED (locked, immutable)
                ↘ REJECTED → (HR creates new draft)
```

Once `lockedAt` is set, reject all mutations at the API layer.

---

## Payslip PDF Structure

Built with `@react-pdf/renderer`. Must include:
- HGH logo top-left, company name top-right
- Employee name, ID, department, pay period
- Earnings table: Basic Salary + each Allowance + Total
- Deductions table: SSNIT Employee, Provident, Loans, Other + Total
- Summary row: Gross Pay | SSNIT Employer (info) | Taxable Pay | PAYE Tax | Net Pay
- Footer: "Powered by HGH Payroll" + generation timestamp

---

## Project Folder Structure

```
hgh-payroll/
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   │   ├── companies/
│   │   ├── employees/
│   │   ├── payroll/
│   │   ├── leave/
│   │   ├── loans/
│   │   ├── reports/
│   │   └── settings/
│   ├── portal/              ← Employee self-service
│   └── api/
├── components/
│   ├── ui/                  ← HGH Design System
│   └── toast/               ← TikTok-style toast
├── lib/
│   ├── ghana-tax.ts         ← Tax engine (unit tested)
│   ├── prisma.ts            ← DB client with RLS
│   ├── audit.ts             ← Audit logger
│   └── pdf/                 ← Payslip renderer
└── prisma/
    └── schema.prisma
```

---

## Reference Files

- `references/prd-summary.md` — Full feature list for all modules (employees, leave, loans, reports)
- `references/schema.md` — Complete Prisma schema ready to copy
- `references/ghana-tax-brackets.md` — Current GRA PAYE brackets + SSNIT rates

Read the relevant reference file when working on a specific module.
