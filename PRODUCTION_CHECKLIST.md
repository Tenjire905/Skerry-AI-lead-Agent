# Production Go-Live Checklist

> Status legend: ✅ implemented · ⚠️ partial / operator-action required · ❌ not yet
>
> Last reviewed: 2026-05-09. Re-review every release; auditors expect a dated entry.

---

## GL — Enterprise Go-Live

| #     | Item                                                  | Status | Where / what to verify                                                                                                                                                                                                                                                  |
| ----- | ----------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GL.1  | Zod validation on all critical endpoints              | ✅     | [`server/index.ts:798–836`](server/index.ts) — login, generate-leads, generate-email, send, verify, entitlements/start all `safeParse` body                                                                                                                             |
| GL.2  | Unified error contract on 100% of routes              | ⚠️     | All `/api/*` returns `{ok:false, error}` on failure; spot-checked. Add a centralized `errors.ts` helper in next pass and a lint rule                                                                                                                                    |
| GL.3  | Workspace-based rate limiting (Upstash Redis)         | ❌     | Currently in-memory `express-rate-limit` (won't survive horizontal scale). **TODO**: swap to `@upstash/ratelimit` keyed by `userId+route`                                                                                                                               |
| GL.4  | Sentry stable on server + client (with PII scrubbing) | ⚠️     | Server-side wrapper ([`server/observability.ts`](server/observability.ts)) is no-op until `SENTRY_DSN` set + `pnpm add @sentry/node`. PII scrubbing via [`server/redact.ts`](server/redact.ts) is applied in `beforeSend`. Client-side wiring still **TODO**            |
| GL.5  | Circuit breaker + retry for external providers        | ✅     | Retry+timeout in [`server/index.ts`](server/index.ts) wrapped in [`withBreaker`](server/circuitBreaker.ts) per provider (failure threshold 5 / 60 s window / 30 s cooldown). Tested in [`server/circuitBreaker.test.ts`](server/circuitBreaker.test.ts)                 |
| GL.6  | E2E test of critical path green in CI                 | ✅     | [`tests/e2e/lead-flow.spec.ts`](tests/e2e/lead-flow.spec.ts) — login → leads → edit → push. Hermetic via Playwright `page.route` mocks. Wired in `.github/workflows/ci.yml`                                                                                             |
| GL.7  | Daily backup + restore test documented                | ⚠️     | Backup script + GH Action ✅ ([`scripts/backup.sh`](scripts/backup.sh), [`.github/workflows/backup.yml`](.github/workflows/backup.yml)). Restore runbook ✅ ([`runbooks/restore.md`](runbooks/restore.md)). **First live drill not yet run** — Section 9 of the runbook |
| GL.8  | `ALLOW_DEMO_AUTH=false` in prod                       | ✅     | Boot fails if `true` ([`server/productionConfig.ts:14`](server/productionConfig.ts))                                                                                                                                                                                    |
| GL.9  | `SESSION_SECRET` ≥32 chars, not in code               | ✅     | Boot fails if missing/short ([`server/index.ts:688`](server/index.ts))                                                                                                                                                                                                  |
| GL.10 | HTTPS + HSTS active                                   | ⚠️     | App emits HSTS header in prod ([`server/index.ts:704`](server/index.ts)). **Operator action**: terminate TLS at the edge, enable HSTS preload at the CDN/load balancer                                                                                                  |
| GL.11 | API keys in secrets manager, not `.env` on server     | ⚠️     | App reads from `process.env` so the substrate is irrelevant; **operator action** to wire Fly secrets / AWS Secrets Manager / Doppler / 1Password Connect — never SCP a `.env`                                                                                           |
| GL.12 | On-call process defined                               | ⚠️     | See [`runbooks/on-call.md`](runbooks/on-call.md) — single-operator skeleton; assign primary contact and paste schedule URL                                                                                                                                              |

## SEC — Security Baseline

| #     | Item                                      | Status | Where / what to verify                                                                                                                                                                                                                                     |
| ----- | ----------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SEC.1 | CSRF tokens on state-changing requests    | ✅     | Double-submit cookie + `X-CSRF-Token` header enforced on all `POST/PUT/PATCH/DELETE /api/*` except `/api/auth/login` and `/api/auth/csrf` ([`server/index.ts:780`](server/index.ts))                                                                       |
| SEC.2 | Helmet w/ CSP + HSTS + X-Frame-Options    | ✅     | HSTS, `X-Frame-Options: DENY`, COOP=`same-origin`, CORP=`same-site`, strict-origin-when-cross-origin referrer all on in prod. Strict CSP enabled in prod (`default-src 'self'`, no inline scripts) — see [`server/index.ts`](server/index.ts) helmet block |
| SEC.3 | No raw SQL queries (Supabase client only) | ⚠️     | **Doc drift** — this app uses `pg` directly, not Supabase. Queries are parameterized (`$1`, `$2`) so SQLi-safe. If the contract is "no string-concatenated SQL", that holds; if it is literally "Supabase client", we need to revisit the architecture     |
| SEC.4 | Login rate limiting (5/15min per email)   | ✅     | 8 attempts / 15 min via `authLimiter` ([`server/index.ts:723`](server/index.ts)). Slightly above the SEC target of 5; tune `LOGIN_MAX_ATTEMPTS` if stricter is required                                                                                    |
| SEC.5 | No logging of passwords, tokens, or PII   | ✅     | `logEvent` runs all payloads through [`redact()`](server/redact.ts) (deny-list of secret keys + secret-pattern scrubbing for inline strings + email masking + 8 KiB cap). Tested in [`server/redact.test.ts`](server/redact.test.ts)                       |

## EPIC 7 — Backup & Disaster Recovery

| #   | Item                          | Status                                                                                                                                   |
| --- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1 | Daily backup script + Action  | ✅ [`scripts/backup.sh`](scripts/backup.sh) + [`.github/workflows/backup.yml`](.github/workflows/backup.yml) (03:00 UTC)                 |
| 7.2 | Restore runbook + first drill | ⚠️ Runbook ✅ [`runbooks/restore.md`](runbooks/restore.md). **First drill not yet run** — operator must execute Section 9 and record RTO |

## EPIC 8 — Documentation & Compliance

| #   | Item                                     | Status                                                                                                            |
| --- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 8.1 | Doc-drift fixed (README, this checklist) | ✅ Both files (re)written from scratch — no `supabase/migrations/` references                                     |
| 8.2 | OpenAPI spec at `/api/docs`              | ✅ Served from [`server/openapi.ts`](server/openapi.ts) (Swagger UI at `/api/docs`, raw JSON at `/api/docs.json`) |
| 8.3 | `SECURITY.md` + responsible disclosure   | ✅ [`SECURITY.md`](SECURITY.md)                                                                                   |
| 8.4 | DPA + Subprocessors list                 | ✅ [`docs/DPA-Subprocessors.md`](docs/DPA-Subprocessors.md)                                                       |
| 8.5 | SOC 2 controls inventory (CC1–CC9)       | ⚠️ Skeleton in [`docs/SOC2-Controls.md`](docs/SOC2-Controls.md). Evidence collection ongoing                      |

---

## Operator action items before flipping prod traffic

1. Generate `SESSION_SECRET` (`openssl rand -base64 48`) and put in secrets manager.
2. Set `SKERRY_ALLOWED_ORIGINS` to your real public origin(s).
3. Set `ALLOW_DEMO_AUTH=false` (or unset).
4. Provision the Postgres DB; set `DATABASE_URL`. Verify `/api/ready` passes.
5. Configure CI secrets for the backup workflow (`BACKUP_*`, see `env.example`).
6. Run the **first restore drill** (`runbooks/restore.md` §9) and record RTO.
7. Set up a Sentry project; add DSN to env. Wire PII scrubbing per GL.4 TODO.
8. Provision Upstash Redis; swap rate-limit to workspace-keyed (GL.3 TODO).
9. Enable HSTS preload at the edge.
10. Define on-call (`runbooks/on-call.md`) — even a single name + phone is fine.
