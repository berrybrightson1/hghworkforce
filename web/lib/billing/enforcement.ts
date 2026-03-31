/**
 * Stripe (or another provider) must be configured before checkout can charge.
 * Trial/subscription locking is always enforced in the app — this only gates payment UX.
 */
export function isPaymentProviderConfigured(): boolean {
  const k = process.env.STRIPE_SECRET_KEY?.trim();
  const price = process.env.STRIPE_PRICE_ID?.trim();
  return k != null && k.length > 0 && price != null && price.length > 0;
}
