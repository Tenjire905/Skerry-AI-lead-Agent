/**
 * Client-side wrapper for Skerry's server-side proxy endpoints.
 * Server runs on port 3001 in dev (set VITE_API_BASE=http://localhost:3001),
 * same-origin in production.
 */

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "";

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

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return resp.json() as Promise<T>;
}

async function apiGet<T>(path: string): Promise<T> {
  const resp = await fetch(`${API_BASE}${path}`);
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
