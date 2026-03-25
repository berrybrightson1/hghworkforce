import { NextRequest, NextResponse } from "next/server";
import type { CheckinSessionEventType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireDbUser } from "@/lib/api-auth";

const EVENT_TYPES: CheckinSessionEventType[] = [
  "PORTAL_OPENED",
  "FACE_SCAN_STARTED",
  "FACE_MATCH_OK",
  "FACE_MATCH_FAIL",
  "CLOCK_IN",
  "CLOCK_OUT",
  "SESSION_INTERRUPTED",
  "TAB_HIDDEN",
  "TAB_VISIBLE",
];

/**
 * POST /api/checkins/session/[sessionId]/events
 * Body: { type: CheckinSessionEventType, metadata?: Record<string, unknown> }
 */
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ sessionId: string }> },
) {
  const auth = await requireDbUser();
  if (!auth.ok) return auth.response;

  if (auth.dbUser.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Employees only" }, { status: 403 });
  }

  const { sessionId } = await ctx.params;

  let body: { type?: string; metadata?: Record<string, unknown> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = body.type as CheckinSessionEventType | undefined;
  if (!type || !EVENT_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { userId: auth.dbUser.id },
      select: { id: true },
    });
    if (!employee) {
      return NextResponse.json({ error: "Employee profile not found" }, { status: 404 });
    }

    const session = await prisma.checkinSession.findFirst({
      where: { id: sessionId, employeeId: employee.id, endedAt: null },
      select: { id: true },
    });
    if (!session) {
      return NextResponse.json({ error: "Session not found or closed" }, { status: 404 });
    }

    await prisma.checkinEvent.create({
      data: {
        sessionId: session.id,
        type,
        metadata: (body.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to record event" }, { status: 500 });
  }
}
