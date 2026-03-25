# HGH Payroll — Full Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum UserRole {
  SUPER_ADMIN
  COMPANY_ADMIN
  HR
  EMPLOYEE
}

enum EmploymentType {
  FULL_TIME
  PART_TIME
  CONTRACTOR
}

enum EmployeeStatus {
  ACTIVE
  SUSPENDED
  TERMINATED
}

enum SalaryComponentType {
  ALLOWANCE
  DEDUCTION
}

enum PayrunStatus {
  DRAFT
  PENDING
  APPROVED
  REJECTED
}

enum LeaveType {
  ANNUAL
  SICK
  MATERNITY
  PATERNITY
  COMPASSIONATE
  UNPAID
}

enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum LoanType {
  LOAN
  ADVANCE
}

enum LoanStatus {
  ACTIVE
  COMPLETED
  CANCELLED
}

// ─── Models ───────────────────────────────────────────────────────────────────

model Company {
  id                 String     @id @default(cuid())
  name               String
  logoUrl            String?
  registrationNumber String?
  address            String?
  isActive           Boolean    @default(true)
  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt

  users              User[]
  employees          Employee[]
  payruns            Payrun[]
  taxBrackets        TaxBracket[]
  leaveEntitlements  LeaveEntitlement[]

  @@index([isActive])
}

model User {
  id        String   @id @default(cuid())
  clerkId   String   @unique
  email     String   @unique
  name      String
  role      UserRole
  isActive  Boolean  @default(true)
  companyId String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  company   Company?   @relation(fields: [companyId], references: [id])
  employee  Employee?
  auditLogs AuditLog[]

  @@index([clerkId])
  @@index([companyId, role])
}

model Employee {
  id                   String         @id @default(cuid())
  employeeCode         String         @unique  // e.g. HSL-0042
  userId               String?        @unique
  companyId            String
  department           String
  jobTitle             String
  employmentType       EmploymentType @default(FULL_TIME)
  startDate            DateTime
  status               EmployeeStatus @default(ACTIVE)
  basicSalary          Decimal        @db.Decimal(12, 2)
  // Encrypted fields — stored as encrypted base64 strings
  ssnitEncrypted       String?
  tinEncrypted         String?
  bankNameEncrypted    String?
  bankAccountEncrypted String?
  bankBranchEncrypted  String?
  // Next of kin
  nokName              String?
  nokPhone             String?
  nokRelationship      String?
  createdAt            DateTime       @default(now())
  updatedAt            DateTime       @updatedAt
  deletedAt            DateTime?      // Soft delete only

  company          Company          @relation(fields: [companyId], references: [id])
  user             User?            @relation(fields: [userId], references: [id])
  salaryComponents SalaryComponent[]
  payrunLines      PayrunLine[]
  payslips         Payslip[]
  leaveRequests    LeaveRequest[]
  loans            Loan[]

  @@index([companyId, status])
  @@index([employeeCode])
}

model SalaryComponent {
  id          String              @id @default(cuid())
  employeeId  String
  type        SalaryComponentType
  name        String              // e.g. "Housing Allowance", "Provident Fund"
  amount      Decimal             @db.Decimal(12, 2)
  isRecurring Boolean             @default(true)
  startDate   DateTime            @default(now())
  endDate     DateTime?
  note        String?
  createdAt   DateTime            @default(now())

  employee Employee @relation(fields: [employeeId], references: [id])

  @@index([employeeId, type])
}

model Payrun {
  id            String       @id @default(cuid())
  companyId     String
  periodStart   DateTime
  periodEnd     DateTime
  status        PayrunStatus @default(DRAFT)
  note          String?
  createdById   String
  submittedById String?
  approvedById  String?
  rejectedById  String?
  rejectionNote String?
  approvedAt    DateTime?
  lockedAt      DateTime?    // Set on APPROVED — immutable after this
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  company  Company      @relation(fields: [companyId], references: [id])
  lines    PayrunLine[]

  @@index([companyId, status])
  @@index([periodStart, periodEnd])
}

