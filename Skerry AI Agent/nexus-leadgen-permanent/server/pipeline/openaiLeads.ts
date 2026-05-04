/**
 * OpenAI-backed synthetic lead generation (server-only key).
 * Dependencies: openai. Env: OPENAI_API_KEY.
 */

import OpenAI from "openai";
import type { LeadInsert } from "../../shared/database.types.js";
import { enrichLeadRecord, ruleBasedEnrich } from "./enrich.js";

export interface LeadGenInput {
  businessDescription: string;
  targetAudience: string;
  tier: "solo" | "team" | "agency";
  count: number;
}

export interface GeneratedLeadShape {
  firstName: string;
  lastName: string;
  title: string;
  email: string;
  linkedin: string;
  organization: { name: string; website: string };
  websiteContext: string;
  personContext: string;
  uniqueAngles: string[];
}

const mdTemplate = (firstName: string, org: string, angle: string) => `# Brief for ${org}

**For ${firstName}** — one-page signal from your category.

---

## The Signal

${angle}

If this resonates, reply *send* and we’ll ship the full brief.

— Skerry
`;

export async function generateLeadsOpenAI(
  apiKey: string,
  input: LeadGenInput,
): Promise<GeneratedLeadShape[]> {
  const client = new OpenAI({ apiKey });
  const depthInstruction =
    input.tier === "solo"
      ? "Generate basic lead profiles with minimal context."
      : input.tier === "team"
        ? "Generate detailed lead profiles with website context."
        : "Generate highly detailed profiles with deep angles for enterprise outreach.";

  const prompt = `You are a B2B lead generation AI. Based on the following business context, generate ${input.count} realistic, highly specific lead profiles.

Business Description: ${input.businessDescription}
Target Audience: ${input.targetAudience}
Research Depth: ${depthInstruction}

Return a JSON array of leads. Each lead must have:
- firstName, lastName (realistic names)
- title (specific job title)
- email (realistic business email)
- linkedin (LinkedIn profile URL)
- organization: { name, website }
- websiteContext (2-3 sentences)
- personContext (2-3 sentences)
- uniqueAngles (array of 3 short strategic angles)

Return ONLY valid JSON array, no markdown.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
    max_tokens: 4000,
  });

  const content = response.choices[0]?.message?.content ?? "[]";
  const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  try {
    return JSON.parse(cleaned) as GeneratedLeadShape[];
  } catch {
    return [];
  }
}

export async function generatedToLeadInserts(
  rows: GeneratedLeadShape[],
  source: "openai" | "apify",
  enrichWithOpenAI: boolean,
  apiKey?: string,
): Promise<LeadInsert[]> {
  const out: LeadInsert[] = [];
  for (const raw of rows) {
    const angle = raw.uniqueAngles[0] ?? "strategic fit";
    let ins: LeadInsert = {
      stage: "source",
      personal: {
        firstName: raw.firstName,
        lastName: raw.lastName,
        email: raw.email,
        title: raw.title,
        linkedin: raw.linkedin,
      },
      organization: raw.organization,
      extraction: {
        websiteContext: raw.websiteContext,
        personContext: raw.personContext,
        uniqueAngles: raw.uniqueAngles,
      },
      newsletter: {
        title: `Note for ${raw.organization.name}`,
        subheading: "Personalized outreach",
        body: mdTemplate(raw.firstName, raw.organization.name, angle),
      },
      source,
      external_ref: null,
      pushed_to_instantly: false,
    };
    ins = ruleBasedEnrich(ins);
    if (enrichWithOpenAI && apiKey) {
      ins = await enrichLeadRecord(ins, apiKey);
    }
    out.push(ins);
  }
  return out;
}
