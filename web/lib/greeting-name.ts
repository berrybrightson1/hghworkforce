function titleCaseToken(word: string): string {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function titleCaseWords(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(titleCaseToken)
    .join(" ");
}

/**
 * Dashboard greeting: first + last when present, else full legacy name, else email local-part.
 */
export function buildDashboardGreetingName(args: {
  firstName: string | null;
  lastName: string | null;
  legacyName: string;
  email: string;
}): string {
  const f = args.firstName?.trim();
  const l = args.lastName?.trim();
  if (f && l) return titleCaseWords(`${f} ${l}`);
  if (f) return titleCaseWords(f);
  const legacy = args.legacyName?.trim();
  if (legacy) return titleCaseWords(legacy);
  const local = (args.email.split("@")[0] ?? "there").replace(/[._-]+/g, " ");
  return titleCaseWords(local);
}
