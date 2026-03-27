import { decrypt, encrypt } from "@/lib/crypto";

const LEGACY_PLAIN_HEX = /^[a-f0-9]{64}$/i;

export function encodeWebhookSecretForStorage(plain: string): string {
  const enc = encrypt(plain);
  if (!enc) throw new Error("Failed to encrypt webhook secret");
  return enc;
}

/** Value as stored in DB: AES-GCM blob or legacy 64-char hex from randomBytes(32). */
export function decodeWebhookSecretForHmac(stored: string): string {
  const dec = decrypt(stored);
  if (dec) return dec;
  if (LEGACY_PLAIN_HEX.test(stored)) return stored;
  return stored;
}
