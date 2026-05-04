/**
 * Skerry — server-side proxy for sensitive API calls.
 *
 * Why: VITE_* env vars end up in the client bundle. For real production we
 * want OpenAI / Resend / NeverBounce keys server-only. The client calls
 * scoped endpoints here; this process holds the secrets.
 *
 * In dev, Vite handles the SPA on port 3000. This server runs alongside on
 * port 3001 and exposes JSON endpoints under /api/*. The client calls
 * `${import.meta.env.VITE_API_BASE ?? ""}/api/...`, defaulting to same-origin
 * (works in production), or `http://localhost:3001` in dev when set.
 *
 * Env vars (no VITE_ prefix — server-only):
 *   OPENAI_API_KEY
 *   RESEND_API_KEY
 *   NEVERBOUNCE_API_KEY
 *   APIFY_API_KEY
 *   SKERRY_FROM_EMAIL              e.g. "Skerry <hello@your-domain.com>"
 *   SKERRY_ALLOWED_ORIGINS         optional comma-separated list, e.g.
 *                                  "https://app.example.com,http://localhost:3000"
 *                                  When set, browser requests with Origin not in the
 *                                  list get 403 on /api/* (CSRF cookies + credentialed API).
 *   DATABASE_URL                   Postgres for entitlement usage (optional in dev).
 *   DATABASE_SSL_REJECT_UNAUTHORIZED  production default true; set "false" only if your
 *                                  provider uses a non-public CA (not recommended).
 */

import "dotenv/config";

import express from "express";
import { createServer } from "http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { EntitlementDb } from "./db";
import { assertEnterpriseProductionConfig } from "./productionConfig";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SendEmailBody {
  to: string;
  subject?: string;
  bodyMarkdown: string;
}

