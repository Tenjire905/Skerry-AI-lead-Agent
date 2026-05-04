/**
 * Resolve caller identity from Authorization header (Supabase JWT or demo mode).
 * Dependencies: @supabase/supabase-js (optional). Env: SKERRY_ALLOW_DEMO_AUTH, SUPABASE_*.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserIdFromJwt } from "./supabaseAdmin.js";

export type AuthResult =
  | { ok: true; userId: string; demo: boolean }
  | { ok: false; status: number; message: string };

export async function authenticateRequest(
  authorization: string | undefined,
  admin: SupabaseClient | null,
  allowDemo: boolean,
): Promise<AuthResult> {
  if (!authorization?.startsWith("Bearer ")) {
    return { ok: false, status: 401, message: "missing_bearer_token" };
  }
  const token = authorization.slice(7).trim();
  if (token === "demo" && allowDemo) {
    return { ok: true, userId: "demo", demo: true };
  }
  if (!admin) {
    return { ok: false, status: 503, message: "supabase_not_configured" };
  }
  const u = await getUserIdFromJwt(admin, token);
  if ("error" in u) {
    return { ok: false, status: 401, message: u.error };
  }
  return { ok: true, userId: u.userId, demo: false };
}
