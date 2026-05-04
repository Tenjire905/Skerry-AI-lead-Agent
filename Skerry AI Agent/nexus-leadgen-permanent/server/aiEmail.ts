/**
 * Server-side cold email generation via OpenAI.
 * Dependencies: openai. Env: OPENAI_API_KEY.
 */

import OpenAI from "openai";
import type { z } from "zod";
import type { aiEmailBodySchema } from "./validation/schemas.js";

type Input = z.infer<typeof aiEmailBodySchema>;

export async function generateEmailMarkdown(apiKey: string, input: Input): Promise<string> {
  const client = new OpenAI({ apiKey });
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
- Opening that shows genuine research
- 2-3 sentences connecting their situation to the sender's value
- Soft CTA
- 80-120 words
- Professional but conversational

Format as Markdown with **Subject:** on the first line, then the email body.`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 500,
  });

  return response.choices[0]?.message?.content ?? "";
}
