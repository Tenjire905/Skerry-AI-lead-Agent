/**
 * Skerry API server: proxy for secrets, lead discovery, AI, billing webhook, health.
 * Dependencies: express, zod, @supabase/supabase-js, openai, stripe (optional).
 * Env: see .env.example — OPENAI_API_KEY, SUPABASE_*, STRIPE_*, APIFY_*, FEATURE_APIFY_LEADS, SKERRY_ALLOW_DEMO_AUTH, etc.
 */

import "dotenv/config";

import express from "express";
import { createServer } from "http";
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import type { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import { readEnv } from "./env.js";
import { authenticateRequest } from "./authRequest.js";
import {
  assertWorkspaceMember,
  getSupabaseAdmin,
  insertLeads,
  listWorkspacesForUser,
} from "./supabaseAdmin.js";
import { mdToHtml, mdToText, extractSubjectAndBody } from "./emailMarkdown.js";
import {
  discoverBodySchema,
  sendEmailBodySchema,
  verifyEmailBodySchema,
  aiEmailBodySchema,
  checkoutBodySchema,
} from "./validation/schemas.js";
import { generateLeadsOpenAI, generatedToLeadInserts, type GeneratedLeadShape } from "./pipeline/openaiLeads.js";
import { runApifyLeadDiscovery } from "./pipeline/apifyDiscover.js";
import { generateEmailMarkdown } from "./aiEmail.js";
import { leadInsertToWire, leadRowToWire } from "./leadDto.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function startServer() {
  const env = readEnv();
  const app = express();
  const server = createServer(app);

  let admin: SupabaseClient | null = null;
  if (env.supabaseUrl && env.supabaseServiceRoleKey) {
    admin = getSupabaseAdmin(env.supabaseUrl, env.supabaseServiceRoleKey);
  }

  let stripe: Stripe | null = null;
  if (env.stripeSecretKey) {
    stripe = new Stripe(env.stripeSecretKey);
  }

  // Stripe webhook must see raw body
  app.post(
    "/api/billing/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      if (!stripe || !env.stripeWebhookSecret) {
        return res.status(503).json({ ok: false, error: "stripe_not_configured" });
      }
      const sig = req.headers["stripe-signature"];
      if (!sig || typeof sig !== "string") {
        return res.status(400).json({ ok: false, error: "missing_signature" });
      }
      let event: Stripe.Event;
      try {
        event = stripe.webhooks.constructEvent(req.body as Buffer, sig, env.stripeWebhookSecret);
      } catch (err) {
        return res.status(400).json({ ok: false, error: String(err) });
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const ws = session.metadata?.workspace_id;
        const plan = session.metadata?.plan as "solo" | "team" | "agency" | undefined;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer && typeof session.customer === "object" && "id" in session.customer
              ? (session.customer as { id: string }).id
              : null;
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription && typeof session.subscription === "object" && "id" in session.subscription
              ? (session.subscription as { id: string }).id
              : null;
        try {
          if (admin && ws && plan && subscriptionId && customerId) {
            await admin
              .from("workspaces")
              .update({
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                subscription_status: "active",
                plan_tier: plan,
              })
              .eq("id", ws);
          }
        } catch (e) {
          console.error("[stripe webhook] workspace update failed:", e);
        }
      }

      return res.json({ received: true });
    },
  );

  app.use(express.json({ limit: "2mb" }));

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  const setupPayload = () => ({
    ok: true as const,
    services: {
      supabase: Boolean(env.supabaseUrl && env.supabaseServiceRoleKey),
      openai: Boolean(env.openaiApiKey),
      apify: Boolean(env.apifyApiKey && env.apifyLeadsActorId),
      apifyLeadsEnabled: env.featureApifyLeads,
      resend: Boolean(env.resendApiKey),
      neverbounce: Boolean(env.neverbounceApiKey),
      stripe: Boolean(env.stripeSecretKey),
    },
  });

  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      services: setupPayload().services,
    });
  });

  app.get("/api/setup/status", (_req, res) => {
    res.json(setupPayload());
  });

  app.get("/api/workspaces", async (req, res) => {
    const auth = await authenticateRequest(req.headers.authorization, admin, env.allowDemoAuth);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.message });
    if (auth.demo || !admin) {
      return res.json({ ok: true, workspaces: [], demo: true });
    }
    const list = await listWorkspacesForUser(admin, auth.userId);
    return res.json({
      ok: true,
      demo: false,
      workspaces: list.map((w) => ({ id: w.id, name: w.name, slug: w.slug, plan_tier: w.plan_tier })),
    });
  });

  app.post("/api/leads/discover", async (req, res) => {
    const parsed = discoverBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "validation_error", details: parsed.error.flatten() });
    }
    const body = parsed.data;

    const auth = await authenticateRequest(req.headers.authorization, admin, env.allowDemoAuth);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.message });

    if (!auth.demo) {
      if (!body.workspaceId) {
        return res.status(400).json({ ok: false, error: "workspaceId_required" });
      }
      if (!admin) {
        return res.status(503).json({ ok: false, error: "supabase_not_configured" });
      }
      const ok = await assertWorkspaceMember(admin, body.workspaceId, auth.userId);
      if (!ok) return res.status(403).json({ ok: false, error: "workspace_forbidden" });
    }

    try {
      let shapes: GeneratedLeadShape[] = [];
      let source: "apify" | "openai" = "openai";

      if (env.featureApifyLeads && env.apifyApiKey && env.apifyLeadsActorId) {
        try {
          shapes = await runApifyLeadDiscovery({
            token: env.apifyApiKey,
            actorId: env.apifyLeadsActorId,
            searchQuery: `${body.businessDescription} — ${body.targetAudience}`.slice(0, 500),
            maxItems: body.count,
          });
          source = "apify";
        } catch (e) {
          console.warn("[discover] apify failed, falling back if OpenAI available:", e);
          shapes = [];
        }
      }

      if (shapes.length === 0) {
        if (!env.openaiApiKey) {
          return res.status(503).json({
            ok: false,
            code: "NO_LEAD_PROVIDER",
            message: "Configure Apify (with FEATURE_APIFY_LEADS) and/or OPENAI_API_KEY on the server.",
          });
        }
        shapes = await generateLeadsOpenAI(env.openaiApiKey, {
          businessDescription: body.businessDescription,
          targetAudience: body.targetAudience,
          tier: body.tier,
          count: body.count,
        });
        source = "openai";
      }

      if (shapes.length === 0) {
        return res.status(502).json({ ok: false, error: "lead_generation_empty" });
      }

      const tierDeep = body.tier === "agency";
      const inserts = await generatedToLeadInserts(
        shapes.slice(0, body.count),
        source,
        body.enrichWithOpenAI && tierDeep,
        tierDeep ? env.openaiApiKey : undefined,
      );

      try {
        if (!auth.demo && body.workspaceId && admin) {
          const rows = await insertLeads(admin, body.workspaceId, inserts);
          return res.json({ ok: true, leads: rows.map(leadRowToWire), persisted: true });
        }
      } catch (e) {
        console.error("[discover] persist failed:", e);
        return res.status(500).json({ ok: false, error: "persist_failed", message: String(e) });
      }

      const { randomUUID } = await import("node:crypto");
      const leads = inserts.map((ins) => leadInsertToWire(randomUUID(), ins));
      return res.json({ ok: true, leads, persisted: false, demo: auth.demo });
    } catch (e) {
      console.error("[discover] uncaught:", e);
      return res.status(502).json({ ok: false, error: "discover_failed", message: String(e) });
    }
  });

  app.post("/api/ai/email", async (req, res) => {
    const parsed = aiEmailBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "validation_error", details: parsed.error.flatten() });
    }
    if (!env.openaiApiKey) {
      return res.status(503).json({ ok: false, error: "openai_not_configured" });
    }
    const auth = await authenticateRequest(req.headers.authorization, admin, env.allowDemoAuth);
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.message });
    if (!auth.demo && parsed.data.workspaceId && admin) {
      const ok = await assertWorkspaceMember(admin, parsed.data.workspaceId, auth.userId);
      if (!ok) return res.status(403).json({ ok: false, error: "workspace_forbidden" });
    }
    try {
      const markdown = await generateEmailMarkdown(env.openaiApiKey, parsed.data);
      return res.json({ ok: true, markdown });
    } catch (e) {
      console.error("[ai/email]", e);
      return res.status(502).json({ ok: false, error: "openai_failed", message: String(e) });
    }
  });

  app.post("/api/billing/checkout-session", async (req, res) => {
    if (!stripe || !env.stripePriceSolo) {
      return res.status(503).json({ ok: false, error: "stripe_not_configured" });
    }
    const parsed = checkoutBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "validation_error", details: parsed.error.flatten() });
    }
    const auth = await authenticateRequest(req.headers.authorization, admin, false);
    if (!auth.ok) {
      return res.status(auth.status).json({ ok: false, error: auth.message });
    }
    if (auth.demo || !admin) {
      return res.status(403).json({ ok: false, error: "auth_required" });
    }
    const { workspaceId, plan } = parsed.data;
    const member = await assertWorkspaceMember(admin, workspaceId, auth.userId);
    if (!member) return res.status(403).json({ ok: false, error: "workspace_forbidden" });

    const price =
      plan === "solo"
        ? env.stripePriceSolo
        : plan === "team"
          ? env.stripePriceTeam
          : env.stripePriceAgency;
    if (!price) {
      return res.status(503).json({ ok: false, error: "stripe_price_missing" });
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [{ price, quantity: 1 }],
        success_url: `${env.publicAppUrl}/settings?checkout=success`,
        cancel_url: `${env.publicAppUrl}/settings?checkout=cancel`,
        metadata: { workspace_id: workspaceId, plan },
      });
      return res.json({ ok: true, url: session.url });
    } catch (e) {
      console.error("[checkout]", e);
      return res.status(502).json({ ok: false, error: "stripe_session_failed", message: String(e) });
    }
  });

  app.post("/api/email/verify", async (req, res) => {
    const parsed = verifyEmailBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "validation_error" });
    }
    const { email } = parsed.data;
    if (!isValidEmail(email)) {
      return res.json({ ok: true, valid: false, status: "invalid_format" });
    }
    const neverbounceKey = env.neverbounceApiKey;
    if (!neverbounceKey) {
      return res.json({ ok: true, valid: true, status: "format_only" });
    }
    try {
      const url = `https://api.neverbounce.com/v4/single/check?key=${encodeURIComponent(neverbounceKey)}&email=${encodeURIComponent(email)}`;
      const resp = await fetch(url);
      const json = (await resp.json()) as { result?: string; status?: string; message?: string };
      const result = json.result ?? json.status ?? "unknown";
      const verified = result === "valid" || result === "catchall";
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

  app.post("/api/email/send", async (req, res) => {
    const parsed = sendEmailBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res.status(400).json({ ok: false, error: "validation_error" });
    }
    const { to, subject, bodyMarkdown } = parsed.data;
    const from = env.skerryFromEmail ?? "Skerry <onboarding@resend.dev>";
    const { subject: parsedSubject, body } = extractSubjectAndBody(bodyMarkdown);
    const finalSubject = subject || parsedSubject;
    const resendKey = env.resendApiKey;

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
  server.on("error", (err: NodeJS.ErrnoException) => {
    console.error(`[server] cannot listen on port ${port}:`, err.message);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(`Skerry server: http://localhost:${port}/`);
    console.log(`Health: http://localhost:${port}/api/health`);
  });
}

startServer().catch(console.error);
