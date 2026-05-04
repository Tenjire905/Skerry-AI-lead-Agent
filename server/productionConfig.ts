/**
 * Fail-fast checks when NODE_ENV=production so misconfigured deploys do not start.
 */

export function assertEnterpriseProductionConfig(): void {
  if (process.env.NODE_ENV !== "production") return;

  const origins = (process.env.SKERRY_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  if (origins.length === 0) {
    throw new Error(
      "NODE_ENV=production requires SKERRY_ALLOWED_ORIGINS (comma-separated browser origins, e.g. https://app.example.com)."
    );
  }
  if (process.env.ALLOW_DEMO_AUTH === "true") {
    throw new Error("NODE_ENV=production forbids ALLOW_DEMO_AUTH=true.");
  }
}
