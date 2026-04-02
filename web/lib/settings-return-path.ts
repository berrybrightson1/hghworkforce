const DEFAULT_SETTINGS_RETURN = "/dashboard/settings/account";

/**
 * Allow only in-app settings paths (and same-page search/hash) as return targets from change-password.
 */
export function safeSettingsReturnPath(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return DEFAULT_SETTINGS_RETURN;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return DEFAULT_SETTINGS_RETURN;

  try {
    const url = new URL(trimmed, "https://placeholder.internal");
    if (!url.pathname.startsWith("/dashboard/settings")) return DEFAULT_SETTINGS_RETURN;
    const out = `${url.pathname}${url.search}${url.hash}`;
    return out.length > 0 ? out : DEFAULT_SETTINGS_RETURN;
  } catch {
    return DEFAULT_SETTINGS_RETURN;
  }
}

/** Normalize Next.js searchParams value (string or first of array). */
export function firstParam(
  value: string | string[] | undefined,
): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

const DEFAULT_FORGOT_PASSWORD_RETURN = "/sign-in";

/** `next` on sign-in must stay same-origin and non-open-redirect (mirrors sign-in post-login). */
function safeSignInNextParam(raw: string | null | undefined): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  const pathOnly = raw.split("?")[0] ?? "";
  if (
    pathOnly.startsWith("/dashboard") ||
    pathOnly.startsWith("/portal") ||
    pathOnly === "/onboarding" ||
    pathOnly.startsWith("/update-password")
  ) {
    return raw;
  }
  return null;
}

/**
 * Where "Back" goes from /forgot-password — only in-app auth/settings paths.
 */
export function safeForgotPasswordReturnPath(raw: string | null | undefined): string {
  if (!raw || typeof raw !== "string") return DEFAULT_FORGOT_PASSWORD_RETURN;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return DEFAULT_FORGOT_PASSWORD_RETURN;

  try {
    const url = new URL(trimmed, "https://placeholder.internal");

    if (url.pathname === "/sign-in") {
      const next = url.searchParams.get("next");
      if (!next) return `/sign-in${url.hash}`;
      const safeNext = safeSignInNextParam(next);
      if (!safeNext) return `/sign-in${url.hash}`;
      return `/sign-in?next=${encodeURIComponent(safeNext)}${url.hash}`;
    }

    if (url.pathname === "/sign-up") {
      return `/sign-up${url.search}${url.hash}`;
    }

    if (url.pathname.startsWith("/dashboard/settings")) {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    if (url.pathname === "/update-password") {
      const inner = url.searchParams.get("returnTo");
      const safeInner = safeSettingsReturnPath(inner);
      return `/update-password?returnTo=${encodeURIComponent(safeInner)}`;
    }

    return DEFAULT_FORGOT_PASSWORD_RETURN;
  } catch {
    return DEFAULT_FORGOT_PASSWORD_RETURN;
  }
}
