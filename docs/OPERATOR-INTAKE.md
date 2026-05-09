# Operator Intake — Skerry Production

> **Purpose**: single sheet for you to fill in real values + decisions.
> Once filled, hand it back and I will wire each row into the right config /
> code / runbook and unblock the corresponding `⚠️` items in
> [`PRODUCTION_CHECKLIST.md`](../PRODUCTION_CHECKLIST.md).
>
> **Do not commit secret values to the repo.** This file lives in the repo as
> a *form*; replace `<…>` placeholders only on a copy you keep in
> 1Password / your password manager. For each secret I just need a
> confirmation ("set in Fly secrets as X") — not the value.
>
> Status legend per row: `❓ need info` · `✅ I have set this` · `⏸ skip / N/A`.

---

## 1 · Identity & ownership

| Key | Value | Status |
|---|---|---|
| Production domain (apex) | `<e.g. app.skerry.io>` | ❓ |
| Public marketing site (if separate) | `<…>` | ❓ |
| Org legal name (for DPA / SECURITY.md) | `<…>` | ❓ |
| Primary on-call name + phone + Slack handle | `<…>` | ❓ |
| Backup on-call (or "none yet — single operator") | `<…>` | ❓ |
| Security contact email (used in `SECURITY.md`, currently `security@skerry.io`) | `<…>` | ❓ |
| Engineering contact email (currently `engineering@skerry.io`) | `<…>` | ❓ |
| Legal / DPO contact email (currently `legal@skerry.io`) | `<…>` | ❓ |

## 2 · Hosting & infra decisions

| Key | Value | Status |
|---|---|---|
| App host (Fly.io / Render / Railway / k8s / VPS) | `<…>` | ❓ |
| App regions (e.g. `fra` + `iad`) | `<…>` | ❓ |
| TLS termination (Cloudflare / Fly Anycast / load balancer) | `<…>` | ❓ |
| HSTS preload enabled at the edge? | `yes / no` | ❓ |
| Postgres provider (Supabase / Fly Postgres / Neon / RDS) | `<…>` | ❓ |
| Postgres region (must align with app for latency) | `<…>` | ❓ |
| Backup object store (Cloudflare R2 / AWS S3 / Backblaze B2) | `<…>` | ❓ |
| Backup bucket name | `<…>` | ❓ |
| Secrets manager (Fly secrets / AWS SM / Doppler / 1Password Connect) | `<…>` | ❓ |
| CI/CD platform (GitHub Actions only, or also Fly deploy / etc.) | `<…>` | ❓ |
| Pager service (PagerDuty / OpsGenie / Better Stack / phone only) | `<…>` | ❓ |

## 3 · Subscription decisions

| Key | Value | Status |
|---|---|---|
| Tiers shipping at launch (Solo / Team / Agency) | `<…>` | ❓ |
| Monthly run limits per tier (override defaults?) | `<…>` | ❓ |
| Billing provider (Stripe / Lemon Squeezy / Paddle) — optional v1 | `<…>` | ❓ |

## 4 · Required env vars

> **For each row**: tell me whether you've put it into the secrets manager.
> Don't paste the value here.

### App runtime

| Var | Required | Confirm set? |
|---|---|---|
| `NODE_ENV=production` | yes | ❓ |
| `SESSION_SECRET` (≥32 chars, `openssl rand -base64 48`) | yes | ❓ |
| `ALLOW_DEMO_AUTH` (must be unset or `false`) | yes | ❓ |
| `SKERRY_ALLOWED_ORIGINS` (comma-sep prod origins) | yes | ❓ |
| `DATABASE_URL` (with `sslmode=require`) | yes | ❓ |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | optional | ❓ |
| `OPENAI_API_KEY` | yes | ❓ |
| `OPENAI_MODEL` (override of `gpt-4.1-mini`?) | optional | ❓ |
| `RESEND_API_KEY` | yes | ❓ |
| `SKERRY_FROM_EMAIL` (verified Resend sender) | yes | ❓ |
| `NEVERBOUNCE_API_KEY` | recommended | ❓ |
| `APIFY_API_KEY` | recommended | ❓ |
| `PROVIDER_TIMEOUT_MS` / `PROVIDER_RETRIES` | optional | ❓ |
| `SENTRY_DSN` (server) | recommended | ❓ |
| `SENTRY_TRACES_SAMPLE_RATE` (default 0.0, suggest 0.05 in prod) | optional | ❓ |
| `GIT_SHA` (for Sentry release tagging) | optional | ❓ |

### Backup CI workflow (GitHub Actions secrets only — never on app server)

| Var | Required | Confirm set? |
|---|---|---|
| `BACKUP_DATABASE_URL` (read-only role) | yes | ❓ |
| `BACKUP_BUCKET` (e.g. `s3://skerry-backups/prod`) | yes | ❓ |
| `BACKUP_ENCRYPTION_KEY` (≥32 chars, generated independently of session secret) | yes | ❓ |
| `BACKUP_AWS_ACCESS_KEY_ID` | yes | ❓ |
| `BACKUP_AWS_SECRET_ACCESS_KEY` | yes | ❓ |
| `BACKUP_AWS_REGION` (`auto` for R2) | yes | ❓ |
| `BACKUP_AWS_ENDPOINT_URL_S3` (R2 only) | conditional | ❓ |
| `BACKUP_RETENTION_DAYS` (default 30) | optional | ❓ |
| `OPS_SLACK_WEBHOOK_URL` (failure alerts) | optional | ❓ |

