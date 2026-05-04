/**
 * Server environment flags and feature toggles (read once at startup).
 * Dependencies: none. Env: see SkerryEnv interface.
 */

export interface SkerryEnv {
  supabaseUrl: string | undefined;
  supabaseServiceRoleKey: string | undefined;
  openaiApiKey: string | undefined;
  apifyApiKey: string | undefined;
  apifyLeadsActorId: string | undefined;
  featureApifyLeads: boolean;
  resendApiKey: string | undefined;
  neverbounceApiKey: string | undefined;
  skerryFromEmail: string | undefined;
  stripeSecretKey: string | undefined;
  stripeWebhookSecret: string | undefined;
  stripePriceSolo: string | undefined;
  stripePriceTeam: string | undefined;
  stripePriceAgency: string | undefined;
  allowDemoAuth: boolean;
  publicAppUrl: string;
}

export function readEnv(): SkerryEnv {
  return {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY,
    apifyApiKey: process.env.APIFY_API_KEY,
    apifyLeadsActorId: process.env.APIFY_LEADS_ACTOR_ID,
    featureApifyLeads: process.env.FEATURE_APIFY_LEADS === "true",
    resendApiKey: process.env.RESEND_API_KEY,
    neverbounceApiKey: process.env.NEVERBOUNCE_API_KEY,
    skerryFromEmail: process.env.SKERRY_FROM_EMAIL,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    stripePriceSolo: process.env.STRIPE_PRICE_SOLO,
    stripePriceTeam: process.env.STRIPE_PRICE_TEAM,
    stripePriceAgency: process.env.STRIPE_PRICE_AGENCY,
    allowDemoAuth: process.env.SKERRY_ALLOW_DEMO_AUTH === "true",
    publicAppUrl: process.env.PUBLIC_APP_URL ?? "http://localhost:3000",
  };
}
