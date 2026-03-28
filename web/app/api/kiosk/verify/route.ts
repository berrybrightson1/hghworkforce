import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeKioskCompanyId } from "@/lib/kiosk-company-id";
import { generateChallengeCode, CHALLENGE_TTL_MS } from "@/lib/kiosk-challenge";

/** Trim, strip BOM, normalize unicode dashes to ASCII hyphen for pasted codes. */
function normalizeKioskEmployeeCodeInput(raw: string): string {
  return raw
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, "-");
}

function normalizePersonName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function nameMatchesEmployee(displayName: string, employeeName: string | null, userName: string | null) {
  const target = normalizePersonName(displayName);
  if (!target) return false;
  const candidates = [employeeName, userName]
    .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
    .map(normalizePersonName);
  return candidates.some((c) => c === target);
}

/**
 * POST /api/kiosk/verify
 * Body: { companyId, employeeCode, displayName }
 *
 * Creates a KioskChallenge (QR code + 6-digit code) for device-bound verification.
 */
export async function POST(req: NextRequest) {
  let body: { companyId?: string; employeeCode?: string; displayName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const companyId = normalizeKioskCompanyId(
    typeof body.companyId === "string" ? body.companyId : undefined,
  );
  const employeeCode =
    typeof body.employeeCode === "string"
      ? normalizeKioskEmployeeCodeInput(body.employeeCode)
      : "";
  const displayName = typeof body.displayName === "string" ? body.displayName : "";

  if (!companyId || !employeeCode || !displayName.trim()) {
    return NextResponse.json(
      { error: "companyId, employeeCode, and displayName are required" },
      { status: 400 },
    );
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json(
        {
          error: "Company not found",
          hint:
            "No row in Company with this id in the database your server uses (DATABASE_URL). Copy the kiosk URL from Dashboard → Settings → Office kiosk, or check Supabase → Company → id matches the ?c= value.",
          receivedCompanyId: companyId,
        },
        { status: 404 },
      );
    }

    const employee = await prisma.employee.findFirst({
      where: {
        employeeCode: { equals: employeeCode, mode: "insensitive" },
        companyId,
        deletedAt: null,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    if (!employee || employee.status !== "ACTIVE") {
      return NextResponse.json(
        {
          error: "Employee not found or inactive for this company",
          hint:
            "Enter the full auto-assigned code (three parts with hyphens, e.g. PREFIX-ABC123-0001) exactly as shown on Dashboard → Employees or your payslip.",
        },
        { status: 401 },
      );
    }

    if (!nameMatchesEmployee(displayName, employee.name, employee.user?.name ?? null)) {
      return NextResponse.json(
        {
          error: "Name does not match our records for this code",
          hint:
            "Type your full name exactly as it appears on your employee profile (same spelling and order as HR saved it).",
        },
        { status: 401 },
      );
    }

    const openCheckIn = await prisma.checkIn.findFirst({
      where: { employeeId: employee.id, status: "CLOCKED_IN" },
      select: { id: true },
    });

    // Create a challenge for QR-based device verification
    const code = generateChallengeCode();
    const challenge = await prisma.kioskChallenge.create({
      data: {
        companyId,
        employeeId: employee.id,
        code,
        expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
      },
    });

    return NextResponse.json({
      challengeId: challenge.id,
      employeeId: employee.id,
      displayLabel: employee.name ?? employee.user?.name ?? employeeCode,
      clockedIn: openCheckIn != null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
