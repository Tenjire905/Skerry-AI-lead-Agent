/**
 * Shared lead-generation types (legacy import path for leadSynthesizer).
 * Dependencies: none. Env: N/A.
 */

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
