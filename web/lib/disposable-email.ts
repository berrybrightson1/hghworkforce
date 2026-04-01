import disposableDomains from "disposable-email-domains";
import { DISPOSABLE_EMAIL_USER_MESSAGE } from "@/lib/disposable-email-copy";

const DOMAIN_SET = new Set(
  (disposableDomains as string[]).map((d) => d.trim().toLowerCase()),
);

export function disposableEmailMessage(): string {
  return DISPOSABLE_EMAIL_USER_MESSAGE;
}

export function isDisposableEmailDomain(domain: string): boolean {
  const d = domain.trim().toLowerCase().replace(/^\.+/, "");
  if (!d) return false;
  return DOMAIN_SET.has(d);
}

export function isDisposableEmailAddress(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  return isDisposableEmailDomain(email.slice(at + 1));
}
