import { createHash, randomBytes, randomUUID } from "crypto";

/** How long a kiosk challenge is valid (60 seconds) */
export const CHALLENGE_TTL_MS = 60_000;

/** Cookie name for the device token stored on the employee's phone */
export const DEVICE_TOKEN_COOKIE = "kioskDeviceToken";

/** Generate a random 6-digit numeric verification code */
export function generateChallengeCode(): string {
  const n = randomBytes(4).readUInt32BE(0) % 1_000_000;
  return n.toString().padStart(6, "0");
}

/** SHA-256 hash a device token for storage */
export function hashDeviceToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Generate a new random device token (UUID v4) */
export function generateDeviceToken(): string {
  return randomUUID();
}
