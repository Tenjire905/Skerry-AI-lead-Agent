import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Service-role Supabase client. Server-only — never import from a client
 * island. Bypasses RLS, so all guards must live in our API routes.
 */
export function getSupabase(env: ImportMetaEnv): SupabaseClient {
  if (cached) return cached;
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "Supabase env vars missing. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  cached = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

export interface WaitlistRow {
  id: string;
  email: string;
  position: number;
  created_at: string;
  confirmed_at: string | null;
  deposited: boolean;
  deposit_amount_cents: number | null;
  deposit_paid_at: string | null;
  stripe_customer_id: string | null;
  stripe_session_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
  user_agent: string | null;
  ip_country: string | null;
  unsubscribed_at: string | null;
}
