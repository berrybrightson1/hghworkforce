/**
 * UI masks tax/bank values as ****suffix or ******** — never persist those back.
 */
export function isRedactedLikeInput(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const t = value.trim();
  if (!t) return false;
  if (t === "********") return true;
  return t.startsWith("****");
}
