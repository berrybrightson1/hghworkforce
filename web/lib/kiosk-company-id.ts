/** Normalize company id from query string or JSON (trim, strip BOM). */
export function normalizeKioskCompanyId(raw: string | null | undefined): string {
  if (raw == null) return "";
  return String(raw).replace(/^\uFEFF/, "").trim();
}
