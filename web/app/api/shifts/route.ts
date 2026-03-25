import { NextRequest, NextResponse } from "next/server";
import { requireDbUser, canAccessCompany, canManagePayroll } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/shifts?companyId=...
 * List shift templates for a company.
 */
export async function GET(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  try {
    const companyId =
      req.nextUrl.searchParams.get("companyId") || auth.dbUser.companyId;
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }
    if (!canAccessCompany(auth.dbUser, companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const shifts = await prisma.shift.findMany({
      where: { companyId },
      include: {
        assignments: {
          where: { endDate: null },
          include: {
            employee: {
              select: {
                id: true,
                employeeCode: true,
                name: true,
                department: true,
                jobTitle: true,
                user: { select: { name: true } },
              },
            },
          },
        },
        _count: { select: { assignments: true } },
      },
      orderBy: { startTime: "asc" },
    });

    return NextResponse.json(shifts);
  } catch {
    return NextResponse.json({ error: "Failed to load shifts" }, { status: 500 });
  }
}

/**
 * POST /api/shifts
 * Body: { companyId, name, startTime, endTime, breakMinutes? }
 * Create a new shift template.
 */
export async function POST(req: NextRequest) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (!canManagePayroll(auth.dbUser.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const companyId = body.companyId as string | undefined;
    if (!companyId) {
      return NextResponse.json({ error: "companyId is required" }, { status: 400 });
    }
    if (!canAccessCompany(auth.dbUser, companyId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const name = body.name as string;
    const startTime = body.startTime as string;
    const endTime = body.endTime as string;
    const breakMinutes = (body.breakMinutes as number) ?? 60;

    if (!name || !startTime || !endTime) {
      return NextResponse.json(
        { error: "name, startTime, and endTime are required" },
        { status: 400 },
      );
    }

    // Validate time format HH:mm
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: "startTime and endTime must be in HH:mm format" },
        { status: 400 },
      );
    }

    const shift = await prisma.shift.create({
      data: { companyId, name, startTime, endTime, breakMinutes },
    });

    return NextResponse.json(shift, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create shift" }, { status: 500 });
  }
}
