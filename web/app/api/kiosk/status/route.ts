import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  evaluateKioskClockInGate,
  localDateString,
  localMinutesFromMidnight,
  parseHHmmToMinutes,
} from "@/lib/kiosk-time";
import { normalizeKioskCompanyId } from "@/lib/kiosk-company-id";

/**
 * GET /api/kiosk/status?companyId=
 * Lightweight policy hints for the kiosk UI (unauthenticated).
 */
export async function GET(req: NextRequest) {
  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "companyId is required" }, { status: 400 });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        kioskOfficeOpensAt: true,
        kioskOfficeClosesAt: true,
        kioskCutoffTime: true,
        kioskTimezone: true,
      },
    });

    if (!company) {
      return NextResponse.json(
        {
          error: "Company not found",
          hint:
            "Your ?c= id is not in this database. Use the link from Settings → Office kiosk, or the id from Supabase Table Editor → Company.",
          receivedCompanyId: companyId,
        },
        { status: 404 },
      );
    }

    const now = new Date();
    const tz = company.kioskTimezone || "Africa/Accra";
    const localDate = localDateString(now, tz);
    const localMins = localMinutesFromMidnight(now, tz);
    const gate = evaluateKioskClockInGate({
      now,
      timezone: tz,
      opensAt: company.kioskOfficeOpensAt,
      closesAt: company.kioskOfficeClosesAt,
      cutoffTime: company.kioskCutoffTime,
    });

    const openM = parseHHmmToMinutes(company.kioskOfficeOpensAt);
    const closeM = parseHHmmToMinutes(company.kioskOfficeClosesAt);
    const cutM = parseHHmmToMinutes(company.kioskCutoffTime);

    return NextResponse.json({
      companyName: company.name,
      timezone: tz,
      localDate,
      localTimeMinutes: localMins,
      clockInAllowed: gate.ok,
      clockInBlockedReason: gate.ok ? null : gate.message,
      windows: {
        opensAt: openM,
        closesAt: closeM,
        cutoffAt: cutM,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load status" }, { status: 500 });
  }
}
