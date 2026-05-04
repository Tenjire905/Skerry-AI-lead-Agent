/**
 * Developer-controlled API configuration.
 *
 * Customers never see or edit these keys. Provider-paid SaaS model: the
 * subscription covers AI/scraping/email costs, and we hold the keys.
 *
 * Source of truth: .env at the project root (VITE_*-prefixed so Vite exposes
 * them to the client bundle). Everything in the app should read keys from
 * here — never `import.meta.env.*` directly.
 *
 * Production note: keys still end up in the bundle. For real launch, move
 * sensitive calls behind the Express server in `server/index.ts`.
 */

type ApiService = "openai" | "apify" | "instantly" | "neverbounce" | "resend";

const env = import.meta.env as Record<string, string | undefined>;

export const apiConfig = {
  openai: env.VITE_OPENAI_API_KEY ?? "",
  apify: env.VITE_APIFY_API_KEY ?? "",
  instantly: env.VITE_INSTANTLY_API_KEY ?? "",
  neverbounce: env.VITE_NEVERBOUNCE_API_KEY ?? "",
  resend: env.VITE_RESEND_API_KEY ?? "",
} as const satisfies Record<ApiService, string>;

export function hasApiKey(service: ApiService): boolean {
  return Boolean(apiConfig[service] && apiConfig[service].length > 0);
}

export function getApiKey(service: ApiService): string {
  return apiConfig[service];
}

export function configuredServices(): ApiService[] {
  return (Object.keys(apiConfig) as ApiService[]).filter((s) => hasApiKey(s));
}

export type { ApiService };
