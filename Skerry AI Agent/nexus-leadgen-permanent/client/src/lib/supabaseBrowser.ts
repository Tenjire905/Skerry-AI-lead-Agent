/**
 * Browser Supabase client (anon key + RLS). Null when env not configured (demo mode).
 * Dependencies: @supabase/supabase-js. Env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anon);

export const supabaseBrowser: SupabaseClient | null =
  url && anon
    ? createClient(url, anon, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;
