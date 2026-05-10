import Stripe from "stripe";

let cached: Stripe | null = null;

export function getStripe(env: ImportMetaEnv): Stripe {
  if (cached) return cached;
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY missing.");
  }
  cached = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-02-24.acacia",
    httpClient: Stripe.createFetchHttpClient(),
  });
  return cached;
}
