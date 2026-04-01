import { createHmac, timingSafeEqual } from "crypto";

function getSecret(): string | null {
  const s = process.env.SIGNUP_TICKET_SECRET?.trim() || process.env.PORTAL_JWT_SECRET?.trim();
  return s || null;
}

export function signupTicketSecretConfigured(): boolean {
  return getSecret() != null;
}

export function createSignupTicket(email: string, fingerprint: string): string {
  const secret = getSecret();
  if (!secret) throw new Error("SIGNUP_TICKET_SECRET or PORTAL_JWT_SECRET is not set");
  const normalizedEmail = email.trim().toLowerCase();
  const exp = Date.now() + 20 * 60 * 1000;
  const payload = JSON.stringify({
    email: normalizedEmail,
    fingerprint,
    exp,
  });
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${sig}`;
}

export function verifySignupTicket(
  ticket: string,
): { email: string; fingerprint: string } | null {
  const secret = getSecret();
  if (!secret) return null;
  const parts = ticket.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  const expectedSig = createHmac("sha256", secret).update(payload).digest("base64url");
  try {
    if (expectedSig.length !== sig.length || !timingSafeEqual(Buffer.from(expectedSig), Buffer.from(sig))) {
      return null;
    }
  } catch {
    return null;
  }
  let data: { email?: string; fingerprint?: string; exp?: number };
  try {
    data = JSON.parse(payload) as { email?: string; fingerprint?: string; exp?: number };
  } catch {
    return null;
  }
  if (
    typeof data.email !== "string" ||
    typeof data.fingerprint !== "string" ||
    typeof data.exp !== "number" ||
    Date.now() > data.exp
  ) {
    return null;
  }
  return { email: data.email, fingerprint: data.fingerprint };
}
