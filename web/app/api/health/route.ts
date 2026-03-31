import { NextResponse } from "next/server";

/**
 * Public liveness for load balancers / deploy checks. No auth, no secrets.
 * Tenant metrics stay on GET /api/platform/health (SUPER_ADMIN only).
 */
export async function GET() {
  return NextResponse.json(
    {
      ok: true as const,
      service: "hgh-payroll",
      env: {
        database: Boolean(process.env.DATABASE_URL),
        supabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
        portalJwt: Boolean(process.env.PORTAL_JWT_SECRET?.trim()),
        upstashRedis: Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
        encryptionKey: Boolean(process.env.ENCRYPTION_KEY?.trim()),
      },
    },
    { status: 200 },
  );
}
