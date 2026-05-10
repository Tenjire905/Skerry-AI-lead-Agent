import type { APIRoute } from "astro";
import { waitlistSchema } from "@/lib/validation";
import { getSupabase } from "@/lib/supabase";
import { getResend, renderConfirmationEmail } from "@/lib/resend";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const prerender = false;

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });

export const POST: APIRoute = async ({ request }) => {
  const env = import.meta.env;

  // Rate limit: 5 signups per IP per 10 minutes.
  const ip = clientIp(request);
  const rl = checkRateLimit(`waitlist:${ip}`, 5, 10 * 60_000);
  if (!rl.allowed) {
    return json(429, {
      ok: false,
      message: "Too many tries from this network. Wait a bit and retry.",
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json(400, { ok: false, message: "Invalid JSON body." });
  }

  const parsed = waitlistSchema.safeParse(payload);
  if (!parsed.success) {
    return json(400, {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    });
  }
  const input = parsed.data;

  // Honeypot tripped → silently accept (look like a success to the bot).
  if (input.company_website && input.company_website.length > 0) {
    return json(200, { ok: true, position: 0, alreadyOnList: false });
  }

  let supabase;
  try {
    supabase = getSupabase(env);
  } catch (err) {
    console.error("supabase init failed", err);
    return json(500, {
      ok: false,
      message: "Service temporarily unavailable.",
    });
  }

  const userAgent = request.headers.get("User-Agent")?.slice(0, 500) ?? null;
  const ipCountry = request.headers.get("CF-IPCountry") ?? null;

  // Upsert by lower(email). Postgres' generated `email_lower` column has the
  // unique index — we hit the conflict path on duplicates and return the
  // existing row so users see their position instead of an error.
  const { data: existing } = await supabase
    .from("waitlist")
    .select("id, position, deposited")
    .eq("email_lower", input.email)
    .maybeSingle();

  if (existing) {
    return json(200, {
      ok: true,
      position: existing.position,
      alreadyOnList: true,
    });
  }

  const { data: inserted, error } = await supabase
    .from("waitlist")
    .insert({
      email: input.email,
      utm_source: input.utm_source ?? null,
      utm_medium: input.utm_medium ?? null,
      utm_campaign: input.utm_campaign ?? null,
      referrer: input.referrer ?? null,
      user_agent: userAgent,
      ip_country: ipCountry,
    })
    .select("id, position")
    .single();

  if (error || !inserted) {
    console.error("waitlist insert failed", error);
    return json(500, { ok: false, message: "Couldn't save signup." });
  }

  // Fire-and-forget confirmation email. Failure here must not break the
  // user-visible signup flow.
  const resend = getResend(env);
  if (resend) {
    const { subject, html, text } = renderConfirmationEmail({
      email: input.email,
      position: inserted.position,
      siteUrl: env.PUBLIC_SITE_URL ?? "https://skerry.cloud",
      founding: false,
    });
    void resend.emails
      .send({
        from: env.RESEND_FROM_EMAIL ?? "hello@skerry.cloud",
        to: input.email,
        replyTo: env.RESEND_REPLY_TO ?? "hello@skerry.cloud",
        subject,
        html,
        text,
      })
      .catch((err) => console.error("resend send failed", err));
  }

  return json(200, {
    ok: true,
    position: inserted.position,
    alreadyOnList: false,
  });
};
