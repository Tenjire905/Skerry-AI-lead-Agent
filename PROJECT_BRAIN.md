# Skerry — Project Brain

**Living document. Single source of truth for every product, business, and engineering decision.**
Update this file before code whenever a new direction is chosen. Code is implementation; this file is intent.

Last updated: 2026-05-04

---

## 1 · Identity

- **Product name:** Skerry (SKEH-ree). Norse for a small rocky islet that
  sailors used as a navigation marker — a small visible signal in a vast ocean.
  Metaphor: in a sea of prospects, surface the few that matter.
- **One-liner:** Asset-based cold outreach OS. Find the right leads, generate
  the right insight, send the right email — observed end-to-end.
- **Naming clearance:** No competing brand exists in B2B sales / lead-gen /
  outreach AI. Veyra, Cairn, Praxa, Sextant, Lodestar, Halix were all checked
  and discarded for conflicts.

## 2 · Business Model — Customer-pays-subscription, provider-pays-API

This is the load-bearing decision. Every UX choice follows from it.

- Customers buy a tier (Solo / Team / Agency). The subscription covers their
  monthly lead generation, AI analysis, email sending volume, and email
  verification.
- **Skerry pays the underlying API bills** (OpenAI, Apify, NeverBounce,
  Resend/Instantly) out of subscription revenue.
- **Implication:** customers MUST NEVER see, manage, or input API keys.
  Settings has language + plan + onboarding reset only — no "Bring your own key".
- **Implication:** keys live in `.env` (developer-controlled). Only `developer`
  role users can see/configure them in-app.
- **Margin:** subscription revenue minus API spend per tier = unit economic.
  Tiers are designed so heavy users hit the monthly cap before API bill exceeds
  subscription.

## 3 · Tiers

| Tier   | Monthly limit | Leads per run | Research depth                                     |
| ------ | ------------- | ------------- | -------------------------------------------------- |
| Solo   | 50            | 5             | Keyword search + email validation                  |
| Team   | 250           | 20            | + website analysis + LinkedIn enrichment           |
| Agency | 1000          | 50            | + deep-crawl + intent signals + AI scoring + dedup |

These caps gate API spend. Don't hand out unlimited runs.

## 4 · Architecture

```
client/  Vite + React 19 + TanStack Router (client-only SPA)
  routes/        __root, index (Pulse), clients, icp, assets, workspace, suppression, analytics, forge, insight, settings
  components/
    nexus/       LoginPage, Onboarding, FindLeadsModal, Shell, AppSidebar, StepProgress
    ui/          shadcn primitives
  store/         leadStore, workspaceStore, suppressionStore, researchStore, authStore, accountTierStore, usageStore (zustand + persist)
  lib/           apiConfig, leadSynthesizer, skerryApi, i18n, utils
  data/          mockLeads.ts (DEPRECATED — kept for ref only, never imported by UI)
shared/          shared constants
server/          Express scaffolding for future API proxy (production keys)
```

### Routing

- `/` — Pulse dashboard: stats + live feed + system health
- `/workspace` — Lead pipeline: per-lead intelligence + email forge
- `/forge` — Email composition + Instantly dispatch
- `/insight` — Per-lead deep AI intelligence (Site / Bio / Strategy tabs)
- `/settings` — Language, plan, onboarding reset (NO API keys for end users)

### Stores

- **`useLeadStore`** — single source of truth for leads. **Initial state: empty
  array.** Leads added only via `addLeads()`. Dashboard, workspace, forge,
  insight all derive from this store. `mockLeads` data is NEVER loaded.
- **`useResearchStore`** — research run state (steps, status, count).
  `usedThisMonth` starts at 0. Resets on modal close.
- **`useAuthStore`** — auth + user role. Demo accounts for solo/team/agency
  - developer role with elevated access. **No `apiKeys` here** (moved to
    env). API key surface is developer-only.
- **`useAccountTierStore`** — current tier (Solo/Team/Agency).
- **`useLanguageStore`** — UI language (en/de).

### API key handling

- Source of truth for provider keys is server env (e.g. `OPENAI_API_KEY`,
  `RESEND_API_KEY`, `NEVERBOUNCE_API_KEY`).
