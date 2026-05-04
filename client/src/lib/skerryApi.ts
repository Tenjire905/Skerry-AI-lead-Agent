/**
 * Client-side wrapper for Skerry's server-side proxy endpoints.
 * Server runs on port 3001 in dev (set VITE_API_BASE=http://localhost:3001),
 * same-origin in production.
 */

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

export type UserRole = "user" | "developer";
export type AccountTier = "solo" | "team" | "agency";

export interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
  tier: AccountTier;
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
    openai: boolean;
    resend: boolean;
    neverbounce: boolean;
  };
}

interface AuthResponse {
  ok: boolean;
  user?: AuthUser;
  error?: string;
}

export interface EntitlementUsageResponse {
  ok: boolean;
  tier?: AccountTier;
  usageMonth?: string;
  runsUsed?: number;
  monthlyRuns?: number;
  runsRemaining?: number;
  maxLeadsPerRun?: number;
  requestedLeads?: number;
  error?: string;
}

export interface ServerGeneratedLead {
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  linkedin: string;
  organization: { name: string; website: string };
  websiteContext: string;
  personContext: string;
  uniqueAngles: string[];
}

interface GenerateLeadsResponse {
  ok: boolean;
  source?: "openai" | "synthesizer";
  leads?: ServerGeneratedLead[];
  tier?: AccountTier;
  usageMonth?: string;
  runsUsed?: number;
  monthlyRuns?: number;
  runsRemaining?: number;
  maxLeadsPerRun?: number;
  error?: string;
}

interface GenerateEmailResponse {
  ok: boolean;
  source?: "openai" | "synthesizer";
  markdown?: string;
  error?: string;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return resp.json() as Promise<T>;
}

async function apiGet<T>(path: string): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  return resp.json() as Promise<T>;
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

export async function authLogin(email: string, password: string): Promise<AuthResponse> {
  try {
    return await apiPost<AuthResponse>("/api/auth/login", { email, password });
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function authSession(): Promise<AuthResponse> {
  try {
    return await apiGet<AuthResponse>("/api/auth/session");
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function authLogout(): Promise<{ ok: boolean }> {
  try {
    return await apiPost<{ ok: boolean }>("/api/auth/logout", {});
  } catch {
    return { ok: false };
  }
}

export async function getEntitlementUsage(): Promise<EntitlementUsageResponse> {
  try {
    return await apiGet<EntitlementUsageResponse>("/api/entitlements/usage");
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function authorizeResearchStart(
  requestedLeads: number
): Promise<EntitlementUsageResponse> {
  try {
    return await apiPost<EntitlementUsageResponse>("/api/entitlements/research/start", {
      requestedLeads,
    });
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function generateLeadsServer(args: {
  businessDescription?: string;
  targetAudience?: string;
  requestedLeads: number;
}): Promise<GenerateLeadsResponse> {
  try {
    return await apiPost<GenerateLeadsResponse>("/api/leads/generate", args);
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function generateEmailServer(args: {
  lead: {
    firstName: string;
    lastName: string;
    title: string;
    organization: { name: string };
    websiteContext: string;
    personContext: string;
    uniqueAngles: string[];
  };
  businessDescription?: string;
  senderName?: string;
  angle?: string;
}): Promise<GenerateEmailResponse> {
  try {
    return await apiPost<GenerateEmailResponse>("/api/email/generate", args);
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}
