import { createHmac, timingSafeEqual } from "crypto";

const TTL_MS = 10 * 60_000;

type Payload = { employeeId: string; companyId: string; exp: number };

function getSecret(): string {
  const s = process.env.KIOSK_SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV !== "production") {
    return "dev-only-kiosk-secret-change-me";
  }
  throw new Error("KIOSK_SESSION_SECRET must be set (min 16 chars) in production");
}

export function signKioskSessionToken(employeeId: string, companyId: string): string {
  const secret = getSecret();
  const payload: Payload = {
    employeeId,
    companyId,
    exp: Date.now() + TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyKioskSessionToken(token: string): Payload | null {
  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
  } catch {
    return null;
  }
  if (
    typeof payload.employeeId !== "string" ||
    typeof payload.companyId !== "string" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }
  if (Date.now() > payload.exp) return null;
  return payload;
}
