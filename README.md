# Skerry — Lead-Gen OS

Asset-based cold-outreach platform. Find the right leads, generate the right
insight, send the right email — observed end-to-end.

> Single source of truth for product/business intent: [`PROJECT_BRAIN.md`](PROJECT_BRAIN.md).
> This README covers engineering: how to run, test, and ship.

---

## Stack

- **Frontend**: React 19 + Vite 7 + TanStack Router + Zustand + Tailwind
- **Backend**: Node 20 + Express 4, single bundled binary (`dist/index.js`)
- **DB**: Postgres 16 (any provider — Supabase, Fly Postgres, RDS, Neon)
- **Auth**: HMAC-SHA256 session cookies (HttpOnly, SameSite=Lax)
- **External providers**: OpenAI, Apollo (via Apify), NeverBounce, Resend
- **Tests**: Vitest (server + client), Playwright (E2E with API mocks)

---

## Quickstart

```bash
pnpm install
cp env.example .env
# Fill in SESSION_SECRET (>=32 chars). For local dev, ALLOW_DEMO_AUTH=true.
pnpm dev          # Vite on :3000, server on :3001 (start separately if needed)
```

Demo accounts (only when `ALLOW_DEMO_AUTH=true`, never in prod):
`solo@skerry.io / solo123`, `team@skerry.io / team123`,
`agency@skerry.io / agency123`, `dev@skerry.io / skerry-dev-2024`.

---

## Scripts

| Command                             | What it does                                                     |
| ----------------------------------- | ---------------------------------------------------------------- |
| `pnpm dev`                          | Vite dev server (frontend) on `:3000`                            |
| `pnpm build`                        | Build frontend + bundle server with esbuild → `dist/`            |
| `pnpm start`                        | Run production bundle (`NODE_ENV=production node dist/index.js`) |
| `pnpm check`                        | TypeScript no-emit check                                         |
| `pnpm format` / `pnpm format:check` | Prettier                                                         |
| `pnpm test:server`                  | Vitest — server integration tests (`server/*.test.ts`)           |
| `pnpm test:client`                  | Vitest — client unit tests (`client/src/**/*.test.tsx`)          |
| `pnpm test`                         | Run server + client unit tests in sequence                       |
| `pnpm test:e2e`                     | Playwright — full lead flow with API mocks                       |

CI (`.github/workflows/ci.yml`) runs all of these on every push.

---

## Configuration

All runtime config is via env vars. Canonical list lives in [`env.example`](env.example).

| Var                                       | Required in prod?       | Notes                                  |
| ----------------------------------------- | ----------------------- | -------------------------------------- |
| `NODE_ENV`                                | yes                     | `production` triggers fail-fast guards |
| `SESSION_SECRET`                          | yes                     | ≥32 chars; rejects shorter at boot     |
| `ALLOW_DEMO_AUTH`                         | must be **unset/false** | prod boot fails if `true`              |
| `SKERRY_ALLOWED_ORIGINS`                  | yes                     | comma-separated; CORS allowlist        |
| `DATABASE_URL`                            | yes                     | Postgres; entitlements + usage         |
| `DATABASE_SSL_REJECT_UNAUTHORIZED`        | optional                | only set `false` if provider needs it  |
| `OPENAI_API_KEY`                          | yes                     | lead/email generation                  |
| `RESEND_API_KEY`                          | yes                     | email send                             |
| `NEVERBOUNCE_API_KEY`                     | recommended             | email validation                       |
| `APIFY_API_KEY`                           | recommended             | Apollo lead enrichment                 |
| `SKERRY_FROM_EMAIL`                       | yes                     | `Name <addr>` format                   |
| `PROVIDER_TIMEOUT_MS`, `PROVIDER_RETRIES` | optional                | default 12000 / 2                      |

The app **never** stores customer-supplied API keys. See `PROJECT_BRAIN.md §2`.

---

## Database

There are no schema migration files in this repo today; the entitlements table
is created at boot by [`server/entitlements.ts`](server/entitlements.ts). When
schema migrations land, they will live under `server/db/migrations/` and run
via `pnpm migrate` before app start.

> **Doc-drift note for future readers**: there is **no** `supabase/migrations/`
> tree in this codebase. A sibling backup folder `Skerry AI Agent/` contains
> an older Supabase-based variant; ignore it for this app.

---

## Production deploy

Hard requirements (enforced at boot — see [`server/productionConfig.ts`](server/productionConfig.ts)):

1. `SESSION_SECRET` set, length ≥32.
2. `ALLOW_DEMO_AUTH` is **not** `true`.
3. `SKERRY_ALLOWED_ORIGINS` non-empty.

Recommended infrastructure:

- TLS-terminating proxy in front of the app (Cloudflare / Fly / Render /
  CloudFront). HSTS headers are emitted by the app when `NODE_ENV=production`
  (`max-age=31536000; includeSubDomains`); enable HSTS preload at the edge.
- Daily DB backup → off-site bucket via `scripts/backup.sh`
  (workflow: `.github/workflows/backup.yml`). Restore: `runbooks/restore.md`.
- Secrets in a real secret manager (Fly secrets / AWS Secrets Manager / Doppler
  / 1Password Connect) — not in `.env` files on the server.

Full go-live checklist: [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md).

---

## Security

- Sessions: HMAC-signed, HttpOnly, SameSite=Lax, 7-day TTL.
- CSRF: double-submit cookie + `X-CSRF-Token` header on all state-changing
  routes.
- Rate limiting: 180 req/min global, 8 logins / 15 min, 24 LLM calls / min.
- Helmet enabled; HSTS in production. **CSP currently disabled** — see
  [`PRODUCTION_CHECKLIST.md`](PRODUCTION_CHECKLIST.md) SEC.2 for the open work.
- Vulnerability disclosure: [`SECURITY.md`](SECURITY.md).

---

## Repository layout

```
client/src/                React app (Vite root: client/)
  components/nexus/        Feature components (LeadCard, ForgeEmailEditor, …)
  routes/                  TanStack file-based routes
  store/                   Zustand stores
  lib/                     API client, i18n
  test/                    Vitest setup + factories
server/                    Express app (single bundle entry: server/index.ts)
  *.test.ts                Vitest server tests
  productionConfig.ts      NODE_ENV=production guards
shared/                    Code reused on both sides
tests/e2e/                 Playwright tests with API mocks
scripts/                   Ops scripts (backup, …)
runbooks/                  Operational runbooks (restore, …)
docs/                      Compliance + architecture docs
```
