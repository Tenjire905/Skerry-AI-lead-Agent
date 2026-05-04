import OpenAI from "openai";

function getClient(apiKey: string) {
  return new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
}

export interface LeadGenerationInput {
  businessDescription: string;
  targetAudience: string;
  tier: "solo" | "team" | "agency";
  count: number;
}

export interface GeneratedLead {
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

export async function generateLeadsWithAI(
  input: LeadGenerationInput,
  apiKey: string
): Promise<GeneratedLead[]> {
  const client = getClient(apiKey);

  const depthInstruction =
    input.tier === "solo"
      ? "Generate basic lead profiles with minimal context."
      : input.tier === "team"
        ? "Generate detailed lead profiles with website context and LinkedIn enrichment."
        : "Generate highly detailed lead profiles with deep website analysis, intent signals, and unique strategic angles.";

  const prompt = `You are a B2B lead generation AI. Based on the following business context, generate ${input.count} realistic, highly specific lead profiles.

Business Description: ${input.businessDescription}
Target Audience: ${input.targetAudience}
Research Depth: ${depthInstruction}

Return a JSON array of leads. Each lead must have:
- firstName, lastName (realistic names)
- title (specific job title relevant to the target audience)
- email (realistic business email based on company domain)
- linkedin (realistic LinkedIn URL)
- organization: { name, website }
- websiteContext (2-3 sentences about the company based on their likely website)
- personContext (2-3 sentences about the person's background and relevance)
- uniqueAngles (array of 3 short strategic angles for outreach, e.g. "AI-First Pivot")

Make the leads realistic and highly relevant to the business description. Vary industries and company sizes.
Return ONLY valid JSON array, no markdown, no explanation.`;

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
    max_tokens: 3000,
  });

  const content = response.choices[0]?.message?.content ?? "[]";
  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    return JSON.parse(cleaned) as GeneratedLead[];
  } catch {
    console.error("Failed to parse AI response:", content);
    return [];
  }
}

export interface EmailGenerationInput {
  lead: {
    firstName: string;
    lastName: string;
    title: string;
    organization: { name: string };
    websiteContext: string;
    personContext: string;
    uniqueAngles: string[];
  };
  businessDescription: string;
  senderName: string;
  angle?: string;
}

export async function generateEmailWithAI(
  input: EmailGenerationInput,
  apiKey: string
): Promise<string> {
  const client = getClient(apiKey);

  const angle = input.angle ?? input.lead.uniqueAngles[0] ?? "value proposition";

  const prompt = `You are an expert cold email copywriter specializing in asset-based outreach.

Write a highly personalized cold email for the following lead:
- Name: ${input.lead.firstName} ${input.lead.lastName}
- Title: ${input.lead.title} at ${input.lead.organization.name}
- Company Context: ${input.lead.websiteContext}
- Person Context: ${input.lead.personContext}
- Strategic Angle: ${angle}

Sender's Business: ${input.businessDescription}
Sender Name: ${input.senderName}

Requirements:
- Subject line that references something specific about their company
- Opening that shows genuine research (reference the strategic angle)
- 2-3 sentences connecting their situation to the sender's value
- Soft CTA (not pushy)
- Total length: 80-120 words
- Tone: professional but conversational, not salesy

Format as Markdown with **Subject:** on the first line, then the email body.`;

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 500,
  });

  return response.choices[0]?.message?.content ?? "";
}

export async function analyzeLeadWithAI(
  lead: {
    firstName: string;
    organization: { name: string; website: string };
    websiteContext: string;
    personContext: string;
  },
  businessDescription: string,
  apiKey: string
): Promise<{ score: number; summary: string; recommendation: string }> {
  const client = getClient(apiKey);

  const prompt = `You are a B2B sales intelligence AI. Analyze this lead's fit for the following business.

Business: ${businessDescription}

Lead:
- Name: ${lead.firstName} at ${lead.organization.name}
- Website: ${lead.organization.website}
- Company Context: ${lead.websiteContext}
- Person Context: ${lead.personContext}

Return JSON with:
- score: number 1-100 (fit score)
- summary: 1 sentence summary of why they're a good/bad fit
- recommendation: "high priority" | "medium priority" | "low priority"

Return ONLY valid JSON, no markdown.`;

  const response = await client.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 200,
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    return { score: 50, summary: "Analysis unavailable", recommendation: "medium priority" };
  }
}
