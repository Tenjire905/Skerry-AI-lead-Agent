import type { Page, Route } from "@playwright/test";

/**
 * Hermetic API mocks for E2E.
 *
 * Every `/api/**` call the SPA makes is intercepted at the browser level via
 * `page.route`, so the test does not depend on:
 *   - the backend server running,
 *   - Apollo / OpenAI for lead generation,
 *   - Resend for email send,
 *   - a database for entitlements / sessions.
 *
 * This keeps the test deterministic and CI-green without external secrets.
 */

const CSRF_TOKEN = "test-csrf-token";

const FAKE_USER = {
  name: "Demo User",
  email: "demo@skerry.io",
  role: "user",
  tier: "solo",
};

export const FAKE_LEADS = [
  {
    firstName: "Ada",
    lastName: "Lovelace",
    title: "VP Sales",
    email: "ada@analytical-engines.test",
    linkedin: "https://linkedin.com/in/ada-lovelace",
    organization: {
      name: "Analytical Engines",
      website: "https://analytical-engines.test",
    },
    websiteContext: "Analytics platform for B2B pipelines.",
    personContext: "Leads a 30-person revenue team.",
    uniqueAngles: ["Pipeline accuracy", "Forecasting"],
  },
  {
    firstName: "Grace",
    lastName: "Hopper",
    title: "Head of Growth",
    email: "grace@compiler.test",
    linkedin: "https://linkedin.com/in/grace-hopper",
    organization: {
      name: "Compiler Co",
      website: "https://compiler.test",
    },
    websiteContext: "Dev tooling for compiled languages.",
    personContext: "Drove growth from 1k to 10k devs.",
    uniqueAngles: ["Developer adoption", "Self-serve onboarding"],
  },
  {
    firstName: "Linus",
    lastName: "Torvalds",
    title: "CTO",
    email: "linus@kernel.test",
    linkedin: "https://linkedin.com/in/linus",
    organization: { name: "Kernel Inc", website: "https://kernel.test" },
    websiteContext: "Infra reliability tooling.",
    personContext: "Engineering-led, 80% IC time.",
    uniqueAngles: ["Reliability SLOs", "Open source"],
  },
];

export type RouteCalls = {
  generateLeads: number;
  emailSend: number;
};

export async function installApiMocks(page: Page): Promise<RouteCalls> {
  const calls: RouteCalls = { generateLeads: 0, emailSend: 0 };

  // --- Onboarding bypass: seed profile so Shell skips the onboarding gate.
  await page.addInitScript(() => {
    localStorage.setItem(
      "skerry-onboarding-profile",
      JSON.stringify({
        businessDescription: "AI lead-gen for B2B SaaS",
        targetAudience: "Heads of Growth at 50-500 person SaaS companies",
      })
    );
  });

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(body),
    });

  await page.route("**/api/auth/csrf", route =>
    json(route, { ok: true, csrfToken: CSRF_TOKEN })
  );

  await page.route("**/api/auth/login", route =>
    json(route, { ok: true, user: FAKE_USER, csrfToken: CSRF_TOKEN })
  );

  // Start unauthenticated so the login form is rendered. Once the user logs
  // in, the auth store flips to authenticated based on /api/auth/login's
  // response — no further /api/auth/session calls are needed for that path.
  await page.route("**/api/auth/session", route =>
    json(route, { ok: false, error: "Not authenticated" }, 401)
  );

  await page.route("**/api/auth/logout", route => json(route, { ok: true }));

  await page.route("**/api/entitlements/usage", route =>
    json(route, {
      ok: true,
      tier: "solo",
      runsUsed: 0,
      monthlyRuns: 10,
      runsRemaining: 10,
      maxLeadsPerRun: 5,
    })
  );

  // Apollo-backed lead generation (mocked).
  await page.route("**/api/leads/generate", route => {
    calls.generateLeads += 1;
    return json(route, {
      ok: true,
      source: "synthesizer",
      leads: FAKE_LEADS,
      tier: "solo",
      runsUsed: 1,
      monthlyRuns: 10,
      runsRemaining: 9,
      maxLeadsPerRun: 5,
    });
  });

  // LLM email draft generation (in case the UI calls it).
  await page.route("**/api/email/generate", route =>
    json(route, {
      ok: true,
      source: "synthesizer",
      markdown:
        "# Quick idea for {{company}}\n\nHi there — short, specific, mocked.",
    })
  );

  // Resend-backed email send (mocked). Push-to-Instantly is currently a
  // client-side simulation, but if/when it routes through the server we still
  // want the test to pass without a real Resend key.
  await page.route("**/api/email/send", route => {
    calls.emailSend += 1;
    return json(route, { ok: true, id: "mocked-resend-id", dryRun: false });
  });

  await page.route("**/api/email/verify", route =>
    json(route, { ok: true, result: "valid" })
  );

  return calls;
}
