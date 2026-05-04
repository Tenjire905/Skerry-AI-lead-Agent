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
 */

import "dotenv/config";

import express from "express";
import { createServer } from "http";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";

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
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const SESSION_SECRET = process.env.SESSION_SECRET ?? "dev_skerry_session_secret_change_me";
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 8;

const DEMO_USERS: Record<string, { password: string; user: AuthSessionUser }> = {
  "solo@skerry.io": {
    password: "solo123",
    user: { name: "Solo User", email: "solo@skerry.io", role: "user", tier: "solo" },
  },
  "team@skerry.io": {
    password: "team123",
    user: { name: "Team User", email: "team@skerry.io", role: "user", tier: "team" },
  },
  "agency@skerry.io": {
    password: "agency123",
    user: { name: "Agency User", email: "agency@skerry.io", role: "user", tier: "agency" },
  },
  "dev@skerry.io": {
    password: "skerry-dev-2024",
    user: { name: "Developer", email: "dev@skerry.io", role: "developer", tier: "agency" },
  },
};

const loginAttempts = new Map<string, { count: number; firstAt: number }>();
const entitlementUsage = new Map<string, { runsUsed: number }>();
const TIER_LIMITS: Record<AccountTier, { monthlyRuns: number; maxLeadsPerRun: number }> = {
  solo: { monthlyRuns: 50, maxLeadsPerRun: 5 },
  team: { monthlyRuns: 250, maxLeadsPerRun: 20 },
  agency: { monthlyRuns: 1000, maxLeadsPerRun: 50 },
};
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function signSession(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

function verifySession(token: string): SessionPayload | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(body)
    .digest("base64url");
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
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
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
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

function getEntitlementKey(email: string): string {
  return `${email}:${getCurrentMonthKey()}`;
}

function synthesizeServerLeads(params: {
  count: number;
  tier: AccountTier;
  businessDescription?: string;
  targetAudience?: string;
}): GeneratedLead[] {
  const firstNames = ["Aria", "Marcus", "Priya", "Devon", "Sana", "Jules", "Kai", "Mira"];
  const lastNames = ["Voss", "Tan", "Raman", "Reyes", "Okafor", "Nilsson", "Grant", "Kim"];
  const titlesByTier: Record<AccountTier, string[]> = {
    solo: ["Founder", "Co-Founder", "Marketing Lead"],
    team: ["VP of Growth", "Head of Marketing", "Director of Demand Gen"],
    agency: ["Chief Revenue Officer", "Head of GTM", "VP of Strategy"],
  };
  const orgs = [
    { name: "Helios Labs", website: "helioslabs.io", domain: "renewable analytics" },
    { name: "Lattice Health", website: "latticehealth.co", domain: "health data infra" },
    { name: "Polaris Data", website: "polarisdata.ai", domain: "ML observability" },
    { name: "Aether Logistics", website: "aetherlogistics.io", domain: "AI freight matching" },
  ];

  const leads: GeneratedLead[] = [];
  for (let i = 0; i < params.count; i++) {
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[(i * 3) % lastNames.length];
    const title = titlesByTier[params.tier][i % titlesByTier[params.tier].length];
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
      uniqueAngles: ["Category shift", "Pipeline efficiency", "Strategic positioning"],
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

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
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
  });
  if (!resp.ok) {
    throw new Error(`OpenAI request failed (${resp.status})`);
  }
  const json = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = json.choices?.[0]?.message?.content ?? "[]";
  const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
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
}): Promise<string> {
  const angle = params.angle ?? params.lead.uniqueAngles[0] ?? "value proposition";
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

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
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
  });
  if (!resp.ok) throw new Error(`OpenAI request failed (${resp.status})`);
  const json = (await resp.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

/** Lightweight markdown → HTML for transactional email. */
function mdToHtml(md: string): string {
  let html = md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^# (.+)$/gm, '<h1 style="font-size:24px;margin:0 0 16px;color:#0a1628;">$1</h1>')
    .replace(/^## (.+)$/gm, '<h2 style="font-size:14px;text-transform:uppercase;letter-spacing:.18em;margin:24px 0 8px;color:#0891b2;">$1</h2>')
    .replace(/^&gt; (.+)$/gm, '<blockquote style="border-left:3px solid #06b6d4;padding-left:12px;color:#475569;margin:16px 0;">$1</blockquote>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^---$/gm, '<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />');
  html = html
    .split(/\n{2,}/)
    .map((para) =>
      /^\s*<(h1|h2|blockquote|hr)/.test(para)
        ? para
        : `<p style="margin:0 0 12px;line-height:1.5;color:#1e293b;">${para.replace(/\n/g, "<br/>")}</p>`,
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

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "1mb" }));

  // Permissive CORS for local dev. Tighten in prod.
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  // ──────────── /api/auth/login
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = (req.body ?? {}) as LoginBody;
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ ok: false, error: "email + password required" });
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
        loginAttempts.set(attemptKey, { count: prev.count + 1, firstAt: prev.firstAt });
      }
      return res.status(401).json({ ok: false, error: "Invalid email or password." });
    }

    loginAttempts.delete(attemptKey);

    const payload: SessionPayload = {
      user: match.user,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    };
    const token = signSession(payload);
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
    res.setHeader("Set-Cookie", cookie);
    return res.json({ ok: true, user: match.user });
  });

  // ──────────── /api/auth/session
  app.get("/api/auth/session", (req, res) => {
    const token = parseCookie(req, AUTH_COOKIE_NAME);
    if (!token) return res.status(401).json({ ok: false, error: "No active session" });
    const payload = verifySession(token);
    if (!payload) return res.status(401).json({ ok: false, error: "Session expired" });
    return res.json({ ok: true, user: payload.user });
  });

  // ──────────── /api/auth/logout
  app.post("/api/auth/logout", (_req, res) => {
    const cookie = [
      `${AUTH_COOKIE_NAME}=`,
      "HttpOnly",
      "Path=/",
      "SameSite=Lax",
      "Max-Age=0",
    ].join("; ");
    res.setHeader("Set-Cookie", cookie);
    return res.json({ ok: true });
  });

  const requireAuth: express.RequestHandler = (req, res, next) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ ok: false, error: "Authentication required" });
    }
    return next();
  };

  // ──────────── /api/entitlements/usage
  app.get("/api/entitlements/usage", requireAuth, (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ ok: false, error: "Authentication required" });
    }
    const limits = TIER_LIMITS[user.tier];
    const entitlementKey = getEntitlementKey(user.email);
    const currentUsage = entitlementUsage.get(entitlementKey) ?? { runsUsed: 0 };
    if (currentUsage.runsUsed >= limits.monthlyRuns) {
      return res.status(403).json({
        ok: false,
        error: "Monthly run limit reached. Upgrade plan or wait for next month.",
        tier: user.tier,
        runsUsed: currentUsage.runsUsed,
        monthlyRuns: limits.monthlyRuns,
      });
    }

    const nextUsage = { runsUsed: currentUsage.runsUsed + 1 };
    entitlementUsage.set(entitlementKey, nextUsage);
    const key = getEntitlementKey(user.email);
    const usage = entitlementUsage.get(key) ?? { runsUsed: 0 };
    return res.json({
      ok: true,
      tier: user.tier,
      usageMonth: getCurrentMonthKey(),
      runsUsed: usage.runsUsed,
      monthlyRuns: limits.monthlyRuns,
      runsRemaining: Math.max(limits.monthlyRuns - usage.runsUsed, 0),
      maxLeadsPerRun: limits.maxLeadsPerRun,
    });
  });

  // ──────────── /api/entitlements/research/start
  app.post("/api/entitlements/research/start", requireAuth, (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ ok: false, error: "Authentication required" });
    }
    const limits = TIER_LIMITS[user.tier];
    const { requestedLeads } = (req.body ?? {}) as EntitlementStartBody;
    const requested = Math.max(1, Number(requestedLeads ?? limits.maxLeadsPerRun));
    if (requested > limits.maxLeadsPerRun) {
      return res.status(400).json({
        ok: false,
        error: `Plan allows max ${limits.maxLeadsPerRun} leads per run.`,
      });
    }

    const key = getEntitlementKey(user.email);
    const usage = entitlementUsage.get(key) ?? { runsUsed: 0 };
    if (usage.runsUsed >= limits.monthlyRuns) {
      return res.status(403).json({
        ok: false,
        error: "Monthly run limit reached. Upgrade plan or wait for next month.",
        tier: user.tier,
        runsUsed: usage.runsUsed,
        monthlyRuns: limits.monthlyRuns,
      });
    }

    const nextUsage = { runsUsed: usage.runsUsed + 1 };
    entitlementUsage.set(key, nextUsage);
    return res.json({
      ok: true,
      tier: user.tier,
      usageMonth: getCurrentMonthKey(),
      runsUsed: nextUsage.runsUsed,
      monthlyRuns: limits.monthlyRuns,
      runsRemaining: Math.max(limits.monthlyRuns - nextUsage.runsUsed, 0),
      maxLeadsPerRun: limits.maxLeadsPerRun,
      requestedLeads: requested,
    });
  });

  // ──────────── /api/leads/generate
  app.post("/api/leads/generate", requireAuth, async (req, res) => {
    const user = getSessionUser(req);
    if (!user) {
      return res.status(401).json({ ok: false, error: "Authentication required" });
    }
    const limits = TIER_LIMITS[user.tier];
    const entitlementKey = getEntitlementKey(user.email);
    const currentUsage = entitlementUsage.get(entitlementKey) ?? { runsUsed: 0 };
    if (currentUsage.runsUsed >= limits.monthlyRuns) {
      return res.status(403).json({
        ok: false,
        error: "Monthly run limit reached. Upgrade plan or wait for next month.",
        tier: user.tier,
        runsUsed: currentUsage.runsUsed,
        monthlyRuns: limits.monthlyRuns,
      });
    }
    const nextUsage = { runsUsed: currentUsage.runsUsed + 1 };
    entitlementUsage.set(entitlementKey, nextUsage);

    const body = (req.body ?? {}) as GenerateLeadsBody;
    const requested = Math.max(1, Number(body.requestedLeads ?? limits.maxLeadsPerRun));
    const count = Math.min(requested, limits.maxLeadsPerRun);
    const businessDescription = (body.businessDescription ?? "B2B SaaS").trim();
    const targetAudience = (body.targetAudience ?? "Growth-stage startups").trim();

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
        });
        source = "openai";
      } catch (err) {
        console.warn("[leads/generate] OpenAI failed, falling back to synthesizer", String(err));
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
      usageMonth: getCurrentMonthKey(),
      runsUsed: nextUsage.runsUsed,
      monthlyRuns: limits.monthlyRuns,
      runsRemaining: Math.max(limits.monthlyRuns - nextUsage.runsUsed, 0),
      maxLeadsPerRun: limits.maxLeadsPerRun,
    });
  });

  // ──────────── /api/email/generate
  app.post("/api/email/generate", requireAuth, async (req, res) => {
    const body = (req.body ?? {}) as GenerateEmailBody;
    const lead = body.lead ?? {};
    const firstName = (lead.firstName ?? "").trim();
    const lastName = (lead.lastName ?? "").trim();
    const title = (lead.title ?? "Executive").trim();
    const organizationName = (lead.organization?.name ?? "your company").trim();
    const websiteContext = (lead.websiteContext ?? "").trim();
    const personContext = (lead.personContext ?? "").trim();
    const uniqueAngles = Array.isArray(lead.uniqueAngles)
      ? lead.uniqueAngles.filter((a): a is string => typeof a === "string")
      : [];
    if (!firstName) {
      return res.status(400).json({ ok: false, error: "lead.firstName required" });
    }

    const businessDescription = (body.businessDescription ?? "B2B SaaS company").trim();
    const senderName = (body.senderName ?? "Skerry").trim();
    const angle = (body.angle ?? uniqueAngles[0] ?? "value proposition").trim();
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.json({
        ok: true,
        source: "synthesizer",
        markdown: synthesizeServerEmail({ firstName, organizationName, angle, senderName }),
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
      });
      if (!markdown) {
        throw new Error("Empty model response");
      }
      return res.json({ ok: true, source: "openai", markdown });
    } catch (err) {
      console.warn("[email/generate] OpenAI failed, using synthesizer:", String(err));
      return res.json({
        ok: true,
        source: "synthesizer",
        markdown: synthesizeServerEmail({ firstName, organizationName, angle, senderName }),
      });
    }
  });

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
  app.post("/api/email/verify", requireAuth, async (req, res) => {
    const { email } = (req.body ?? {}) as VerifyEmailBody;
    if (typeof email !== "string") {
      return res.status(400).json({ ok: false, error: "email required" });
    }
    if (!isValidEmail(email)) {
      return res.json({ ok: true, valid: false, status: "invalid_format" });
    }
    const neverbounceKey = process.env.NEVERBOUNCE_API_KEY;
    if (!neverbounceKey) {
      return res.json({ ok: true, valid: true, status: "format_only" });
    }
    try {
      const url = `https://api.neverbounce.com/v4/single/check?key=${encodeURIComponent(neverbounceKey)}&email=${encodeURIComponent(email)}`;
      const resp = await fetch(url);
      const json = (await resp.json()) as { result?: string; status?: string; message?: string };
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
      return res.json({ ok: true, valid: true, status: "format_only", warning: String(err) });
    }
  });

  // ──────────── /api/email/send (Resend; falls back to dry-run if no key)
  app.post("/api/email/send", requireAuth, async (req, res) => {
    const { to, subject, bodyMarkdown } = (req.body ?? {}) as SendEmailBody;
    if (!to || !bodyMarkdown) {
      return res.status(400).json({ ok: false, error: "to + bodyMarkdown required" });
    }
    if (!isValidEmail(to)) {
      return res.status(400).json({ ok: false, error: "invalid recipient" });
    }
    const resendKey = process.env.RESEND_API_KEY;
    const from = process.env.SKERRY_FROM_EMAIL ?? "Skerry <onboarding@resend.dev>";
    const { subject: parsedSubject, body } = extractSubjectAndBody(bodyMarkdown);
    const finalSubject = subject || parsedSubject;

    if (!resendKey) {
      console.log("[email/send] DRY RUN (no RESEND_API_KEY)", { to, subject: finalSubject });
      return res.json({ ok: true, dryRun: true, id: `dryrun_${Date.now()}` });
    }

    try {
      const resp = await fetch("https://api.resend.com/emails", {
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
      });
      const json = (await resp.json()) as { id?: string; message?: string };
      if (!resp.ok) {
        return res.status(502).json({ ok: false, error: json.message ?? "send failed" });
      }
      return res.json({ ok: true, id: json.id });
    } catch (err) {
      return res.status(502).json({ ok: false, error: String(err) });
    }
  });

  // Static SPA in production. In dev, Vite serves the SPA on its own port.
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");
  const indexPath = path.join(staticPath, "index.html");
  app.use(express.static(staticPath));
  app.get("*", (req, res) => {
    if (process.env.NODE_ENV !== "production" && !fs.existsSync(indexPath)) {
      return res.redirect(302, `http://localhost:3000${req.originalUrl}`);
    }
    res.sendFile(indexPath);
  });

  const port = Number(process.env.PORT ?? 3001);
  server.listen(port, () => {
    console.log(`Skerry server: http://localhost:${port}/`);
    console.log(`Health: http://localhost:${port}/api/health`);
  });
}

startServer().catch(console.error);
