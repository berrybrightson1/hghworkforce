import { randomBytes } from "crypto";

/** Generates a human-friendly invite code like INV-A3F2-K9B1 */
export function generateInviteCode(): string {
  const hex = randomBytes(4).toString("hex").toUpperCase();
  return `INV-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}
