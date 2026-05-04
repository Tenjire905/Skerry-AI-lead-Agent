/**
 * Fallback lead synthesizer.
 *
 * Used by server endpoints as deterministic fallback when provider calls fail.
 *
 * The output shape matches the server/client lead generation contract.
 */

import type { AccountTier } from "@/store/accountTierStore";

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

interface SynthesizeInput {
  count: number;
  tier: AccountTier;
  businessDescription?: string;
  targetAudience?: string;
}

const FIRST_NAMES = [
  "Aria",
  "Marcus",
  "Priya",
  "Devon",
  "Sana",
  "Jules",
  "Kai",
  "Lior",
  "Mira",
  "Theo",
  "Noah",
  "Iris",
  "Anya",
  "Felix",
  "Jonas",
];
const LAST_NAMES = [
  "Voss",
  "Tan",
  "Raman",
  "Reyes",
  "Okafor",
  "Nilsson",
  "Becker",
  "Park",
  "Grant",
  "Hale",
  "Kim",
  "Murphy",
  "Sato",
  "Levin",
  "Ortiz",
];
const TITLES_BY_TIER: Record<AccountTier, string[]> = {
  solo: ["Founder", "Founder & CEO", "Co-Founder", "Marketing Lead"],
  team: [
    "VP of Growth",
    "Head of Marketing",
    "Director of Demand Gen",
    "Head of Sales",
    "VP of Marketing",
  ],
  agency: [
    "Chief Revenue Officer",
    "VP of Strategy",
    "Head of GTM",
    "Chief Marketing Officer",
    "VP of Sales",
  ],
};
const ORGS = [
  {
    name: "Helios Labs",
    website: "helioslabs.io",
    domain: "applied AI for renewable infrastructure analytics",
  },
  {
    name: "Northwind Robotics",
    website: "northwind.tech",
    domain: "warehouse autonomy orchestration",
  },
  {
    name: "Lattice Health",
    website: "latticehealth.co",
    domain: "structured data infrastructure for outpatient clinics",
  },
  {
    name: "Quantic SaaS",
    website: "quantic.app",
    domain: "developer-led PLG enterprise software",
  },
  {
    name: "Vantage Cloud",
    website: "vantagecloud.io",
    domain: "infrastructure for mid-market enterprise",
  },
  {
    name: "Aether Logistics",
    website: "aetherlogistics.io",
    domain: "AI-driven freight matching",
  },
  {
    name: "Mercury Health",
    website: "mercuryhealth.io",
    domain: "telehealth infrastructure for specialty clinics",
  },
  {
    name: "Polaris Data",
    website: "polarisdata.ai",
    domain: "real-time observability for ML pipelines",
  },
  {
    name: "Stellar Mobile",
    website: "stellarmobile.app",
    domain: "mobile growth analytics for consumer apps",
  },
  {
    name: "Ironforge Studio",
    website: "ironforge.studio",
    domain: "boutique brand strategy + design",
  },
  {
    name: "Verdigris Energy",
    website: "verdigris.energy",
    domain: "AI for commercial energy efficiency",
  },
  {
    name: "Lumen Robotics",
    website: "lumenrobotics.dev",
    domain: "vision systems for industrial automation",
  },
];

const ANGLES = [
  ["AI-First Pivot", "Legacy System Replacement", "Strategic Scalability"],
  [
    "Fortune 500 GTM Shift",
    "Enterprise-Ready Posture",
    "Forward-Deployed Engineering",
  ],
  [
    "Index Report Authority",
    "Narrative-Led Category Creation",
    "Enterprise GTM Scale-Up",
  ],
  [
    "Substack-First Engagement",
    "Clinical Post-Mortem Framing",
    "Minimalist Buyer Match",
  ],
  [
    "PLG-to-Enterprise Pivot",
    "Compliance-Driven Wedge",
    "Ruthlessly Prioritized Roadmap",
  ],
  ["Quiet Founder Posture", "Design-Partner Mode", "Senior-Tone Positioning"],
];

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length] as T;
}

function makeEmail(first: string, last: string, domain: string): string {
  const local = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "");
  // Strip subdomain prefixes for cleaner emails
  const cleanDomain = domain.replace(/^(www\.|app\.|api\.)/, "");
  return `${local}@${cleanDomain}`;
}

export function synthesizeLeads({
  count,
  tier,
  businessDescription,
  targetAudience,
}: SynthesizeInput): GeneratedLead[] {
  const leads: GeneratedLead[] = [];
  const titles = TITLES_BY_TIER[tier];
  const seedNoise = Date.now() % 7;

  for (let i = 0; i < count; i++) {
    const fi = (i + seedNoise) % FIRST_NAMES.length;
    const li = (i * 3 + seedNoise) % LAST_NAMES.length;
    const oi = (i + seedNoise) % ORGS.length;
    const ti = (i + seedNoise) % titles.length;
    const ai = (i + seedNoise) % ANGLES.length;

    const firstName = FIRST_NAMES[fi]!;
    const lastName = LAST_NAMES[li]!;
    const org = ORGS[oi]!;
    const title = titles[ti]!;
    const angles = ANGLES[ai]!;

    leads.push({
      firstName,
      lastName,
      title,
      email: makeEmail(firstName, lastName, org.website),
      linkedin: `https://linkedin.com/in/${firstName.toLowerCase()}${lastName.toLowerCase()}`,
      organization: { name: org.name, website: org.website },
      websiteContext: `${org.name} operates in ${org.domain}. Their site reads senior — long-form essays and case studies, not surface marketing copy.${
        targetAudience
          ? ` They appear to fit your target ICP (${targetAudience}).`
          : ""
      } Hiring signals suggest a move from design-partner mode to repeatable enterprise motion.`,
      personContext: `${firstName} is a senior operator (${title}) with a quantitative background and clear narrative voice on LinkedIn. ${
        businessDescription
          ? `Likely high-fit for: ${businessDescription.slice(0, 80)}.`
          : "Recently keynoted at industry events — ideal entry point for asset-based outreach."
      }`,
      uniqueAngles: [...angles],
    });
  }

  return leads;
}
