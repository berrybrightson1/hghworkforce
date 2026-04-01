import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export function normalizeReferralCodeInput(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function isValidReferralCodeFormat(code: string): boolean {
  return /^HGH-[A-Z0-9]{4,12}$/.test(code);
}

export async function generateUniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 32; i++) {
    const suffix = randomBytes(3).toString("hex").toUpperCase();
    const code = `HGH-${suffix}`;
    const taken = await prisma.user.findFirst({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  throw new Error("Could not allocate referral code");
}
