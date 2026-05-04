/**
 * Supabase admin client (service role) for server-side writes after auth checks.
 * Dependencies: @supabase/supabase-js. Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { LeadInsert, LeadRow, WorkspaceRow } from "../shared/database.types.js";

let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(url: string, serviceKey: string): SupabaseClient {
  if (!_admin) {
    _admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _admin;
}

export async function getUserIdFromJwt(
  admin: SupabaseClient,
  accessToken: string,
): Promise<{ userId: string } | { error: string }> {
  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) {
    return { error: error?.message ?? "invalid_token" };
  }
  return { userId: data.user.id };
}

export async function assertWorkspaceMember(
  admin: SupabaseClient,
  workspaceId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return false;
  return true;
}

export async function listWorkspacesForUser(
  admin: SupabaseClient,
  userId: string,
): Promise<WorkspaceRow[]> {
  const { data: members, error: mErr } = await admin
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId);
  if (mErr || !members?.length) return [];
  const ids = members.map((m: { workspace_id: string }) => m.workspace_id);
  const { data: ws, error: wErr } = await admin.from("workspaces").select("*").in("id", ids);
  if (wErr || !ws) return [];
  return ws as WorkspaceRow[];
}

export async function insertLeads(
  admin: SupabaseClient,
  workspaceId: string,
  rows: LeadInsert[],
): Promise<LeadRow[]> {
  const payload = rows.map((r) => ({ ...r, workspace_id: workspaceId }));
  const { data, error } = await admin.from("leads").insert(payload).select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as LeadRow[];
}
