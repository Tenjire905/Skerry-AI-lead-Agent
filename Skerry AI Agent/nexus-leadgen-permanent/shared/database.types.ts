/**
 * Skerry — Supabase row shapes (manual; regenerate from CLI when schema stabilizes).
 * Dependencies: none. Env: N/A.
 */

export type PlanTier = "solo" | "team" | "agency";
export type LeadStage = "source" | "analyze" | "draft" | "send";
export type LeadSource = "openai" | "apify" | "import" | "manual";
export type MemberRole = "owner" | "admin" | "member";

export interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  plan_tier: PlanTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMemberRow {
  workspace_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
}

export interface IcpProfileRow {
  id: string;
  workspace_id: string;
  business_description: string;
  ideal_customer: string;
  problem_solved: string;
  account_tier: PlanTier;
  extra: Record<string, unknown>;
  updated_at: string;
}

export interface LeadRow {
  id: string;
  workspace_id: string;
  stage: LeadStage;
  personal: Record<string, unknown>;
  organization: Record<string, unknown>;
  extraction: Record<string, unknown>;
  newsletter: Record<string, unknown>;
  source: LeadSource;
  external_ref: string | null;
  pushed_to_instantly: boolean;
  created_at: string;
  updated_at: string;
}

/** Row inserted via API (DB generates id, timestamps). */
export type LeadInsert = Omit<LeadRow, "id" | "workspace_id" | "created_at" | "updated_at">;
