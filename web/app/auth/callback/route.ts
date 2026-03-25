import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function safeAuthNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  if (
    raw.startsWith("/dashboard") ||
    raw.startsWith("/portal") ||
    raw === "/onboarding" ||
    raw.startsWith("/update-password")
  ) {
    return raw;
  }
  return "/dashboard";
}

/**
 * OAuth / magic-link / password-recovery code exchange (Supabase redirects here).
 * Add this URL to Supabase Auth → URL configuration: Redirect URLs.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeAuthNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in?error=${encodeURIComponent("Invalid or expired sign-in link.")}`);
}
