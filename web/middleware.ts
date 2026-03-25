import { NextResponse, type NextRequest } from "next/server";
import { normalizeKioskCompanyId } from "@/lib/kiosk-company-id";
import { updateSession } from "@/lib/supabase/middleware";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Initialize rate limiter only if Upstash env vars are present
let ratelimit: Ratelimit | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(50, "10 s"), // 50 requests per 10s
    analytics: true,
  });
}

export async function middleware(request: NextRequest) {
  // 1. Rate Limiting (API only)
  if (ratelimit && request.nextUrl.pathname.startsWith("/api")) {
    const forwarded = request.headers.get("x-forwarded-for");
    const ip =
      (forwarded?.split(",")[0]?.trim()) ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);
    
    if (!success) {
      return new NextResponse("Too many requests", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }
  }

  // 2. Auth Session Update
  const response = await updateSession(request);

  // 2b. Check-in page: block /portal/checkin when IP fails first-PC lock or enterprise allowlist
  const path = request.nextUrl.pathname;
  if (
    path === "/portal/checkin" &&
    request.method === "GET"
  ) {
    try {
      const gateUrl = new URL("/api/checkins/ip-gate", request.nextUrl.origin);
      const gateRes = await fetch(gateUrl.toString(), {
        headers: {
          cookie: request.headers.get("cookie") ?? "",
        },
      });
      if (gateRes.status === 403) {
        const denied = request.nextUrl.clone();
        denied.pathname = "/portal/checkin/denied";
        denied.search = "";
        return NextResponse.redirect(denied);
      }
    } catch {
      // Fail open so check-in stays usable if gate fetch errors
    }
  }

  if (path === "/kiosk/checkin" && request.method === "GET") {
    const companyId = normalizeKioskCompanyId(
      request.nextUrl.searchParams.get("c") ??
        request.nextUrl.searchParams.get("companyId"),
    );
    if (companyId) {
      try {
        const gateUrl = new URL(
          `/api/kiosk/ip-gate?companyId=${encodeURIComponent(companyId)}`,
          request.nextUrl.origin,
        );
        const gateRes = await fetch(gateUrl.toString());
        if (gateRes.status === 403) {
          const denied = request.nextUrl.clone();
          denied.pathname = "/kiosk/checkin/denied";
          denied.search = `?c=${encodeURIComponent(companyId)}`;
          return NextResponse.redirect(denied);
        }
      } catch {
        // Fail open if gate fetch errors
      }
    }
  }

  // 3. Security Headers
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://cdn.jsdelivr.net https://storage.googleapis.com;"
  );

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