interface VerifyEmailBody {
  email: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface EntitlementStartBody {
  requestedLeads?: number;
}

interface GenerateLeadsBody {
  businessDescription?: string;
  targetAudience?: string;
  requestedLeads?: number;
}

interface GenerateEmailBody {
  lead?: {
    firstName?: string;
    lastName?: string;
    title?: string;
    organization?: { name?: string };
    websiteContext?: string;
    personContext?: string;
    uniqueAngles?: string[];
  };
  businessDescription?: string;
  senderName?: string;
  angle?: string;
}

type AccountTier = "solo" | "team" | "agency";
type UserRole = "user" | "developer";

interface AuthSessionUser {
  name: string;
  email: string;
  role: UserRole;
  tier: AccountTier;
}

interface SessionPayload {
  user: AuthSessionUser;
  exp: number;
}

interface RequestContext {
  requestId: string;
}

interface RequestWithContext extends express.Request {
  ctx?: RequestContext;
}

interface GeneratedLead {
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

const AUTH_COOKIE_NAME = "skerry_session";
const CSRF_COOKIE_NAME = "skerry_csrf";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const SESSION_SECRET = process.env.SESSION_SECRET;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;
const ALLOW_DEMO_AUTH = process.env.ALLOW_DEMO_AUTH === "true";

function parseAllowedOrigins(): string[] {
  return (process.env.SKERRY_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}

function isOriginAllowed(
  origin: string | undefined,
  allowed: string[]
): boolean {
  if (!origin) return true;
  if (allowed.length === 0) return true;
  return allowed.includes(origin);
}

const DEMO_USERS: Record<string, { password: string; user: AuthSessionUser }> =
  {
    "solo@skerry.io": {
      password: "solo123",
      user: {
        name: "Solo User",
        email: "solo@skerry.io",
        role: "user",
        tier: "solo",
      },
    },
    "team@skerry.io": {
      password: "team123",
      user: {
        name: "Team User",
        email: "team@skerry.io",
        role: "user",
        tier: "team",
      },
    },
    "agency@skerry.io": {
      password: "agency123",
      user: {
        name: "Agency User",
        email: "agency@skerry.io",
        role: "user",
        tier: "agency",
      },
    },
    "dev@skerry.io": {
      password: "skerry-dev-2024",
      user: {
        name: "Developer",
        email: "dev@skerry.io",
        role: "developer",
        tier: "agency",
      },
    },
  };

const loginAttempts = new Map<string, { count: number; firstAt: number }>();
const TIER_LIMITS: Record<
  AccountTier,
  { monthlyRuns: number; maxLeadsPerRun: number }
> = {
  solo: { monthlyRuns: 50, maxLeadsPerRun: 5 },
  team: { monthlyRuns: 250, maxLeadsPerRun: 20 },
  agency: { monthlyRuns: 1000, maxLeadsPerRun: 50 },
};
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
const PROVIDER_TIMEOUT_MS = Number(process.env.PROVIDER_TIMEOUT_MS ?? 12000);
const PROVIDER_RETRIES = Number(process.env.PROVIDER_RETRIES ?? 2);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function makeRequestId(): string {
  return crypto.randomBytes(8).toString("hex");
}

function logEvent(
  level: "info" | "warn" | "error",
  event: string,
  payload: Record<string, unknown>
): void {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...payload,
  };
  const line = JSON.stringify(entry);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

function asyncHandler(
  fn: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => Promise<unknown>
): express.RequestHandler {
  return (req, res, next) => {
    void fn(req, res, next).catch(next);
  };
}

/** JSON error bodies: hide internals outside production. */
function clientSafeError(err: unknown): string {
  if (process.env.NODE_ENV === "production") {
    return "Service temporarily unavailable.";
  }
  return err instanceof Error ? err.message : String(err);
}

function clientSafeWarning(_err: unknown): string {
  return process.env.NODE_ENV === "production"
    ? "Upstream check unavailable."
    : String(_err);
}

async function fetchWithTimeoutRetry(
  url: string,
  init: RequestInit,
  options: {
    timeoutMs: number;
    retries: number;
    requestId: string;
    provider: string;
  }
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= options.retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
    try {
      const resp = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      if (resp.ok) return resp;
      if (resp.status >= 500 && attempt < options.retries) {
        continue;
      }
      return resp;
    } catch (err) {
      clearTimeout(timeout);
      lastErr = err;
      if (attempt >= options.retries) break;
      logEvent("warn", "provider_retry", {
        requestId: options.requestId,
        provider: options.provider,
        attempt: attempt + 1,
        error: String(err),
      });
    }
  }
  throw new Error(
    `Provider request failed (${options.provider}): ${String(lastErr)}`
  );
}

function signSession(payload: SessionPayload): string {
  if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET is required.");
  }
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url"
  );
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function verifySession(token: string): SessionPayload | null {
  if (!SESSION_SECRET) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(body)
    .digest("base64url");
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    ) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function parseCookie(req: express.Request, name: string): string | null {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  const chunk = cookie
    .split(";")
    .map(c => c.trim())
    .find(c => c.startsWith(`${name}=`));
  if (!chunk) return null;
  return decodeURIComponent(chunk.slice(name.length + 1));
}

function isSecureRequest(req: express.Request): boolean {
  return req.protocol === "https" || req.get("x-forwarded-proto") === "https";
}

function getSessionUser(req: express.Request): AuthSessionUser | null {
  const token = parseCookie(req, AUTH_COOKIE_NAME);
  if (!token) return null;
  const payload = verifySession(token);
  return payload?.user ?? null;
}

function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

function createCsrfToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function setCsrfCookie(
  req: express.Request,
  res: express.Response,
  token: string
): void {
  const cookie = [
    `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "SameSite=Lax",
    isSecureRequest(req) ? "Secure" : "",
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ]
    .filter(Boolean)
    .join("; ");
  res.append("Set-Cookie", cookie);
}

function clearAuthCookies(req: express.Request, res: express.Response): void {
  const secure = isSecureRequest(req) ? "Secure" : "";
  const authCookie = [
    `${AUTH_COOKIE_NAME}=`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    secure,
    "Max-Age=0",
  ]
    .filter(Boolean)
    .join("; ");
  const csrfCookie = [
    `${CSRF_COOKIE_NAME}=`,
    "Path=/",
    "SameSite=Lax",
    secure,
    "Max-Age=0",
  ]
    .filter(Boolean)
    .join("; ");
  res.append("Set-Cookie", authCookie);
  res.append("Set-Cookie", csrfCookie);
}

function synthesizeServerLeads(params: {
  count: number;
  tier: AccountTier;
  businessDescription?: string;
  targetAudience?: string;
}): GeneratedLead[] {
  const firstNames = [
    "Aria",
    "Marcus",
    "Priya",
    "Devon",
    "Sana",
    "Jules",
    "Kai",
    "Mira",
  ];
  const lastNames = [
    "Voss",
    "Tan",
    "Raman",
    "Reyes",
    "Okafor",
    "Nilsson",
    "Grant",
    "Kim",
  ];
  const titlesByTier: Record<AccountTier, string[]> = {
    solo: ["Founder", "Co-Founder", "Marketing Lead"],
    team: ["VP of Growth", "Head of Marketing", "Director of Demand Gen"],
    agency: ["Chief Revenue Officer", "Head of GTM", "VP of Strategy"],
  };
  const orgs = [
    {
      name: "Helios Labs",
      website: "helioslabs.io",
      domain: "renewable analytics",
    },
    {
      name: "Lattice Health",
      website: "latticehealth.co",
      domain: "health data infra",
    },
    {
      name: "Polaris Data",
      website: "polarisdata.ai",
      domain: "ML observability",
    },
    {
      name: "Aether Logistics",
      website: "aetherlogistics.io",
      domain: "AI freight matching",
    },
  ];

  const leads: GeneratedLead[] = [];
  for (let i = 0; i < params.count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[(i * 3) % lastNames.length];
    const title =
      titlesByTier[params.tier][i % titlesByTier[params.tier].length];
    const org = orgs[i % orgs.length];
    leads.push({
      firstName,
      lastName,
      title,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${org.website}`,
      linkedin: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
      organization: { name: org.name, website: org.website },
      websiteContext: `${org.name} is active in ${org.domain} and signals enterprise GTM maturity.`,
      personContext: `${firstName} appears relevant for ${
        params.businessDescription?.slice(0, 50) ?? "your outreach"
      }. ${params.targetAudience ? `Target fit: ${params.targetAudience}.` : ""}`,
      uniqueAngles: [
        "Category shift",
        "Pipeline efficiency",
        "Strategic positioning",
      ],
    });
  }
  return leads;
}

