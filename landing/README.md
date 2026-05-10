# Skerry Landing — `skerry.cloud`

Standalone Astro site for the public waitlist + €19 founding-deposit funnel.
Lives in this monorepo under `landing/` for now; can be split into its own
repo any time with `git subtree split --prefix=landing -b skerry-landing`.

**Stack**
- Astro 5 + React (client islands only) + Tailwind 3
- Cloudflare Pages (`@astrojs/cloudflare` adapter, server-rendered)
- Supabase Postgres (`waitlist` table, service-role from server)
- Resend (confirmation email)
- Stripe Checkout (one-time €19 founding deposit)

---

## Local dev

```bash
cd landing
cp env.example .env
# fill in non-secret values; for secrets, use a test Stripe key + a personal
# Supabase project + a Resend test key.
pnpm install
pnpm dev      # http://localhost:4321
```

To exercise the Stripe flow locally:
```bash
stripe listen --forward-to localhost:4321/api/stripe-webhook
# copy the printed whsec_… into STRIPE_WEBHOOK_SECRET in your local .env
```

## Deploy — Cloudflare Pages

### One-time setup

1. **Create the Supabase table.** From the Supabase SQL editor (or
   `supabase db push` against the project), run:
   ```
   landing/supabase/migrations/0001_waitlist.sql
   ```
2. **Create the Stripe price.**
   - Stripe Dashboard → Products → "Skerry Founding Deposit" → one-time, €19.
   - Copy the price ID into `STRIPE_FOUNDING_PRICE_ID`.
3. **Create the Cloudflare Pages project.**
   - Dashboard → Workers & Pages → Create → Pages → Connect to Git →
     this repo, branch `main` (or whatever you ship from), build command
     `pnpm --filter skerry-landing build`, output dir `landing/dist`,
     root dir `/` (build runs from repo root so pnpm finds the workspace).
   - **Or** if you split into a separate repo: build command `pnpm build`,
     output dir `dist`, root dir `/`.
4. **Add environment variables** (Pages → Settings → Environment Variables —
   set in *both* Preview and Production):
   - `PUBLIC_SITE_URL` = `https://skerry.cloud`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` *(secret)*
   - `RESEND_API_KEY` *(secret)*
   - `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`
   - `STRIPE_SECRET_KEY` *(secret — use sk_test_ in Preview, sk_live_ in Production)*
   - `STRIPE_WEBHOOK_SECRET` *(secret — different per environment)*
   - `STRIPE_FOUNDING_PRICE_ID`
5. **Bind the custom domain.** Pages → Custom domains → add `skerry.cloud`
   and `www.skerry.cloud`. Cloudflare auto-issues TLS.
6. **Configure the Stripe webhook.**
   - Stripe Dashboard → Developers → Webhooks → Add endpoint.
   - URL: `https://skerry.cloud/api/stripe-webhook`
   - Events: `checkout.session.completed`, `charge.refunded`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET` for Production.
7. **Verify the Resend sender domain.** `hello@skerry.cloud` must come from a
   domain you've authenticated in Resend (SPF + DKIM + DMARC). Until then,
   confirmation emails will silently no-op.

### DNS (Cloudflare)

If `skerry.cloud` is registered with Cloudflare Registrar (most likely since
you picked a `.cloud` TLD), Pages will auto-create the right `CNAME` /
proxied A records. Just confirm:

| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `@` (or `skerry.cloud`) | `skerry-landing.pages.dev` | Proxied |
| CNAME | `www` | `skerry.cloud` | Proxied |
| TXT | `_resend.` (per Resend instructions) | … | DNS-only |
| TXT | DKIM (per Resend) | … | DNS-only |

## After deploy — verification checklist

- [ ] `https://skerry.cloud` loads, hero + form visible, CSS applied.
- [ ] Submit a real email → row appears in `waitlist` table.
- [ ] Confirmation email arrives within 30s.
- [ ] `/founding` checkout button → Stripe-hosted Checkout opens.
- [ ] Test-card `4242 4242 4242 4242` → `/thank-you` → row's `deposited` flips
      to `true`, founding email arrives.
- [ ] Run a Stripe refund on the test charge → row's `deposited` flips back.
- [ ] `https://skerry.cloud/api/waitlist` POST without honeypot returns 400 on
      empty body, 200 on valid email.
- [ ] Cloudflare Web Analytics or Plausible recording pageviews.

## Operator runbook (recurring)

- **Daily**: glance at Supabase `waitlist` table — total signups + deposits.
- **Weekly**: pull a CSV (`select email, position, deposited, created_at from
  waitlist order by created_at desc`) and add to the launch dashboard.
- **At launch**: export deposited customers → grant beta access → apply 50%
  credit to first invoice in your billing system → send "you're in" email.

## When to split into its own repo

- Marketing wants direct push access without seeing app code.
- The landing CI starts blocking app deploys (or vice-versa).
- You're hiring a designer / agency that should not see the app source.

```
git subtree split --prefix=landing -b skerry-landing
gh repo create Tenjire905/skerry-landing --private --source=. --push
```
