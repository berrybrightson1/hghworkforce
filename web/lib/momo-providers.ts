export const MOMO_PROVIDER_CODES = ["MTN_MOMO", "TELECEL_CASH", "AT_MONEY"] as const;
export type MomoProviderCode = (typeof MOMO_PROVIDER_CODES)[number];

export const MOMO_PROVIDER_LABELS: Record<MomoProviderCode, string> = {
  MTN_MOMO: "MTN Mobile Money",
  TELECEL_CASH: "Telecel Cash",
  AT_MONEY: "AirtelTigo Money",
};

export function isMomoProviderCode(v: string): v is MomoProviderCode {
  return (MOMO_PROVIDER_CODES as readonly string[]).includes(v);
}

export function normalizeMomoProvider(v: unknown): MomoProviderCode | null {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return null;
  return isMomoProviderCode(s) ? s : null;
}

/** UI options: first value empty = none */
export const MOMO_PROVIDER_SELECT_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "None" },
  ...MOMO_PROVIDER_CODES.map((value) => ({ value, label: MOMO_PROVIDER_LABELS[value] })),
];