## 5 · Subprocessor confirmation

For each, I need: **(a) which one you actually use, (b) DPA on file? (yes/no), (c) data residency**. Update `docs/DPA-Subprocessors.md` from this once filled.

| Subprocessor | Using? (yes/no) | DPA signed? | Region |
|---|---|---|---|
| Supabase / Fly Postgres / Neon / RDS — *which?* | `<…>` | ❓ | `<…>` |
| OpenAI | `<…>` | ❓ | `<…>` |
| Apify (→ Apollo) | `<…>` | ❓ | `<…>` |
| NeverBounce | `<…>` | ❓ | `<…>` |
| Resend | `<…>` | ❓ | `<…>` |
| Sentry (if used) | `<…>` | ❓ | `<…>` |
| Cloudflare (if used for TLS / R2) | `<…>` | ❓ | `<…>` |
| GitHub | `<…>` | ❓ | `<…>` |
| Stripe / Lemon Squeezy / Paddle (billing) | `<…>` | ❓ | `<…>` |
| Other (list any I missed) | `<…>` | ❓ | `<…>` |

## 6 · Open architecture decisions

These were flagged ⚠️ in the checklist; pick a direction so I can implement.

| Decision | Options | Your call | Notes |
|---|---|---|---|
| **SEC.3** — DB access pattern | (a) keep `pg` direct + parameterized (current); (b) switch to Supabase JS client; (c) switch to a query builder (Drizzle / Kysely) | `<…>` | `(a)` is fine for SOC 2 if "no string-concat SQL" is the actual control; `(b)` only makes sense if you also adopt Supabase Auth/Storage |
| **GL.3** — Rate limiting backend | (a) keep in-memory (fine for 1 instance); (b) Upstash Redis when scaling horizontally | `<…>` | Pick `(b)` only when going multi-instance |
| **GL.2** — Centralized error contract helper | (a) add `server/errors.ts` with `apiError(code, msg, status)` + lint rule; (b) leave as is | `<…>` | I recommend `(a)` — small lift, big consistency win |
| Login attempts threshold | Currently 8 / 15 min. SEC target = 5. Lower? | `5 / 8 / other` | ❓ |
| Email send dry-run guard | Always send when `RESEND_API_KEY` present, or require `SEND_EMAIL_LIVE=true` for safety in staging? | `<…>` | I recommend a `SEND_EMAIL_LIVE` flag |
| Production Postgres SSL mode | `require` / `verify-ca` / `verify-full` | `<…>` | `verify-full` is auditor-pleasing |
| Auth — SSO planned? | Clerk / WorkOS / Auth0 / build-our-own / not yet | `<…>` | Affects CC6.1 evidence |
| Multi-tenancy boundary | one app many customers (RLS or app-level filter?), or one DB per customer? | `<…>` | Affects schema + rate-limit keying |

## 7 · Compliance / legal touchpoints

| Item | Value | Status |
|---|---|---|
| Privacy policy URL | `<…>` | ❓ |
| Terms of service URL | `<…>` | ❓ |
| DPA template URL (the one you sign with customers) | `<…>` | ❓ |
| Status page URL (for `runbooks/on-call.md`) | `<…>` | ❓ |
| GRC tool — Vanta / Drata / none? | `<…>` | ❓ |
| Pen-test scheduled? when? | `<…>` | ❓ |
| Data-residency commitment for EU customers (EU-only? best-effort?) | `<…>` | ❓ |

## 8 · First restore drill (GL.7)

Once you've run the drill per `runbooks/restore.md` §9, paste:

| Field | Value |
|---|---|
| Drill date (UTC) | `<…>` |
| Operator | `<…>` |
| Backup object key used | `<…>` |
| Plain dump size | `<…>` |
| Download time | `<…>` |
| Decrypt time | `<…>` |
| `pg_restore` time | `<…>` |
| Smoke checks (pass/fail) | `<…>` |
| **Total RTO measured** | `<…>` |
| Notes | `<…>` |

I will then append it to `runbooks/restore.md` §8 + `docs/SOC2-Controls.md` CC7.5.

---

## How to use this document

1. Fill in `<…>` placeholders **for non-secret rows**; for secrets, just flip
   the status to ✅ when set in your secrets manager.
2. Save. Tell me "intake updated" — I'll diff-review the file and:
   - Update `SECURITY.md`, `docs/DPA-Subprocessors.md`,
     `runbooks/on-call.md`, `runbooks/restore.md`, `README.md`,
     `PRODUCTION_CHECKLIST.md` with the real values.
   - Implement the architecture decisions you picked in §6.
   - Flip the corresponding rows in `PRODUCTION_CHECKLIST.md` from ⚠️ to ✅.
3. Repeat in passes — you don't need to fill everything in one go.

---

_Last reset: 2026-05-09._