async function generateLeadsWithOpenAI(params: {
  apiKey: string;
  count: number;
  tier: AccountTier;
  businessDescription: string;
  targetAudience: string;
  requestId: string;
}): Promise<GeneratedLead[]> {
  const depthInstruction =
    params.tier === "solo"
      ? "Generate basic lead profiles with minimal context."
      : params.tier === "team"
        ? "Generate detailed lead profiles with website context and LinkedIn enrichment."
        : "Generate highly detailed lead profiles with strategic and intent-oriented angles.";

  const prompt = `You are a B2B lead generation AI. Generate ${params.count} realistic lead profiles.
Business Description: ${params.businessDescription}
Target Audience: ${params.targetAudience}
Research Depth: ${depthInstruction}

Return a JSON array of leads. Each lead must have:
- firstName, lastName
- title
- email
- linkedin
- organization: { name, website }
- websiteContext
- personContext
- uniqueAngles (array of 3 short strings)

Return ONLY valid JSON array.`;

  const resp = await fetchWithTimeoutRetry(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 2500,
      }),
    },
    {
      timeoutMs: PROVIDER_TIMEOUT_MS,
      retries: PROVIDER_RETRIES,
      requestId: params.requestId,
      provider: "openai",
    }
  );
  if (!resp.ok) {
    throw new Error(`OpenAI request failed (${resp.status})`);
  }
  const json = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "[]";
  const cleaned = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  const parsed = JSON.parse(cleaned) as GeneratedLead[];
  return Array.isArray(parsed) ? parsed : [];
}

function synthesizeServerEmail(params: {
  firstName: string;
  organizationName: string;
  angle: string;
  senderName: string;
}): string {
  return `**Subject:** Quick idea for ${params.organizationName}

Hi ${params.firstName},

Noticed your team is leaning into ${params.angle.toLowerCase()}. We put together a short teardown on how similar teams are turning that into qualified pipeline without adding process overhead.

If useful, I can send it over.

Best,
${params.senderName}`;
}

async function generateEmailWithOpenAI(params: {
  apiKey: string;
  lead: {
    firstName: string;
    lastName: string;
    title: string;
    organizationName: string;
    websiteContext: string;
    personContext: string;
    uniqueAngles: string[];
  };
  businessDescription: string;
  senderName: string;
  angle?: string;
  requestId: string;
}): Promise<string> {
  const angle =
    params.angle ?? params.lead.uniqueAngles[0] ?? "value proposition";
  const prompt = `You are an expert cold email copywriter specializing in asset-based outreach.

Write a highly personalized cold email for the following lead:
- Name: ${params.lead.firstName} ${params.lead.lastName}
- Title: ${params.lead.title} at ${params.lead.organizationName}
- Company Context: ${params.lead.websiteContext}
- Person Context: ${params.lead.personContext}
- Strategic Angle: ${angle}

Sender's Business: ${params.businessDescription}
Sender Name: ${params.senderName}

Requirements:
- Subject line that references something specific about their company
- Opening that shows genuine research
- 2-3 short sentences connecting their situation to sender value
- Soft CTA
- Total length: 80-120 words
- Tone: professional but conversational, not salesy

Format as Markdown with **Subject:** on the first line, then the email body.`;

  const resp = await fetchWithTimeoutRetry(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 600,
      }),
    },
    {
      timeoutMs: PROVIDER_TIMEOUT_MS,
      retries: PROVIDER_RETRIES,
      requestId: params.requestId,
      provider: "openai",
    }
  );
  if (!resp.ok) throw new Error(`OpenAI request failed (${resp.status})`);
  const json = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