model PayrunLine {
  id             String  @id @default(cuid())
  payrunId       String
  employeeId     String
  // Calculated values (snapshot at time of payrun)
  grossPay       Decimal @db.Decimal(12, 2)
  ssnitEmployee  Decimal @db.Decimal(12, 2)
  ssnitEmployer  Decimal @db.Decimal(12, 2)
  taxablePay     Decimal @db.Decimal(12, 2)
  payeTax        Decimal @db.Decimal(12, 2)
  provident      Decimal @db.Decimal(12, 2) @default(0)
  loanDeductions Decimal @db.Decimal(12, 2) @default(0)
  otherDeductions Decimal @db.Decimal(12, 2) @default(0)
  totalDeductions Decimal @db.Decimal(12, 2)
  netPay         Decimal @db.Decimal(12, 2)
  isOverridden   Boolean @default(false)
  overrideNote   String?
  // Full salary state at time of calculation
  salarySnapshot Json

  payrun   Payrun   @relation(fields: [payrunId], references: [id])
  employee Employee @relation(fields: [employeeId], references: [id])
  payslip  Payslip?

  @@unique([payrunId, employeeId])
  @@index([payrunId])
}

model Payslip {
  id            String    @id @default(cuid())
  payrunLineId  String    @unique
  employeeId    String
  pdfUrl        String    // Vercel Blob URL
  emailedAt     DateTime?
  downloadCount Int       @default(0)
  createdAt     DateTime  @default(now())

  payrunLine PayrunLine @relation(fields: [payrunLineId], references: [id])
  employee   Employee   @relation(fields: [employeeId], references: [id])

  @@index([employeeId])
}

model LeaveEntitlement {
  id        String    @id @default(cuid())
  companyId String
  leaveType LeaveType
  days      Int       // Annual entitlement days
  isActive  Boolean   @default(true)

  company Company @relation(fields: [companyId], references: [id])

  @@unique([companyId, leaveType])
}

model LeaveRequest {
  id           String      @id @default(cuid())
  employeeId   String
  type         LeaveType
  startDate    DateTime
  endDate      DateTime
  days         Int
  status       LeaveStatus @default(PENDING)
  note         String?
  approvedById String?
  approvedAt   DateTime?
  rejectionNote String?
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  employee Employee @relation(fields: [employeeId], references: [id])

  @@index([employeeId, status])
  @@index([startDate, endDate])
}

model Loan {
  id               String     @id @default(cuid())
  employeeId       String
  type             LoanType
  amount           Decimal    @db.Decimal(12, 2)
  balance          Decimal    @db.Decimal(12, 2)
  monthlyRepayment Decimal    @db.Decimal(12, 2)
  disbursedAt      DateTime
  status           LoanStatus @default(ACTIVE)
  note             String?
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt

  employee Employee @relation(fields: [employeeId], references: [id])

  @@index([employeeId, status])
}

model TaxBracket {
  id        String   @id @default(cuid())
  companyId String?  // null = global default, set = company override
  year      Int
  minAmount Decimal  @db.Decimal(12, 2)
  maxAmount Decimal? @db.Decimal(12, 2)  // null = unlimited (top bracket)
  rate      Decimal  @db.Decimal(5, 2)   // percentage e.g. 20.00
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  company Company? @relation(fields: [companyId], references: [id])

  @@index([year, isActive])
}

model AuditLog {
  id          String   @id @default(cuid())
  actorId     String
  action      String   // e.g. "PAYRUN_APPROVED", "EMPLOYEE_SALARY_UPDATED"
  entityType  String   // e.g. "Payrun", "Employee"
  entityId    String
  beforeState Json?
  afterState  Json?
  ipAddress   String?
  createdAt   DateTime @default(now())

  actor User @relation(fields: [actorId], references: [id])

  @@index([actorId])
  @@index([entityType, entityId])
  @@index([createdAt])
}
```
