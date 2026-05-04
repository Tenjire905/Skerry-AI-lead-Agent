/**
 * Lead enrichment: rule-based tightening + optional OpenAI pass.
 * Dependencies: openai (optional). Env: OPENAI_API_KEY when enrichAI true.
 */

import OpenAI from "openai";
import type { LeadInsert } from "../../shared/database.types.js";

/** Deterministic cleanup — always runs. */
export function ruleBasedEnrich(lead: LeadInsert): LeadInsert {
  const orgName = String((lead.organization as { name?: string })?.name ?? "").trim();
  const website = String((lead.organization as { website?: string })?.website ?? "").trim();
  const angles = Array.isArray((lead.extraction as { uniqueAngles?: string[] }).uniqueAngles)
    ? (lead.extraction as { uniqueAngles: string[] }).uniqueAngles
    : [];
  const trimmedAngles = angles.map((a) => a.trim()).filter(Boolean).slice(0, 5);
  return {
    ...lead,
    organization: { name: orgName || "Unknown", website: website || "" },
    extraction: {
      ...lead.extraction,
      uniqueAngles: trimmedAngles.length ? trimmedAngles : ["Fit", "Timing", "Channel"],
    },
  };
}

/** Optional short OpenAI summary to deepen extraction fields. */
export async function enrichLeadRecord(lead: LeadInsert, apiKey: string): Promise<LeadInsert> {
  const base = lead;
  const client = new OpenAI({ apiKey });
  const p = base.personal as {
    firstName?: string;
    lastName?: string;
    title?: string;
  };
  const o = base.organization as { name?: string; website?: string };
  const prompt = `Compress and sharpen B2B lead intel. Return JSON only: {"websiteContext": string, "personContext": string, "uniqueAngles": string[3]}
Company: ${o.name} (${o.website})
Person: ${p.firstName} ${p.lastName}, ${p.title}
Existing angles: ${JSON.stringify((base.extraction as { uniqueAngles?: string[] }).uniqueAngles ?? [])}`;

  try {
    const res = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.35,
      max_tokens: 500,
    });
    const text = res.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(text.replace(/```json\n?|```/g, "").trim()) as {
      websiteContext?: string;
      personContext?: string;
      uniqueAngles?: string[];
    };
    const merged: LeadInsert = {
      ...base,
      extraction: {
        ...base.extraction,
        websiteContext: parsed.websiteContext ?? (base.extraction as { websiteContext?: string }).websiteContext,
        personContext: parsed.personContext ?? (base.extraction as { personContext?: string }).personContext,
        uniqueAngles: parsed.uniqueAngles ?? (base.extraction as { uniqueAngles?: string[] }).uniqueAngles,
      },
    };
    return ruleBasedEnrich(merged);
  } catch {
    return ruleBasedEnrich(base);
  }
}
