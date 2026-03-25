import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/api-auth";
import { getClientIpFromRequest } from "@/lib/checkin-ip";

/**
 * POST /api/checkins/session
 * Starts an auditable check-in session when enterprise check-in is enabled.
 */
export async function POST(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (auth.dbUser.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Employees only" }, { status: 403 });
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { userId: auth.dbUser.id },
      select: { id: true, companyId: true, status: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
    }
    if (employee.status !== "ACTIVE") {
      return NextResponse.json({ error: "Employee account is not active" }, { status: 403 });
    }

    const company = await prisma.company.findUnique({
      where: { id: employee.companyId },
      select: { checkinEnterpriseEnabled: true },
    });

    if (!company?.checkinEnterpriseEnabled) {
      return NextResponse.json({ sessionId: null as string | null, enterpriseDisabled: true });
    }

    const ip = getClientIpFromRequest(req);
    const userAgent = req.headers.get("user-agent");

    const session = await prisma.checkinSession.create({
      data: {
        employeeId: employee.id,
        companyId: employee.companyId,
        clientIp: ip,
        userAgent,
        events: {
          create: [{ type: "PORTAL_OPENED" }],
        },
      },
      select: { id: true },
    });

    return NextResponse.json({ sessionId: session.id, enterpriseDisabled: false });
  } catch {
    return NextResponse.json({ error: "Failed to start session" }, { status: 500 });
  }
}
