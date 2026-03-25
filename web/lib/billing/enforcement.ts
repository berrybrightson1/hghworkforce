/**
 * When false (default), all plan limits and payment gates are bypassed.
 * Set BILLING_ENFORCED=true when Stripe (or another provider) is wired up.
 */
export function isBillingEnforced(): boolean {
  return process.env.BILLING_ENFORCED === "true";
}

/**
 * Payment collection is not configured until a provider is integrated.
 */
export function isPaymentProviderConfigured(): boolean {
  return process.env.STRIPE_SECRET_KEY != null && process.env.STRIPE_SECRET_KEY.length > 0;
}

/** Plan caps and paywalls apply only when both are true. */
export function shouldApplyPlanLimits(): boolean {
  return isBillingEnforced() && isPaymentProviderConfigured();
}