/** Lightweight markdown → HTML for transactional email. */
function mdToHtml(md: string): string {
  let html = md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /^# (.+)$/gm,
      '<h1 style="font-size:24px;margin:0 0 16px;color:#0a1628;">$1</h1>'
    )
    .replace(
      /^## (.+)$/gm,
      '<h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.18em;margin:24px 0 8px;color:#0891b2;">$1</h2>'
    )
    .replace(
      /^&gt; (.+)$/gm,
      '<blockquote style="border-left:3px solid #06b6d4;padding-left:12px;color:#475569;margin:16px 0;">$1</blockquote>'
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /^---$/gm,
      '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />'
    );
  html = html
    .split(/\n{2,}/)
    .map(para =>
      /^\s*<(h1|h2|blockquote|hr)/.test(para)
        ? para
        : `<p style="margin:0 0 12px;line-height:1.5;color:#1e293b;">${para.replace(/\n/g, "<br/>")}</p>`
    )
    .join("\n");
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;">${html}</div>`;
}

function mdToText(md: string): string {
  return md
    .replace(/^#+\s+/gm, "")
    .replace(/^>\s*/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^---$/gm, "");
}

function extractSubjectAndBody(md: string): { subject: string; body: string } {
  const m = md.match(/^\s*\*\*Subject:\*\*\s*(.+?)\n([\s\S]*)$/);
  if (m) return { subject: m[1].trim(), body: m[2].trim() };
  const firstH1 = md.match(/^#\s+(.+)$/m);
  return { subject: firstH1 ? firstH1[1].trim() : "Quick note", body: md };
}

export async function buildApp(): Promise<express.Express> {
  if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set and at least 32 characters long."
    );
  }
  assertEnterpriseProductionConfig();

  const app = express();
  app.disable("x-powered-by");
  const entitlementDb = new EntitlementDb({
    databaseUrl: process.env.DATABASE_URL,
  });
  await entitlementDb.init();

  app.set("trust proxy", 1);
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: false,
      hsts:
        process.env.NODE_ENV === "production"
          ? { maxAge: 31536000, includeSubDomains: true, preload: false }
          : false,
    })
  );
  app.use(express.json({ limit: "1mb" }));
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max: 180,
      standardHeaders: true,
      legacyHeaders: false,
      message: { ok: false, error: "Too many requests. Please retry shortly." },
    })
  );
  const authLimiter = rateLimit({
    windowMs: LOGIN_WINDOW_MS,
    max: LOGIN_MAX_ATTEMPTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      error: "Too many login attempts. Try again in a few minutes.",
    },
  });
  const llmLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 24,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      error: "Too many AI requests. Please wait a moment.",
    },
  });

  // Default: reflect any Origin (dev). Set SKERRY_ALLOWED_ORIGINS to restrict credentialed API.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = parseAllowedOrigins();
    if (origin && !isOriginAllowed(origin, allowedOrigins)) {
      if (req.method === "OPTIONS") return res.sendStatus(403);
      if (req.path.startsWith("/api/")) {
        return res
          .status(403)
          .json({ ok: false, error: "Origin not allowed." });
      }
    }
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,X-CSRF-Token");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.use((req, res, next) => {
    const requestId = req.get("x-request-id") || makeRequestId();
    (req as RequestWithContext).ctx = { requestId };
    res.setHeader("x-request-id", requestId);
    const startedAt = Date.now();
    res.on("finish", () => {
      logEvent("info", "http_request", {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });
    if (!req.path.startsWith("/api/")) return next();
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
    if (req.path === "/api/auth/login" || req.path === "/api/auth/csrf")
      return next();
    const csrfCookie = parseCookie(req, CSRF_COOKIE_NAME);
    const csrfHeader = req.get("x-csrf-token");
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return res
        .status(403)
        .json({ ok: false, error: "CSRF token invalid or missing." });
    }
    return next();
  });

  // ──────────── /api/auth/login
  const loginSchema = z.object({
    email: z.string().email().max(320),
    password: z.string().min(1).max(512),
  });
  const entitlementStartSchema = z.object({
    requestedLeads: z.coerce.number().int().positive().optional(),
  });
  const generateLeadsSchema = z.object({
    businessDescription: z.string().max(5000).optional(),
    targetAudience: z.string().max(2000).optional(),
    requestedLeads: z.coerce.number().int().positive().optional(),
  });
  const generateEmailSchema = z.object({
    lead: z
      .object({
        firstName: z.string().max(200).optional(),
        lastName: z.string().max(200).optional(),
        title: z.string().max(200).optional(),
        organization: z
          .object({ name: z.string().max(300).optional() })
          .optional(),
        websiteContext: z.string().max(5000).optional(),
        personContext: z.string().max(5000).optional(),
        uniqueAngles: z.array(z.string().max(200)).max(10).optional(),
      })
      .optional(),
    businessDescription: z.string().max(5000).optional(),
    senderName: z.string().max(200).optional(),
    angle: z.string().max(300).optional(),
  });
  const verifyEmailSchema = z.object({
    email: z.string().email().max(320),
  });
  const sendEmailSchema = z.object({
    to: z.string().email().max(320),
    subject: z.string().max(300).optional(),
    bodyMarkdown: z.string().min(1).max(50000),
  });

  app.post("/api/auth/login", authLimiter, (req, res) => {
    const parsed = loginSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res
        .status(400)
        .json({ ok: false, error: "email + password required" });
    }
    const { email, password } = parsed.data as LoginBody;
    if (!ALLOW_DEMO_AUTH) {
      return res.status(503).json({
        ok: false,
        error:
          "Auth provider not configured. Set ALLOW_DEMO_AUTH=true only for controlled dev.",
      });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const ip = req.ip ?? "unknown_ip";
    const attemptKey = `${ip}:${normalizedEmail}`;
    const now = Date.now();
    const attempt = loginAttempts.get(attemptKey);
    if (attempt) {
      const elapsed = now - attempt.firstAt;
      if (elapsed > LOGIN_WINDOW_MS) {
        loginAttempts.delete(attemptKey);
      } else if (attempt.count >= LOGIN_MAX_ATTEMPTS) {
        return res.status(429).json({
          ok: false,
          error: "Too many login attempts. Try again in a few minutes.",
        });
      }
    }

    const match = DEMO_USERS[normalizedEmail];
    if (!match || match.password !== password) {
      const prev = loginAttempts.get(attemptKey);
      if (!prev) {
        loginAttempts.set(attemptKey, { count: 1, firstAt: now });
      } else {
        loginAttempts.set(attemptKey, {
          count: prev.count + 1,
          firstAt: prev.firstAt,
        });
      }
      return res
        .status(401)
        .json({ ok: false, error: "Invalid email or password." });
    }

    loginAttempts.delete(attemptKey);

    const payload: SessionPayload = {
      user: match.user,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };
    const token = signSession(payload);
    const csrfToken = createCsrfToken();
    const cookie = [
      `${AUTH_COOKIE_NAME}=${encodeURIComponent(token)}`,
      "HttpOnly",
      "Path=/",
      "SameSite=Lax",
      isSecureRequest(req) ? "Secure" : "",
      `Max-Age=${SESSION_TTL_SECONDS}`,
    ]
      .filter(Boolean)
      .join("; ");
    res.append("Set-Cookie", cookie);
    setCsrfCookie(req, res, csrfToken);
    return res.json({ ok: true, user: match.user, csrfToken });
  });

  app.get("/api/auth/csrf", (req, res) => {
    const token = parseCookie(req, AUTH_COOKIE_NAME);
    if (!token || !verifySession(token)) {
      return res.status(401).json({ ok: false, error: "No active session" });
    }
    const csrfToken = createCsrfToken();
    setCsrfCookie(req, res, csrfToken);
    return res.json({ ok: true, csrfToken });
  });

  // ──────────── /api/auth/session
  app.get("/api/auth/session", (req, res) => {
    const token = parseCookie(req, AUTH_COOKIE_NAME);
    if (!token)
      return res.status(401).json({ ok: false, error: "No active session" });
    const payload = verifySession(token);
    if (!payload)
      return res.status(401).json({ ok: false, error: "Session expired" });
    const csrfToken = createCsrfToken();
    setCsrfCookie(req, res, csrfToken);
    return res.json({ ok: true, user: payload.user, csrfToken });
  });

  // ──────────── /api/auth/logout
  app.post("/api/auth/logout", (req, res) => {
    clearAuthCookies(req, res);
    return res.json({ ok: true });
  });

  const requireAuth: express.RequestHandler = (req, res, next) => {
    const user = getSessionUser(req);
    if (!user) {
      return res
        .status(401)
        .json({ ok: false, error: "Authentication required" });
    }
    return next();
  };

  // ──────────── /api/entitlements/usage
  app.get(
    "/api/entitlements/usage",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = getSessionUser(req);
      if (!user) {
        return res
          .status(401)
          .json({ ok: false, error: "Authentication required" });
      }
      if (!entitlementDb.isConfigured) {
        return res.status(503).json({
          ok: false,
          error: "DATABASE_URL is required for entitlements.",
        });
      }
      try {
        const limits = TIER_LIMITS[user.tier];
        const usageMonth = getCurrentMonthKey();
        const usage = await entitlementDb.getUsage(user.email, usageMonth);
        return res.json({
          ok: true,
          tier: user.tier,
          usageMonth,
          runsUsed: usage.runsUsed,
          monthlyRuns: limits.monthlyRuns,
          runsRemaining: Math.max(limits.monthlyRuns - usage.runsUsed, 0),
          maxLeadsPerRun: limits.maxLeadsPerRun,
        });
      } catch (err) {
        logEvent("error", "entitlements_usage_failed", {
          requestId: (req as RequestWithContext).ctx?.requestId ?? "unknown",
          error: String(err),
        });
        return res.status(502).json({ ok: false, error: clientSafeError(err) });
      }
    })
  );

  // ──────────── /api/entitlements/research/start
  app.post(
    "/api/entitlements/research/start",
    requireAuth,
    asyncHandler(async (req, res) => {
      const user = getSessionUser(req);
      if (!user) {
        return res
          .status(401)
          .json({ ok: false, error: "Authentication required" });
      }
      const parsed = entitlementStartSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res
          .status(400)
          .json({ ok: false, error: "Invalid entitlement payload." });
      }
      const limits = TIER_LIMITS[user.tier];
      const { requestedLeads } = parsed.data as EntitlementStartBody;
      const requested = Math.max(
        1,
        Number(requestedLeads ?? limits.maxLeadsPerRun)
      );
      if (requested > limits.maxLeadsPerRun) {
        return res.status(400).json({
          ok: false,
          error: `Plan allows max ${limits.maxLeadsPerRun} leads per run.`,
        });
      }

      if (!entitlementDb.isConfigured) {
        return res.status(503).json({
          ok: false,
          error: "DATABASE_URL is required for entitlements.",
        });
      }
      try {
        const usageMonth = getCurrentMonthKey();
        const usage = await entitlementDb.getUsage(user.email, usageMonth);
        if (usage.runsUsed >= limits.monthlyRuns) {
          return res.status(403).json({
            ok: false,
            error:
              "Monthly run limit reached. Upgrade plan or wait for next month.",
            tier: user.tier,
            runsUsed: usage.runsUsed,
            monthlyRuns: limits.monthlyRuns,
          });
        }
        return res.json({
          ok: true,
          tier: user.tier,
          usageMonth,
          runsUsed: usage.runsUsed,
          monthlyRuns: limits.monthlyRuns,
          runsRemaining: Math.max(limits.monthlyRuns - usage.runsUsed, 0),
          maxLeadsPerRun: limits.maxLeadsPerRun,
          requestedLeads: requested,
        });
      } catch (err) {
        logEvent("error", "entitlements_research_start_failed", {
          requestId: (req as RequestWithContext).ctx?.requestId ?? "unknown",
          error: String(err),
        });
        return res.status(502).json({ ok: false, error: clientSafeError(err) });
      }
    })
  );

  // ──────────── /api/leads/generate
  app.post(
    "/api/leads/generate",
    requireAuth,
    llmLimiter,
    asyncHandler(async (req, res) => {
      const user = getSessionUser(req);
      if (!user) {
        return res
          .status(401)
          .json({ ok: false, error: "Authentication required" });
      }
      if (!entitlementDb.isConfigured) {
        return res.status(503).json({
          ok: false,
          error: "DATABASE_URL is required for entitlements.",
        });
      }
      const limits = TIER_LIMITS[user.tier];
      const usageMonth = getCurrentMonthKey();
      const consumed = await entitlementDb.consumeRun({
        email: user.email,
        tier: user.tier,
        usageMonth,
        monthlyRunsLimit: limits.monthlyRuns,
      });
      if (!consumed.allowed) {
        return res.status(403).json({
          ok: false,
          error:
            "Monthly run limit reached. Upgrade plan or wait for next month.",
          tier: user.tier,
          runsUsed: consumed.runsUsed,
          monthlyRuns: limits.monthlyRuns,
        });
      }

      const parsed = generateLeadsSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res
          .status(400)
          .json({ ok: false, error: "Invalid lead generation payload." });
      }
      const body = parsed.data as GenerateLeadsBody;
      const requested = Math.max(
        1,
        Number(body.requestedLeads ?? limits.maxLeadsPerRun)
      );
      const count = Math.min(requested, limits.maxLeadsPerRun);
      const businessDescription = (
        body.businessDescription ?? "B2B SaaS"
      ).trim();
      const targetAudience = (
        body.targetAudience ?? "Growth-stage startups"
      ).trim();

      let leads: GeneratedLead[] = [];
      let source: "openai" | "synthesizer" = "synthesizer";
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey) {
        try {
          leads = await generateLeadsWithOpenAI({
            apiKey,
            count,
            tier: user.tier,
            businessDescription,
            targetAudience,
            requestId: (req as RequestWithContext).ctx?.requestId ?? "unknown",
          });
          source = "openai";
        } catch (err) {
          logEvent("warn", "openai_leads_fallback", {
            requestId: (req as RequestWithContext).ctx?.requestId ?? "unknown",
            error: String(err),
          });
        }
      }
      if (leads.length === 0) {
        leads = synthesizeServerLeads({
          count,
          tier: user.tier,
          businessDescription,
          targetAudience,
        });
        source = "synthesizer";
      }

      return res.json({
        ok: true,
        source,
        leads,
        tier: user.tier,
        usageMonth,
        runsUsed: consumed.runsUsed,
        monthlyRuns: limits.monthlyRuns,
        runsRemaining: Math.max(limits.monthlyRuns - consumed.runsUsed, 0),
        maxLeadsPerRun: limits.maxLeadsPerRun,
      });
    })
  );

  // ──────────── /api/email/generate
  app.post(
    "/api/email/generate",
    requireAuth,
    llmLimiter,
    asyncHandler(async (req, res) => {
      const parsed = generateEmailSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res
          .status(400)
          .json({ ok: false, error: "Invalid email generation payload." });
      }
      const body = parsed.data as GenerateEmailBody;
      const lead = body.lead ?? {};
      const firstName = (lead.firstName ?? "").trim();
      const lastName = (lead.lastName ?? "").trim();
      const title = (lead.title ?? "Executive").trim();
      const organizationName = (
        lead.organization?.name ?? "your company"
      ).trim();
      const websiteContext = (lead.websiteContext ?? "").trim();
      const personContext = (lead.personContext ?? "").trim();
      const uniqueAngles = Array.isArray(lead.uniqueAngles)
        ? lead.uniqueAngles.filter((a): a is string => typeof a === "string")
        : [];
      if (!firstName) {
        return res
          .status(400)
          .json({ ok: false, error: "lead.firstName required" });
      }

      const businessDescription = (
        body.businessDescription ?? "B2B SaaS company"
      ).trim();
      const senderName = (body.senderName ?? "Skerry").trim();
      const angle = (
        body.angle ??
        uniqueAngles[0] ??
        "value proposition"
      ).trim();
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        return res.json({
          ok: true,
          source: "synthesizer",
          markdown: synthesizeServerEmail({
            firstName,
            organizationName,
            angle,
            senderName,
          }),
        });
      }

      try {
        const markdown = await generateEmailWithOpenAI({
          apiKey,
          lead: {
            firstName,
            lastName,
            title,
            organizationName,
            websiteContext,
            personContext,
            uniqueAngles,
          },
          businessDescription,
          senderName,
          angle,
          requestId: (req as RequestWithContext).ctx?.requestId ?? "unknown",
        });
        if (!markdown) {
          throw new Error("Empty model response");
        }
        return res.json({ ok: true, source: "openai", markdown });
      } catch (err) {
        logEvent("warn", "openai_email_fallback", {
          requestId: (req as RequestWithContext).ctx?.requestId ?? "unknown",
          error: String(err),
        });
        return res.json({
          ok: true,
          source: "synthesizer",
          markdown: synthesizeServerEmail({
            firstName,
            organizationName,
            angle,
            senderName,
          }),
        });
      }
    })
  );

  // ──────────── /api/ready (DB ping when DATABASE_URL is set; for orchestrator readiness probes)
  app.get(
    "/api/ready",
    asyncHandler(async (_req, res) => {
      if (!entitlementDb.isConfigured) {
        return res.status(200).json({ ok: true, database: "not_configured" });
      }
      try {
        await entitlementDb.ping();
        return res.status(200).json({ ok: true, database: "ok" });
      } catch (err) {
        logEvent("error", "readiness_db_ping_failed", { error: String(err) });
        return res.status(503).json({ ok: false, database: "unavailable" });
      }
    })
  );

  // ──────────── /api/health
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      services: {
        openai: Boolean(process.env.OPENAI_API_KEY),
        resend: Boolean(process.env.RESEND_API_KEY),
        neverbounce: Boolean(process.env.NEVERBOUNCE_API_KEY),
      },
    });
  });

  // ──────────── /api/email/verify
  app.post(
    "/api/email/verify",
    requireAuth,
    asyncHandler(async (req, res) => {
      const parsed = verifyEmailSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ ok: false, error: "email required" });
      }
      const { email } = parsed.data as VerifyEmailBody;
      const neverbounceKey = process.env.NEVERBOUNCE_API_KEY;
      if (!neverbounceKey) {
        return res.json({ ok: true, valid: true, status: "format_only" });
      }
      try {
        const url = `https://api.neverbounce.com/v4/single/check?key=${encodeURIComponent(neverbounceKey)}&email=${encodeURIComponent(email)}`;
        const resp = await fetchWithTimeoutRetry(
          url,
          { method: "GET" },
          {
            timeoutMs: PROVIDER_TIMEOUT_MS,
            retries: PROVIDER_RETRIES,
            requestId: (req as RequestWithContext).ctx?.requestId ?? "unknown",
            provider: "neverbounce",
          }
        );
        const json = (await resp.json()) as {
          result?: string;
          status?: string;
          message?: string;
        };
        const result = json.result ?? json.status ?? "unknown";
        const verified = result === "valid" || result === "catchall";
        // NeverBounce returns "general_failure" with a message when credits run out
        // or the account is misconfigured. Don't block the send — fall back to format-only.
        if (result === "general_failure") {
          return res.json({
            ok: true,
            valid: true,
            status: "format_only",
            warning: json.message ?? "neverbounce general_failure",
          });
        }
        return res.json({ ok: true, valid: verified, status: result });
      } catch (err) {
        return res.json({
          ok: true,
          valid: true,
          status: "format_only",
          warning: clientSafeWarning(err),
        });
      }
    })
  );

  // ──────────── /api/email/send (Resend; falls back to dry-run if no key)
  app.post(
    "/api/email/send",
    requireAuth,
    asyncHandler(async (req, res) => {
      const parsed = sendEmailSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res
          .status(400)
          .json({ ok: false, error: "to + bodyMarkdown required" });
      }
      const { to, subject, bodyMarkdown } = parsed.data as SendEmailBody;
      const resendKey = process.env.RESEND_API_KEY;
      const from =
        process.env.SKERRY_FROM_EMAIL ?? "Skerry <onboarding@resend.dev>";
      const { subject: parsedSubject, body } =
        extractSubjectAndBody(bodyMarkdown);
      const finalSubject = subject || parsedSubject;

      if (!resendKey) {
        logEvent("info", "email_send_dry_run", {
          requestId: (req as RequestWithContext).ctx?.requestId ?? "unknown",
          to,
          subject: finalSubject,
        });
        return res.json({ ok: true, dryRun: true, id: `dryrun_${Date.now()}` });
      }

      try {
        const resp = await fetchWithTimeoutRetry(
          "https://api.resend.com/emails",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from,
              to,
              subject: finalSubject,
              html: mdToHtml(body),
              text: mdToText(body),
            }),
          },
          {
            timeoutMs: PROVIDER_TIMEOUT_MS,
            retries: PROVIDER_RETRIES,
            requestId: (req as RequestWithContext).ctx?.requestId ?? "unknown",
            provider: "resend",
          }
        );
        const json = (await resp.json()) as { id?: string; message?: string };
        if (!resp.ok) {
          return res
            .status(502)
            .json({ ok: false, error: json.message ?? "send failed" });
        }
        return res.json({ ok: true, id: json.id });
      } catch (err) {
        logEvent("error", "email_send_failed", {
          requestId: (req as RequestWithContext).ctx?.requestId ?? "unknown",
          error: String(err),
        });
        return res.status(502).json({ ok: false, error: clientSafeError(err) });
      }
    })
  );

  // Static SPA in production. In dev, Vite serves the SPA on its own port.
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");
  const indexPath = path.join(staticPath, "index.html");
  app.use(express.static(staticPath));
  app.get("*", (req, res, next) => {
    if (process.env.NODE_ENV !== "production" && !fs.existsSync(indexPath)) {
      return res.redirect(302, `http://localhost:3000${req.originalUrl}`);
    }
    res.sendFile(indexPath, err => {
      if (err) next(err);
    });
  });

  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      const requestId =
        (req as RequestWithContext).ctx?.requestId ??
        req.get("x-request-id") ??
        makeRequestId();
      const withStatus = err as { status?: number; statusCode?: number };
      const fromStatus =
        typeof withStatus.status === "number"
          ? withStatus.status
          : typeof withStatus.statusCode === "number"
            ? withStatus.statusCode
            : undefined;
      const status =
        fromStatus !== undefined && fromStatus >= 400 && fromStatus < 600
          ? fromStatus
          : err instanceof SyntaxError
            ? 400
            : 500;
      if (status >= 500) {
        logEvent("error", "unhandled_route_error", {
          requestId,
          error: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
        });
      }
      if (!res.headersSent) {
        const exposeDetail = process.env.NODE_ENV !== "production";
        const message =
          status === 400
            ? "Invalid request body."
            : exposeDetail && err instanceof Error
              ? err.message
              : exposeDetail
                ? String(err)
                : "Internal server error.";
        res.status(status).json({ ok: false, error: message, requestId });
      }
    }
  );

  return app;
}

async function startServer() {
  const app = await buildApp();
  const server = createServer(app);
  const port = Number(process.env.PORT ?? 3001);
  server.listen(port, () => {
    console.log(`Skerry server: http://localhost:${port}/`);
    console.log(`Health: http://localhost:${port}/api/health`);
    console.log(`Ready: http://localhost:${port}/api/ready`);
  });
}

const isEntrypoint = process.argv[1]
  ? path.resolve(process.argv[1]) === __filename
  : false;
if (isEntrypoint) {
  startServer().catch(console.error);
}
