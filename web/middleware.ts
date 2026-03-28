import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? Redis.fromEnv()
    : null;

const ratelimitApi = redis
  ? new Ratelimit({
      redis,
      prefix: "rl:api",
      limiter: Ratelimit.slidingWindow(100, "60 s"),
      analytics: true,
    })
  : null;

const ratelimitAuth = redis
  ? new Ratelimit({
      redis,
      prefix: "rl:auth",
      limiter: Ratelimit.slidingWindow(5, "15 m"),
      analytics: true,
    })
  : null;

const ratelimitCheckin = redis
  ? new Ratelimit({
      redis,
      prefix: "rl:checkin",
      limiter: Ratelimit.slidingWindow(20, "5 m"),
      analytics: true,
    })
  : null;

const ratelimitWebhookCfg = redis
  ? new Ratelimit({
      redis,
      prefix: "rl:whcfg",
      limiter: Ratelimit.slidingWindow(30, "60 s"),
      analytics: true,
    })
  : null;

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return (
    (forwarded?.split(",")[0]?.trim()) || request.headers.get("x-real-ip") || "127.0.0.1"
  );
}

async function applyLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<NextResponse | null> {
  if (!limiter) return null;
  const { success, limit, reset, remaining } = await limiter.limit(key);
  if (success) return null;
  return new NextResponse("Too many requests", {
    status: 429,
    headers: {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": reset.toString(),
    },
  });
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const method = request.method;

  if (path.startsWith("/api")) {
    if (!path.startsWith("/api/health") && !path.startsWith("/api/cron/")) {
      const ip = clientIp(request);

      if (path.startsWith("/api/auth/")) {
        const denied = await applyLimit(ratelimitAuth, ip);
        if (denied) return denied;
      } else if (
        (method === "POST" && path === "/api/checkins") ||
        (method === "POST" && (path === "/api/kiosk/verify" || path === "/api/kiosk/clock")) ||
        (method === "POST" && path === "/api/kiosk/device-verify")
      ) {
        const denied = await applyLimit(ratelimitCheckin, ip);
        if (denied) return denied;
      } else if (
        (method === "POST" || method === "PATCH" || method === "DELETE") &&
        /^\/api\/companies\/[^/]+\/webhooks(\/|$)/.test(path)
      ) {
        const m = path.match(/^\/api\/companies\/([^/]+)\/webhooks/);
        const companyId = m?.[1] ?? ip;
        const denied = await applyLimit(ratelimitWebhookCfg, `${ip}:${companyId}`);
        if (denied) return denied;
      } else {
        const denied = await applyLimit(ratelimitApi, ip);
        if (denied) return denied;
      }
    }
  }

  const response = await updateSession(request);

  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:; connect-src 'self' https://*.supabase.co;",
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
