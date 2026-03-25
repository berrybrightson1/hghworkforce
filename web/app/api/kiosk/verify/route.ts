import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getClientIpFromRequest } from "@/lib/checkin-ip";
import { assertCompanyCheckinIpAllowed } from "@/lib/checkin-enforcement";
import { getKioskAuditActorId } from "@/lib/kiosk-audit-actor";
import { signKioskSessionToken } from "@/lib/kiosk-token";
import { normalizeKioskCompanyId } from "@/lib/kiosk-company-id";

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
  const employeeCode = typeof body.employeeCode === "string" ? body.employeeCode.trim() : "";
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
      select: {
        checkinLockToFirstIp: true,
        checkinBoundIp: true,
        checkinEnterpriseEnabled: true,
        checkinEnforceIpAllowlist: true,
        allowedIps: { select: { address: true } },
      },
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

    const clientIp = getClientIpFromRequest(req);
    const actorId = await getKioskAuditActorId(companyId);
    const ipOk = await assertCompanyCheckinIpAllowed({
      companyId,
      company,
      clientIp,
      actorId,
    });

    if (!ipOk.ok) {
      if (actorId) {
        await prisma.auditLog.create({
          data: {
            actorId,
            action: "CHECKIN_IP_BLOCKED",
            entityType: "Company",
            entityId: companyId,
            afterState: { reason: ipOk.logReason, clientIp, source: "kiosk_verify" },
            ipAddress: clientIp,
          },
        });
      }
      return NextResponse.json(
        {
          error:
            ipOk.reason === "ip_mismatch"
              ? "This kiosk is locked to your office PC — open it only on the registered machine."
              : "Check-in not allowed from this network.",
        },
        { status: 403 },
      );
    }

    const employee = await prisma.employee.findFirst({
      where: {
        employeeCode,
        companyId,
        deletedAt: null,
      },
      include: {
        user: { select: { name: true } },
      },
    });

    if (!employee || employee.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Employee not found or inactive for this company" },
        { status: 401 },
      );
    }

    if (!nameMatchesEmployee(displayName, employee.name, employee.user?.name ?? null)) {
      return NextResponse.json({ error: "Name does not match our records for this code" }, { status: 401 });
    }

    const storedFace = employee.faceDescriptor != null;
    if (!storedFace) {
      return NextResponse.json(
        {
          error: "Face profile not enrolled yet.",
          hint:
            "If this person can log into the employee portal: open Portal → Check-in and use Register your face (camera). Otherwise a Company Admin or Super Admin can register it under Dashboard → Employees → open their profile → Check-in face profile.",
        },
        { status: 403 },
      );
    }

    const openCheckIn = await prisma.checkIn.findFirst({
      where: { employeeId: employee.id, status: "CLOCKED_IN" },
      select: { id: true },
    });

    const token = signKioskSessionToken(employee.id, companyId);

    return NextResponse.json({
      token,
      employeeId: employee.id,
      displayLabel: employee.name ?? employee.user?.name ?? employeeCode,
      clockedIn: openCheckIn != null,
      hasFaceEnrolled: true,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
