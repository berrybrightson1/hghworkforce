import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/api-auth";

/**
 * GET /api/checkin-context
 * Employee portal: company check-in flags + whether face is enrolled (no descriptor leaked).
 */
export async function GET() {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (auth.dbUser.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Employees only" }, { status: 403 });
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { userId: auth.dbUser.id },
      select: {
        id: true,
        faceDescriptor: true,
        company: {
          select: {
            id: true,
            checkinLockToFirstIp: true,
            checkinBoundIp: true,
            checkinEnterpriseEnabled: true,
            checkinEnforceIpAllowlist: true,
            checkinRequireFaceVerification: true,
            checkinMaxFaceAttempts: true,
            checkinFaceDistanceThreshold: true,
            _count: { select: { allowedIps: true } },
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
    }

    const c = employee.company;
    return NextResponse.json({
      employeeId: employee.id,
      companyId: c.id,
      checkinLockToFirstIp: c.checkinLockToFirstIp,
      checkinHasBoundIp: c.checkinBoundIp != null,
      checkinEnterpriseEnabled: c.checkinEnterpriseEnabled,
      checkinEnforceIpAllowlist: c.checkinEnforceIpAllowlist,
      allowedIpCount: c._count.allowedIps,
      checkinRequireFaceVerification: c.checkinRequireFaceVerification,
      checkinMaxFaceAttempts: c.checkinMaxFaceAttempts,
      checkinFaceDistanceThreshold: c.checkinFaceDistanceThreshold
        ? Number(c.checkinFaceDistanceThreshold)
        : null,
      hasFaceEnrolled: employee.faceDescriptor != null,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load context" }, { status: 500 });
  }
}
