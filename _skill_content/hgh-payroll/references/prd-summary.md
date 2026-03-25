# HGH Payroll — PRD Feature Summary

## Employee Management
- Profiles: name, employeeCode (e.g. HSL-0042), department, job title, employment type, start date, status
- Salary structure: basic salary + allowance components + recurring deductions
- Encrypted fields: bank account, SSNIT number, TIN
- Document uploads (ID, contract) → Vercel Blob, signed URLs only
- Bulk CSV import with Zod validation
- Soft delete only — records never permanently removed
- **Check-in module (when enabled):** optional face enrollment on the employee record — see *Facial recognition* under Enterprise Check-in; HR may initiate “Register employee face” from profile

## Payrun Workflow
1. HR creates Draft payrun → system calculates all employees
2. HR reviews, can override individual lines with a reason note
3. HR submits → status PENDING
4. Admin approves (sets `lockedAt`) or rejects with comment
5. On approval: payslips auto-generated, optionally emailed via Resend
- Each payrun stores `salarySnapshot` JSON — historical changes don't affect past runs

## Payslip Generation
- PDF via `@react-pdf/renderer` — HGH branded template
- Bulk ZIP download for entire payrun
- Individual download per employee
- Stored permanently in Vercel Blob, linked to PayrunLine
- Email delivery via Resend with HGH-branded HTML template
- **Future (check-in integration):** optional attendance summary block on payslip for the pay period (when Enterprise Check-in is enabled)

## Leave Management
- Leave types per company: Annual, Sick, Maternity, Paternity, Compassionate, Unpaid
- Configurable entitlement per employee, prorated by start date
- Employee submits → HR/Admin approves or rejects
- Approved Unpaid leave auto-creates deduction for next payrun
- Leave balance tracker: entitlement minus used days
- Leave calendar view for HR
- **Cross-reference (check-in):** leave dates vs check-in records for accuracy audits (enterprise module)

## Loan & Salary Advance Tracker
- HR creates loan/advance: amount, disbursement date, monthly installment
- Auto-generates recurring `SalaryComponent (DEDUCTION)` entries for each payrun
- Outstanding balance + repayment progress bar
- Employee self-service view: own loan status only
- Auto-closes when balance = 0
- Multiple active loans per employee supported

---

## Enterprise Check-in Module (tenant opt-in)
Subscribing tenants get IP-gated access, granular check-in event logging, optional facial verification before clock-in, and admin tooling. **Implementation is incremental;** today’s product may ship GPS-only check-in until this module is fully delivered.

### 1. IP restriction system
- Per-tenant **`allowedIPs`**: each row has **IP address**, **label** (e.g. “Main Office”, “Warehouse”, “Branch 2”), **isActive**, audit timestamps
- **Middleware (Next.js):** resolve employee’s **public IP** before check-in routes render; if not in tenant’s approved list → **branded “Access denied — not on an approved network”** with office contact; do not load check-in UI
- **Onboarding:** optional auto-capture “your current IP registered as office IP” on first Check-in module setup
- **Change requests:** in-app **IP access request** form → **Super Admin** approves/rejects → tenant notified (toast + email)
- **Logging:** every blocked attempt → IP, timestamp, attempted user/employee → visible to tenant admin
- **Dynamic ISP IPs:** tenant admin **“re-register current IP”** with confirmation step (replace or add per product rules)

### 2. Check-in sequence & event logging (state machine)
Treat check-in as **event-sourced**, not a single boolean.

**Session:** on portal load for check-in, issue **`checkinSessionId`** (UUID); all events reference it.

**Events (enum + metadata JSON + timestamp):**

| Event | Captures (minimum) |
|-------|-------------------|
| `PORTAL_OPENED` | IP, device, browser |
| `FACE_SCAN_STARTED` | Camera initialized |
| `FACE_SCAN_FAILED` | Attempt count, reason (optional) |
| `FACE_SCAN_PASSED` | Identity verification OK |
| `CHECKIN_CLICKED` | Client timestamp |
| `CHECKIN_CONFIRMED` | Server acknowledged clock-in/out |
| `SESSION_DROPPED` | Browser closed / connection lost mid-flow |

**Interrupted sessions:** e.g. `PORTAL_OPENED` + `FACE_SCAN_PASSED` but no `CHECKIN_CONFIRMED` → admin UI **yellow “Interrupted — likely present”** for manual resolution (vs absent).

**Realtime:** WebSocket or **SSE** to admin **“Who’s checking in now”** live feed (optional phase 2).

### 3. Facial recognition (architecture decision required)
**Goal:** reduce buddy punching — match live face to **this** employee’s enrolled template (1:1).

**Options (ranked by ops complexity):**
- **A — face-api.js (client-side):** TensorFlow.js in browser; 128-D descriptor; store as JSON array; Euclidean distance vs threshold. *Pros:* no per-call fee, optional privacy (no image to cloud). *Cons:* model load ~6MB, lighting-sensitive, not bank-grade.
- **B — AWS Rekognition / Azure Face:** image to cloud; confidence scores. *Pros:* strong accuracy. *Cons:* cost, data leaves stack, compliance review, requires connectivity at check-in.
- **C — Hybrid (recommended in spec):** cloud only at **registration** for high-quality reference descriptor; **client-side** comparison each check-in — *final choice TBD in engineering spike.*

