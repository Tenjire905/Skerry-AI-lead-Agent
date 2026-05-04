/**
 * Apify actor run for lead discovery (feature-flagged). Actor + input are env-specific.
 * Dependencies: none (fetch). Env: APIFY_API_KEY, APIFY_LEADS_ACTOR_ID, FEATURE_APIFY_LEADS.
 */

import type { GeneratedLeadShape } from "./openaiLeads.js";

function actorPath(actorId: string): string {
  const encoded = encodeURIComponent(actorId.replace("/", "~"));
  return `https://api.apify.com/v2/acts/${encoded}/runs`;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

/** Map arbitrary Apify dataset item → our shape (best-effort). */
function mapItem(raw: Record<string, unknown>): GeneratedLeadShape | null {
  const firstName =
    (raw.firstName as string) ||
    (raw.first_name as string) ||
    String(raw.name ?? "")
      .split(" ")
      .slice(0, 1)[0] ||
    "";
  const lastName =
    (raw.lastName as string) ||
    (raw.last_name as string) ||
    String(raw.name ?? "")
      .split(" ")
      .slice(1)
      .join(" ") ||
    "";
  const title = (raw.title as string) || (raw.headline as string) || "Professional";
  const email = (raw.email as string) || "";
  const linkedin =
    (raw.linkedinUrl as string) || (raw.linkedin as string) || (raw.profileUrl as string) || "";
  const orgName =
    (raw.companyName as string) ||
    (raw.company as string) ||
    (raw.organization as string) ||
    "Unknown";
  const website = (raw.companyWebsite as string) || (raw.website as string) || "";
  if (!firstName && !email && !linkedin) return null;
  return {
    firstName: firstName || "Contact",
    lastName: lastName || "",
    title,
    email: email || `${firstName.toLowerCase().replace(/\s+/g, "")}@${orgName.toLowerCase().replace(/\W+/g, "")}.com`,
    linkedin: linkedin || "",
    organization: { name: orgName, website: website.startsWith("http") ? website : website ? `https://${website}` : "" },
    websiteContext: `Organization: ${orgName}. Sourced via Apify discovery.`,
    personContext: `${title}. Profile from public dataset.`,
    uniqueAngles: ["Signal from discovery run", "Freshly sourced", "ICP-aligned"],
  };
}

export async function runApifyLeadDiscovery(args: {
  token: string;
  actorId: string;
  searchQuery: string;
  maxItems: number;
}): Promise<GeneratedLeadShape[]> {
  const { token, actorId, searchQuery, maxItems } = args;
  const runUrl = `${actorPath(actorId)}?token=${encodeURIComponent(token)}`;
  const runResp = await fetch(runUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      // Generic input — tune per actor in Apify console; override via forked actor.
      searchQuery,
      maxItems,
      query: searchQuery,
    }),
  });
  if (!runResp.ok) {
    const t = await runResp.text();
    throw new Error(`apify_run_failed: ${runResp.status} ${t.slice(0, 200)}`);
  }
  const runJson = (await runResp.json()) as { data?: { id?: string; defaultDatasetId?: string } };
  const runId = runJson.data?.id;
  if (!runId) throw new Error("apify_no_run_id");

  const statusUrl = `https://api.apify.com/v2/actor-runs/${runId}?token=${encodeURIComponent(token)}`;
  for (let i = 0; i < 90; i++) {
    const st = await fetch(statusUrl);
    const stJson = (await st.json()) as { data?: { status?: string; defaultDatasetId?: string } };
    const status = stJson.data?.status;
    if (status === "SUCCEEDED") {
      const ds = stJson.data?.defaultDatasetId;
      if (!ds) return [];
      const itemsUrl = `https://api.apify.com/v2/datasets/${ds}/items?token=${encodeURIComponent(token)}&clean=true`;
      const itemsResp = await fetch(itemsUrl);
      const items = (await itemsResp.json()) as Record<string, unknown>[];
      const out: GeneratedLeadShape[] = [];
      for (const it of items) {
        const m = mapItem(it);
        if (m) out.push(m);
        if (out.length >= maxItems) break;
      }
      return out;
    }
    if (status === "FAILED" || status === "ABORTED") {
      throw new Error(`apify_run_${status?.toLowerCase()}`);
    }
    await sleep(2000);
  }
  throw new Error("apify_timeout");
}