- Client must call authenticated server endpoints for AI + send/verify flows.
- Do not introduce new browser-side provider calls.

## 5 · Invariants — DO NOT VIOLATE

1. **Zero stats at zero leads.** Dashboard counters MUST start at 0 and grow
   only when real leads exist in `useLeadStore`. No hardcoded vanity numbers.
2. **Single source of truth.** Lead data — anywhere — comes from `useLeadStore`.
   `mockLeads` (in `data/mockLeads.ts`) is reference-only and never imported by routes.
3. **Customers don't see API keys.** Settings = language + plan + onboarding.
   Only developer role sees a (read-only) keys panel.
4. **Empty states are first-class.** Every screen handles "0 leads" gracefully
   with a clear CTA pointing at "Find New Leads".
5. **`shellComponent` is forbidden in `__root.tsx`.** Client-only SPA — `<html>`
   inside `<div id="root">` causes React to bail out the entire tree.
6. **No Manus runtime plugins.** They inject global event listeners that hijack
   clicks outside the Manus IDE. Disabled in `vite.config.ts`.
7. **AI-found email is the contact email.** When research generates leads, the
   verified email goes into `lead.personal.email` and is what Forge / Workspace
   send to. Never substitute or randomize.
8. **Always navigate after research completes.** "View Leads" closes the modal
   AND routes to `/workspace` so the user instantly sees what was generated.

## 6 · Lead generation flow

1. User clicks "Find New Leads" in Shell header.
2. `FindLeadsModal` reads onboarding profile (business + audience).
3. Call server generation endpoint (`/api/leads/generate`) only.
4. Server enforces tier/month limits, consumes usage, then tries provider AI.
   If provider fails, server falls back to deterministic synthesizer output.
5. `addLeads()` writes to `useLeadStore`. Each lead has `stage: "source"`,
   blank `pushedToInstantly`, and a markdown newsletter draft pre-filled.
6. Modal shows "Research Complete → View Leads". Click navigates to `/workspace`.
7. Workspace shows lead card + intelligence + editable email forge. Push button
   uses `lead.personal.email` and flips `pushedToInstantly: true`.

## 7 · Open Threads / Roadmap

- **Email verification API.** Today: regex-only. Plan: NeverBounce / Emailable
  / Hunter. Adds `verified: boolean` on `lead.personal.email`.
- **Real send.** "Push to Instantly" is mocked (state flip + toast). Plan:
  integrate Resend or Instantly API via `server/index.ts`.
- **Server-side API proxy.** Move sensitive keys behind Express to keep them
  out of the client bundle.
- **Lead intent signals.** Agency tier has "AI Intent Scoring" step but no real
  signal source yet. Plan: news/funding APIs.
- **CRM dedup.** Listed as Agency step. Plan: email hash + domain compare
  against historical store.
- **Stripe billing.** Tiers are UI-only. Plan: Stripe Checkout + webhook to
  sync `tier` on auth user.
- **Workspace publishing / shared pipelines.** Team tier hint; not implemented.
- **Telemetry.** Per-route render times, AI latency, cost-per-lead.
- **Real LinkedIn enrichment.** Today synthesized. Plan: Apify LinkedIn actor.

## 8 · Decision Log

- **2026-05-01** Picked client-only render. Removed `shellComponent` and
  TanStack Start SSR pattern. Reason: this is a SPA, not SSR.
- **2026-05-01** Picked **Skerry** over Veyra (8+ AI brands), Cairn (healthcare
  AI), Sextant (procurement AI), Praxa (literally lead-management).
- **2026-05-01** Switched main.tsx CSS import from `index.css` to `styles.css`
  (typography plugin + cyber tokens — the file the app actually uses).
- **2026-05-02** Stats start at zero. Live feed pulls from `useLeadStore`.
  Old `mockLeads` import removed from dashboard.
- **2026-05-02** API keys leave the user surface; live in `.env` only.
  `useAuthStore.apiKeys` deprecated. `apiConfig.ts` is the single read point.
- **2026-05-02** Insight route migrated from `mockLeads` → `useLeadStore`
  with empty-state when no enriched leads exist. Old shape (`l.firstName`)
  replaced with new shape (`l.personal.firstName`).
