import type { NextResponse } from "next/server";
import { PORTAL_COOKIE_NAME } from "@/lib/portal-jwt";

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 8 * 60 * 60,
};

export function setPortalSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(PORTAL_COOKIE_NAME, token, base);
}

export function clearPortalSessionCookie(res: NextResponse) {
  res.cookies.set(PORTAL_COOKIE_NAME, "", { ...base, maxAge: 0 });
}
