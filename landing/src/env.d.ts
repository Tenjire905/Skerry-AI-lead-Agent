/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL: string;
  readonly SUPABASE_URL: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly RESEND_API_KEY: string;
  readonly RESEND_FROM_EMAIL: string;
  readonly RESEND_REPLY_TO: string;
  readonly STRIPE_SECRET_KEY: string;
  readonly STRIPE_WEBHOOK_SECRET: string;
  readonly STRIPE_FOUNDING_PRICE_ID: string;
  readonly ADMIN_API_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
