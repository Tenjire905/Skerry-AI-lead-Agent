/**
 * Zod schemas for JSON bodies and query params on Express routes.
 * Dependencies: zod. Env: N/A.
 */

import { z } from "zod";

export const discoverBodySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  tier: z.enum(["solo", "team", "agency"]),
  count: z.coerce.number().int().min(1).max(50),
  businessDescription: z.string().min(1).max(8000),
  targetAudience: z.string().min(1).max(8000),
  enrichWithOpenAI: z.boolean().optional().default(true),
});

export const aiEmailBodySchema = z.object({
  workspaceId: z.string().uuid().optional(),
  lead: z.object({
    firstName: z.string(),
    lastName: z.string(),
    title: z.string(),
    organization: z.object({ name: z.string() }),
    websiteContext: z.string(),
    personContext: z.string(),
    uniqueAngles: z.array(z.string()),
  }),
  businessDescription: z.string(),
  senderName: z.string(),
  angle: z.string().optional(),
});

export const checkoutBodySchema = z.object({
  workspaceId: z.string().uuid(),
  plan: z.enum(["solo", "team", "agency"]),
});

export const sendEmailBodySchema = z.object({
  to: z.string().email(),
  subject: z.string().optional(),
  bodyMarkdown: z.string().min(1),
});

export const verifyEmailBodySchema = z.object({
  email: z.string().email(),
});
