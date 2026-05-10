import type { APIRoute } from "astro";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getSupabase } from "@/lib/supabase";
import { getResend, renderConfirmationEmail } from "@/lib/resend";

export const prerender = false;

/**
 * Stripe webhook handler.
 *
 *   Stripe Dashboard → Developers → Webhooks → Add endpoint
 *     URL: https://skerry.cloud/api/stripe-webhook
 *     Events: checkout.session.completed, charge.refunded
 *
 * The endpoint MUST verify the signature using the raw request body — never
 * trust the parsed JSON. Missing or invalid signature = 400.
 */
export const POST: APIRoute = async ({ request }) => {
  const env = import.meta.env;
  const sig = request.headers.get("stripe-signature");
  if (!sig || !env.STRIPE_WEBHOOK_SECRET || !env.STRIPE_SECRET_KEY) {
    return new Response("missing signature or config", { status: 400 });
  }

  const raw = await request.text();
  const stripe = getStripe(env);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      raw,
      sig,
      env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("stripe webhook signature verification failed", err);
    return new Response("invalid signature", { status: 400 });
  }

  const supabase = getSupabase(env);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const waitlistId = session.metadata?.waitlist_id;
    const email = session.metadata?.email ?? session.customer_email;
    if (!waitlistId) {
      console.error("checkout.session.completed without waitlist_id", session.id);
      return new Response("ok", { status: 200 });
    }

    const { data: row, error } = await supabase
      .from("waitlist")
      .update({
        deposited: true,
        deposit_amount_cents: session.amount_total ?? null,
        deposit_paid_at: new Date().toISOString(),
        stripe_customer_id:
          (typeof session.customer === "string" ? session.customer : null) ??
          null,
        stripe_session_id: session.id,
      })
      .eq("id", waitlistId)
      .select("position, email")
      .single();

    if (error || !row) {
      console.error("waitlist update on session.completed failed", error);
      return new Response("db error", { status: 500 });
    }

    const recipient = email ?? row.email;
    const resend = getResend(env);
    if (resend && recipient) {
      const { subject, html, text } = renderConfirmationEmail({
        email: recipient,
        position: row.position,
        siteUrl: env.PUBLIC_SITE_URL ?? "https://skerry.cloud",
        founding: true,
      });
      void resend.emails
        .send({
          from: env.RESEND_FROM_EMAIL ?? "hello@skerry.cloud",
          to: recipient,
          replyTo: env.RESEND_REPLY_TO ?? "hello@skerry.cloud",
          subject,
          html,
          text,
        })
        .catch((err) => console.error("founding confirm email failed", err));
    }
    return new Response("ok", { status: 200 });
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const customer =
      typeof charge.customer === "string" ? charge.customer : null;
    if (!customer) return new Response("ok", { status: 200 });

    await supabase
      .from("waitlist")
      .update({
        deposited: false,
        deposit_paid_at: null,
      })
      .eq("stripe_customer_id", customer);
    return new Response("ok", { status: 200 });
  }

  // Acknowledge unhandled event types so Stripe doesn't retry forever.
  return new Response("ignored", { status: 200 });
};
