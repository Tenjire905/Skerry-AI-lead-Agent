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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin ?? "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
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
  app.post("/api/email/verify", async (req, res) => {
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
  app.post("/api/email/send", async (req, res) => {
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
