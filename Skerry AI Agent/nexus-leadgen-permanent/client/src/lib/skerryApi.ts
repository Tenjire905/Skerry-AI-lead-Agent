/**
 * HTTP client for Skerry Express API (always send Authorization when available).
 * Dependencies: auth store (lazy token). Env: VITE_API_BASE.
 */

import type { Lead } from "@/store/leadStore";
import { useAuthStore } from "@/store/authStore";

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

async function authHeaders(): Promise<HeadersInit> {
  const token = await useAuthStore.getState().getAccessToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  return h;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(body),
  });
  return resp.json() as Promise<T>;
}

async function apiGet<T>(path: string): Promise<T> {
  const token = await useAuthStore.getState().getAccessToken();
  const h: Record<string, string> = {};
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  const resp = await fetch(`${API_BASE}${path}`, { headers: h });
  return resp.json() as Promise<T>;
}

interface VerifyResponse {
  ok: boolean;
  valid: boolean;
  status: string;
  warning?: string;
  error?: string;
}

interface SendResponse {
  ok: boolean;
  id?: string;
  dryRun?: boolean;
  error?: string;
}

interface HealthResponse {
  ok: boolean;
  services: {
    supabase?: boolean;
    openai: boolean;
    apify?: boolean;
    apifyLeadsEnabled?: boolean;
    resend: boolean;
    neverbounce: boolean;
    stripe?: boolean;
  };
}

export interface SetupStatusResponse {
  ok: boolean;
  services: HealthResponse["services"];
}

export interface WorkspaceListResponse {
  ok: boolean;
  demo?: boolean;
  workspaces?: Array<{ id: string; name: string; slug: string; plan_tier: string }>;
}

export interface DiscoverResponse {
  ok: boolean;
  leads?: Lead[];
  persisted?: boolean;
  demo?: boolean;
  error?: string;
  code?: string;
  message?: string;
}

export async function verifyEmail(email: string): Promise<VerifyResponse> {
  try {
    return await apiPost<VerifyResponse>("/api/email/verify", { email });
  } catch (err) {
    return { ok: false, valid: false, status: "network_error", error: String(err) };
  }
}

export async function sendEmail(args: {
  to: string;
  subject?: string;
  bodyMarkdown: string;
}): Promise<SendResponse> {
  try {
    return await apiPost<SendResponse>("/api/email/send", args);
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function serverHealth(): Promise<HealthResponse | null> {
  try {
    return await apiGet<HealthResponse>("/api/health");
  } catch {
    return null;
  }
}

export async function setupStatus(): Promise<SetupStatusResponse | null> {
  try {
    return await apiGet<SetupStatusResponse>("/api/setup/status");
  } catch {
    return null;
  }
}

export async function listWorkspacesApi(): Promise<WorkspaceListResponse | null> {
  try {
    return await apiGet<WorkspaceListResponse>("/api/workspaces");
  } catch {
    return null;
  }
}

export async function discoverLeadsApi(body: {
  workspaceId?: string;
  tier: "solo" | "team" | "agency";
  count: number;
  businessDescription: string;
  targetAudience: string;
  enrichWithOpenAI?: boolean;
}): Promise<DiscoverResponse> {
  try {
    return await apiPost<DiscoverResponse>("/api/leads/discover", body);
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function generateEmailApi(body: {
  workspaceId?: string;
  lead: {
    firstName: string;
    lastName: string;
    title: string;
    organization: { name: string };
    websiteContext: string;
    personContext: string;
    uniqueAngles: string[];
  };
  businessDescription: string;
  senderName: string;
  angle?: string;
}): Promise<{ ok: boolean; markdown?: string; error?: string }> {
  try {
    return await apiPost("/api/ai/email", body);
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function createCheckoutSession(body: {
  workspaceId: string;
  plan: "solo" | "team" | "agency";
}): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    return await apiPost("/api/billing/checkout-session", body);
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