- **2026-05-02** Workspace route now empty-state-safe. Crash on zero leads
  fixed (`lead.personal.firstName` of undefined).
- **2026-05-02** `FindLeadsModal.handleDone()` now routes to `/workspace`
  on success. Reason: previously the user saw "9 leads found" and the modal
  closed back to Pulse — leads were live in the live feed but not in their
  primary workflow surface.
- **2026-05-02** Real send pipeline. `server/index.ts` runs an Express API on
  :3001 with `/api/email/send` (Resend) and `/api/email/verify` (NeverBounce).
  Forge's "Push to Instantly" button now hits the backend. No-key dev mode
  returns `{ dryRun: true }` so the UI flow always completes.
- **2026-05-02** Two-scope env: `VITE_*` for client bundle, plain names for
  server-only secrets. Server-only is preferred for production keys; the
  Express endpoints are the canonical caller.
- **2026-05-04** Added persisted usage enforcement via `useUsageStore`
  (`client/src/store/usageStore.ts`). Research runs are now hard-capped by
  tier monthly limits, carry a monthly rollover reset, and record per-tier
  estimated AI spend + generated leads. `FindLeadsModal` blocks new runs when
  limit is reached and surfaces estimated run cost before launch; `Settings`
  now shows real monthly usage/spend from the store (no static config counter).
- **2026-05-04** Migrated auth from client-only credential checks to
  server-backed session auth endpoints in `server/index.ts`:
  `/api/auth/login`, `/api/auth/session`, `/api/auth/logout`. Sessions are
  signed (HMAC), stored in HttpOnly cookies, and hydrated on app boot via
  `useAuthStore.hydrateSession()`. `Shell` now blocks protected UI until
  hydration completes and then enforces authenticated entry.
- **2026-05-04** Added auth hardening controls on the server: protected
  sensitive endpoints (`/api/email/send`, `/api/email/verify`) now require a
  valid session cookie; `/api/auth/login` now includes in-memory brute-force
  throttling per IP+email window.
- **2026-05-04** Added server-authoritative entitlement endpoints:
  `GET /api/entitlements/usage` and
  `POST /api/entitlements/research/start`. Run limits are now enforced on the
  backend per authenticated user+tier+month before research can start. Client
  surfaces (`FindLeadsModal`, `Settings`) now hydrate displayed run usage from
  server truth and sync into local usage store for UI continuity.
- **2026-05-04** Lead generation moved server-side via
  `POST /api/leads/generate` (auth required). Browser no longer calls OpenAI
  for lead generation. Backend now performs tier-bound lead count validation,
  monthly entitlement checks, run consumption, OpenAI call with server-only key,
  and deterministic synthesizer fallback if provider call fails.
- **2026-05-04** Forge email drafting moved server-side via
  `POST /api/email/generate` (auth required). Browser no longer calls OpenAI
  directly for draft generation. Backend uses server-only OpenAI key and falls
  back to deterministic synthesized draft when provider is unavailable.

## 8b · Email send pipeline (Forge → server → Resend)

The Forge "Push to Instantly" button now wires to a real backend. Path:

1. User edits Markdown in Forge.
2. Click "Push to Instantly" → `client/src/lib/skerryApi.ts#sendEmail` →
3. POST `/api/email/send` (Express on :3001).
4. Server reads `RESEND_API_KEY` from env, parses subject from the markdown
   (looks for `**Subject:** ...` line first, falls back to first H1), renders
   HTML + text bodies, posts to `https://api.resend.com/emails`.
5. If `RESEND_API_KEY` is unset → server returns `{ ok: true, dryRun: true }`
   so the UI completes its happy path without sending. Toast tells the user.
6. On success, the lead is marked `pushedToInstantly: true` (legacy field
   name — covers any send provider).

Email verification (`/api/email/verify`) follows the same shape: regex first,
NeverBounce when key is set.

For local dev, Vite serves the SPA on :3000 and Express runs on :3001.
Client uses `VITE_API_BASE=http://localhost:3001` (or same-origin in prod).

## 9 · Test credentials (demo)

- Solo: solo@skerry.io / solo123
- Team: team@skerry.io / team123
- Agency: agency@skerry.io / agency123
- Developer: dev@skerry.io / skerry-dev-2024 (has key panel, onboarding reset)
