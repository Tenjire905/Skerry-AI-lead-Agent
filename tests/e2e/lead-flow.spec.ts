import { test, expect } from "@playwright/test";
import { installApiMocks, FAKE_LEADS } from "./fixtures/api-mocks";

/**
 * Full E2E happy path:
 *   login → Find New Leads (Apollo mock) → leads in workspace
 *   → edit email draft → Send via Instantly (Resend mock) → Sent.
 *
 * All `/api/**` calls are mocked at the browser level, so the test is hermetic
 * and CI-green without backend secrets (Apollo / Resend / OpenAI).
 */
test("full lead flow: generate → edit draft → push to Instantly", async ({
  page,
}) => {
  const calls = await installApiMocks(page);

  await page.goto("/");

  // --- Login ---------------------------------------------------------------
  await page.getByPlaceholder("you@company.com").fill("demo@skerry.io");
  await page.getByPlaceholder("••••••••").fill("demo-password");
  await page.getByRole("button", { name: /^sign in$/i }).click();

  // Dashboard should now be reachable; the "Find New Leads" CTA lives in the
  // header (Shell.tsx).
  const findLeadsButton = page.getByRole("button", { name: /find new leads/i });
  await expect(findLeadsButton).toBeVisible({ timeout: 15_000 });

  // --- Find Leads modal ----------------------------------------------------
  await findLeadsButton.click();

  // Confirm phase → Start Research.
  await page.getByRole("button", { name: /start research/i }).click();

  // Done phase → "View Leads" navigates to /workspace.
  const viewLeadsButton = page.getByRole("button", { name: /view leads/i });
  await expect(viewLeadsButton).toBeVisible({ timeout: 30_000 });
  expect(calls.generateLeads).toBeGreaterThan(0);
  await viewLeadsButton.click();

  await expect(page).toHaveURL(/\/workspace/);

  // First mocked lead should appear somewhere in the workspace.
  const firstLead = FAKE_LEADS[0];
  await expect(
    page.getByText(`${firstLead.firstName} ${firstLead.lastName}`).first()
  ).toBeVisible({ timeout: 15_000 });

  // --- Edit email draft ----------------------------------------------------
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  const draft = page.locator("textarea").first();
  await expect(draft).toBeVisible();
  const edited = "## Edited by E2E test\n\nThis body was modified before push.";
  await draft.fill(edited);
  await expect(draft).toHaveValue(edited);
  await page.getByRole("button", { name: "Done", exact: true }).click();

  // --- Push to Instantly ---------------------------------------------------
  const pushButton = page.getByRole("button", { name: /send via instantly/i });
  await expect(pushButton).toBeVisible();
  await pushButton.click();

  // Button transitions: "Send via Instantly" → "Sending…" → "Sent".
  await expect(page.getByRole("button", { name: /^sent$/i })).toBeVisible({
    timeout: 10_000,
  });
});
