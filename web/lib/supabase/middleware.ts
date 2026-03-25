import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  if (raw.startsWith("/dashboard") || raw.startsWith("/portal") || raw === "/onboarding")
    return raw;
  return "/dashboard";
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

  // Not logged in + protected route -> sign-in
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", path);
    const redirect = NextResponse.redirect(url);
    if (authSessionInvalid) clearSupabaseCookiesFromRequest(request, redirect);
    return redirect;
  }

  // Drop corrupted Supabase cookies on public routes so the app stops erroring on every request
  if (!user && authSessionInvalid && !isProtected) {
    clearSupabaseCookiesFromRequest(request, supabaseResponse);
  }

  // Logged in + auth page -> redirect to dashboard
  if (user && isAuthPage) {
    const nextRaw = request.nextUrl.searchParams.get("next");
    const target = safeNextPath(nextRaw);
    const url = request.nextUrl.clone();
    url.pathname = target;
    url.search = "";
    return NextResponse.redirect(url);
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
      }
    } catch {
      /* layout + API auth still protect routes */
    }
  }

  return supabaseResponse;
}
