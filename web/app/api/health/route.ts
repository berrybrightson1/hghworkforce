import { NextResponse } from "next/server";

/**
 * Public liveness for load balancers / deploy checks. No auth.
 * Tenant metrics stay on GET /api/platform/health (SUPER_ADMIN only).
 */
export async function GET() {
  return NextResponse.json({ ok: true as const, service: "hgh-payroll" }, { status: 200 });
}
