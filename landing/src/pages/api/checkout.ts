import type { APIRoute } from "astro";
import { checkoutSchema } from "@/lib/validation";
import { getSupabase } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
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
  const site = env.PUBLIC_SITE_URL ?? "https://skerry.cloud";

  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_FOUNDING_PRICE_ID) {
    return json(503, {
      ok: false,
      message: "Founding checkout isn't live yet — check back shortly.",
    });
  }

  const ip = clientIp(request);
  const rl = checkRateLimit(`checkout:${ip}`, 5, 10 * 60_000);
  if (!rl.allowed) {
    return json(429, { ok: false, message: "Too many tries. Wait a moment." });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json(400, { ok: false, message: "Invalid JSON body." });
  }

  const parsed = checkoutSchema.safeParse(payload);
  if (!parsed.success) {
    return json(400, {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    });
  }

  // Make sure the email is on the waitlist before charging — keeps Stripe
  // customer records aligned with our DB and lets us short-circuit duplicate
  // founding charges.
  const supabase = getSupabase(env);
  let { data: row } = await supabase
    .from("waitlist")
    .select("id, position, deposited, stripe_customer_id")
    .eq("email_lower", parsed.data.email)
    .maybeSingle();

  if (!row) {
    const { data: inserted, error } = await supabase
      .from("waitlist")
      .insert({ email: parsed.data.email })
      .select("id, position, deposited, stripe_customer_id")
      .single();
    if (error || !inserted) {
      console.error("waitlist insert (from checkout) failed", error);
      return json(500, { ok: false, message: "Couldn't initialise checkout." });
    }
    row = inserted;
  }

  if (row.deposited) {
    return json(409, {
      ok: false,
      message: "This email already has a founding spot.",
    });
  }

  const stripe = getStripe(env);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: row.stripe_customer_id ? undefined : parsed.data.email,
      customer: row.stripe_customer_id ?? undefined,
      line_items: [{ price: env.STRIPE_FOUNDING_PRICE_ID, quantity: 1 }],
      metadata: {
        waitlist_id: row.id,
        email: parsed.data.email,
      },
      success_url: `${site}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/founding?email=${encodeURIComponent(parsed.data.email)}`,
      allow_promotion_codes: false,
      billing_address_collection: "auto",
    });

    if (session.url) {
      await supabase
        .from("waitlist")
        .update({ stripe_session_id: session.id })
        .eq("id", row.id);
    }

    return json(200, { ok: true, url: session.url });
  } catch (err) {
    console.error("stripe checkout create failed", err);
    return json(500, {
      ok: false,
      message: "Stripe couldn't start checkout. Try again in a minute.",
    });
  }
};
