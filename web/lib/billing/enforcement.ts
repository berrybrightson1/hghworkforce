/**
 * Stripe (or another provider) must be configured before checkout can charge.
 * Trial/subscription locking is always enforced in the app — this only gates payment UX.
 */
export function isPaymentProviderConfigured(): boolean {
  const k = process.env.STRIPE_SECRET_KEY;
  return k != null && k.length > 0;
}