**Registration flow (target):**
1. HR opens **Register employee face** on employee profile (employee present or guided self-service with strong auth).
2. Camera: straight, left, right (3 captures); derive descriptors → **single averaged stored vector** (or vendor-specific reference ID).
3. Persist `faceDescriptor` (JSON number array) and **`faceRegisteredAt`** on employee (or separate `EmployeeFaceEnrollment` table).

**Check-in flow (target):**
1. IP middleware passes → check-in page loads, session created.
2. Camera on; real-time match vs stored descriptor; above threshold → green, **Check In** enabled.
3. Max attempts → **locked out**, `FACE_MISMATCH` events; optional **snapshot** to blob + **FaceMismatchAlert** to admins.

**Rejection & review:** admin inbox for mismatches, photo review, manual override, repeat-offender flagging.

### Data models (Enterprise Check-in)
| Model | Purpose |
|-------|---------|
| `CheckinModule` | Tenant opt-in, settings (max face attempts, distance threshold, feature flags) |
| `AllowedIP` | `companyId`, `ipAddress`, `label`, `isActive`, `approvedAt`, … |
| `IPAccessRequest` | `companyId`, `requestedIP`, `reason`, `status`, `reviewedBy`, … |
| `CheckinSession` | `id`, `employeeId`, `companyId`, `ipUsed`, device info, `createdAt`, … |
| `CheckinEvent` | `sessionId`, `event` (enum), `metadata` JSON, `createdAt` |
| `CheckinRecord` | Existing row: clock in/out; extend with `manualOverride`, link to session final state as needed |
| `FaceMismatchAlert` | `employeeId`, `sessionId`, `capturedPhotoUrl`, `reviewedBy`, `resolved`, … |

*(Align names with Prisma schema when implemented.)*

### Admin dashboard (Check-in)
- Live feed: sessions mid-flow (when realtime transport exists)
- **Daily board:** green (confirmed), yellow (interrupted), red (absent), grey (weekend/leave)
- **Mismatch inbox:** photos, resolve / escalate
- **IP requests:** approve/reject with notes
- **Exports:** daily/monthly attendance Excel for payroll and audits

### Integration with payroll (when module is on)
- Approved **unpaid absences** → deduction in next payrun (existing leave rule)
- **Late arrivals** over configurable monthly threshold → configurable deduction rule (product-defined)
- Leave vs **check-in** cross-check for disputes
- **Payslip:** optional attendance summary line for the period

---

## Employee Self-Service Portal (`/portal`)
- Mobile-first, responsive
- Own payslips: list + PDF download
- Profile view (no bank details shown)
- Leave balance + request submission
- Loan/advance balance + repayment schedule
- Dashboard: last payslip summary, YTD earnings, leave days remaining
- **Check-in:** when Enterprise Check-in is enabled for the tenant — **IP allowlist enforced in middleware**; **event-logged** session; **face verification** before confirm (per chosen stack); today’s shipped app may use **GPS/geofence** as additional signal until face + IP are fully live

## Reports & Exports
- Monthly payroll summary → Excel/CSV (all employees, full breakdown)
- SSNIT contribution report (formatted for SSNIT portal)
- PAYE tax summary (for GRA filing)
- P9A Year-to-date tax certificate per employee
- Headcount report by department and company
- Loan/advance outstanding balances report
- Export via `exceljs`
- **Enterprise Check-in:** attendance exports (daily/monthly) as specified above

## Dashboard Analytics (Super Admin)
- Total monthly payroll cost: combined + per company
- Headcount trend chart (12 months) — Recharts
- SSNIT liability by company
- Payroll cost vs manual revenue input per company

## Audit Trail
- Every mutation → immutable `AuditLog` record
- Fields: actorId, action, entityType, entityId, beforeState (JSON), afterState (JSON), ipAddress, createdAt
- Never deletable, even by Super Admin
- Viewer in Super Admin settings: filter by user, company, date, action type
- Salary history: every change logs old + new values with actor + timestamp
- **Enterprise Check-in:** blocked IP attempts, IP approval decisions, and face mismatch resolutions should be auditable (either `AuditLog` or dedicated append-only tables)

## Security Controls
- MFA: mandatory for SUPER_ADMIN and COMPANY_ADMIN (via Clerk)
- Session timeout: 30 min (admins), 60 min (employees)
- AES-256 encryption at rest for sensitive fields
- Row-Level Security via Prisma middleware (all queries scoped by companyId)
- Vercel Blob: private, signed URLs (1 hour expiry)
- Rate limiting: Upstash Redis (100 req/min public, 500 req/min authenticated)
- CSP, HSTS, X-Frame-Options in Next.js middleware
- Brute-force protection: account locked after 5 failed attempts (30 min)
- **Enterprise Check-in:** IP allowlist at edge/middleware; face descriptors and mismatch photos subject to retention and privacy policy

## GRA Tax Settings (Super Admin)
- `TaxBracket` table: year, minAmount, maxAmount, rate, isActive
- Editable in UI — updated annually when GRA publishes new brackets
- PAYE calculated against active brackets for the payrun's year

## Open decisions (engineering)
- **Facial recognition stack:** confirm **face-api.js only**, **cloud-only**, or **hybrid** after spike (accuracy, cost, legal).
- **Realtime admin feed:** WebSocket vs SSE vs polling for v1.
