import type { Lead } from "@/store/leadStore";

export function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "test-lead-1",
    personal: {
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@analytical-engines.test",
      title: "VP Sales",
      linkedin: "https://linkedin.com/in/ada-lovelace",
    },
    organization: {
      name: "Analytical Engines",
      website: "https://analytical-engines.test",
    },
    extraction: {
      websiteContext: "Analytics platform for B2B pipelines.",
      personContext: "Leads a 30-person revenue team.",
      uniqueAngles: ["Pipeline accuracy", "Forecasting"],
    },
    newsletter: {
      title: "AI brief for Analytical Engines",
      subheading: "Personalized angle",
      body: "# Hello Ada\n\nThis is the original draft.",
    },
    stage: "draft",
    pushedToInstantly: false,
    ...overrides,
  };
}
