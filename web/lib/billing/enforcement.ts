/**
 * Whether hosted checkout is available. Today this reflects legacy Stripe env vars; Paystack
 * will plug in here without exposing provider details to the client.
 * Trial/subscription locking is always enforced — this only gates payment UX.
 */
export function isPaymentProviderConfigured(): boolean {
  const k = process.env.STRIPE_SECRET_KEY?.trim();
  const price = process.env.STRIPE_PRICE_ID?.trim();
  return k != null && k.length > 0 && price != null && price.length > 0;
}
