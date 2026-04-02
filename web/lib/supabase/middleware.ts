import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PORTAL_COOKIE_NAME, verifyPortalJwt } from "@/lib/portal-jwt";

const PORTAL_PUBLIC = new Set(["/portal/login", "/portal/forgot-pin", "/portal/first-pin"]);

function withPortalHeaders(
  request: NextRequest,
  payload: { employeeId: string; companyId: string; tenantId: string },
) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-hgh-portal-employee-id", payload.employeeId);
  requestHeaders.set("x-hgh-portal-company-id", payload.companyId);
  requestHeaders.set("x-hgh-portal-tenant-id", payload.tenantId);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

/**
 * PIN portal cookie takes precedence on /portal/* so admins can test employee portal
 * in the same browser without being redirected to /dashboard.
 * If there is no portal cookie and no Supabase user, send to /portal/login.
 * If there is no portal cookie but user is signed in (e.g. Supabase EMPLOYEE), continue.
 */
async function resolveProtectedPortalRoute(
  request: NextRequest,
  path: string,
  hasSupabaseUser: boolean,
): Promise<NextResponse | null> {
  if (!path.startsWith("/portal") || PORTAL_PUBLIC.has(path)) {
    return null;
  }

  const token = request.cookies.get(PORTAL_COOKIE_NAME)?.value;
  const payload = token ? await verifyPortalJwt(token) : null;

  if (payload) {
    if (payload.requiresPinChange && path !== "/portal/set-pin") {
      return NextResponse.redirect(new URL("/portal/set-pin", request.url));
    }
    if (!payload.requiresPinChange && path === "/portal/set-pin") {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
    return withPortalHeaders(request, {
      employeeId: payload.employeeId,
      companyId: payload.companyId,
      tenantId: payload.tenantId || payload.companyId,
    });
  }

  if (!hasSupabaseUser) {
    const u = request.nextUrl.clone();
    u.pathname = "/portal/login";
    u.searchParams.set("next", path);
    return NextResponse.redirect(u);
  }

  return null;
}

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  const pathOnly = raw.split("?")[0] ?? "";
  if (
    pathOnly.startsWith("/dashboard") ||
    pathOnly.startsWith("/portal") ||
    pathOnly === "/onboarding" ||
    pathOnly.startsWith("/update-password")
  ) {
    return raw;
  }
  return "/dashboard";
}

/** Apply pathname + query from a validated internal next string (e.g. /onboarding?ref=). */
function redirectToSafeNext(base: URL, rawNext: string | null): URL {
  const safe = safeNextPath(rawNext);
  const parsed = new URL(safe, base.origin);
  const url = new URL(base.href);
  url.pathname = parsed.pathname;
  url.search = parsed.search;
  url.hash = "";
  return url;
}

function clearSupabaseCookiesFromRequest(request: NextRequest, response: NextResponse) {
  request.cookies.getAll().forEach(({ name }) => {
    if (name.startsWith("sb-")) {
      response.cookies.set(name, "", { maxAge: 0, path: "/" });
    }
  });
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isProtected =
    path.startsWith("/dashboard") ||
    path.startsWith("/portal") ||
    path.startsWith("/onboarding");
  const isAuthPage = path === "/sign-in" || path === "/sign-up";

  // Public routes - skip Supabase round-trip
  if (!isProtected && !isAuthPage) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[],
        ) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as never),
          );
        },
      },
    },
  );

  let user: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"] = null;
  let authSessionInvalid = false;

  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    user = data.user;
  } catch {
    authSessionInvalid = true;
    user = null;
  }

  /** Employee PIN portal: public pages */
  if (path.startsWith("/portal") && PORTAL_PUBLIC.has(path)) {
    return supabaseResponse;
  }

  const portalResolution = await resolveProtectedPortalRoute(request, path, !!user);
  if (portalResolution) {
    return portalResolution;
  }

  // Not logged in + protected route -> sign-in (dashboard / onboarding)
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    const nextDest = `${path}${request.nextUrl.search}`;
    url.searchParams.set("next", nextDest);
    const redirect = NextResponse.redirect(url);
    if (authSessionInvalid) clearSupabaseCookiesFromRequest(request, redirect);
    return redirect;
  }

  // Drop corrupted Supabase cookies on public routes so the app stops erroring on every request
  if (!user && authSessionInvalid && !isProtected) {
    clearSupabaseCookiesFromRequest(request, supabaseResponse);
  }

  // Logged in + auth page -> redirect to dashboard (or ?next= path + query)
  if (user && isAuthPage) {
    const nextRaw = request.nextUrl.searchParams.get("next");
    const dest = redirectToSafeNext(request.nextUrl, nextRaw);
    return NextResponse.redirect(dest);
  }

  // Role-based routing (Prisma-backed; layouts still enforce as backup)
  if (user && (path.startsWith("/dashboard") || path.startsWith("/portal"))) {
    try {
      const probeUrl = new URL("/api/auth/session-role", request.nextUrl.origin);
      const res = await fetch(probeUrl, {
        headers: { cookie: request.headers.get("cookie") ?? "" },
        cache: "no-store",
      });
      const data = (await res.json()) as { role: string | null; companyId: string | null };

      if (path.startsWith("/dashboard")) {
        if (data.role === "EMPLOYEE" && data.companyId) {
          const u = request.nextUrl.clone();
          u.pathname = "/portal";
          u.search = "";
          return NextResponse.redirect(u);
        }
        if (data.role && data.role !== "SUPER_ADMIN" && !data.companyId) {
          const u = request.nextUrl.clone();
          u.pathname = "/onboarding";
          u.search = "";
          return NextResponse.redirect(u);
        }
      }

      if (path.startsWith("/portal")) {
        if (data.role && data.role !== "EMPLOYEE") {
          const u = request.nextUrl.clone();
          u.pathname = "/dashboard";
          u.search = "";
          return NextResponse.redirect(u);
        }
        if (data.role === "EMPLOYEE" && !data.companyId) {
          const u = request.nextUrl.clone();
          u.pathname = "/onboarding";
          u.search = "";
          return NextResponse.redirect(u);
        }
        if (data.role === "EMPLOYEE" && path === "/portal/login") {
          const u = request.nextUrl.clone();
          u.pathname = "/portal";
          u.search = "";
          return NextResponse.redirect(u);
        }
      }
    } catch {
      /* layout + API auth still protect routes */
    }
  }

  return supabaseResponse;
}
