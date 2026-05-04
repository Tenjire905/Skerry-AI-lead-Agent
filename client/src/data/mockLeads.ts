export type LeadStage =
  | "scraping"
  | "analyzing"
  | "generating"
  | "done"
  | "missing";

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  title: string;
  organization: { name: string; website: string };
  linkedin: string;
  email?: string;
  stage: LeadStage;
  websiteContext: string;
  personContext: string;
  uniqueAngles: string[];
  newsletterMd: string;
  pushedToInstantly?: boolean;
}

const newsletterTemplate = (l: {
  firstName: string;
  org: string;
  angle: string;
}) => `# The Cusp — Insider Brief for ${l.firstName}

**On the radar:** ${l.org}'s recent moves caught our eye.

---

## 1. The Signal

${l.angle}

This isn't speculation — it's pattern recognition. Three peers in the same space made nearly identical moves before posting outsized growth in the next two quarters.

## 2. The Asset

We've put together a one-page tear-down of how the top 5% of ${l.org}'s category are converting this exact signal into pipeline. No fluff. No ask.

> "The best outbound feels like a tip from a friend who happens to know your industry cold." — internal note

## 3. The Open Loop

If any of the above lands, just reply with a single word — *send* — and the brief is in your inbox in under 60 seconds.

— Skerry
`;

export const mockLeads: Lead[] = [
  {
    id: "ld_001",
    firstName: "Aria",
    lastName: "Voss",
    title: "VP of Growth",
    organization: { name: "Helios Labs", website: "helioslabs.io" },
    linkedin: "https://linkedin.com/in/ariavoss",
    email: "aria@helioslabs.io",
    stage: "done",
    websiteContext:
      "Helios Labs operates at the intersection of applied AI and renewable infrastructure analytics. Their public positioning centers on 'predictive grid intelligence' — a category they appear to be actively defining through long-form essays, a quarterly index report, and a partner network that spans three continents. The site's tone is decidedly senior; copy reads like a strategy memo, not a brochure.\n\nUnder the surface, the engineering team has been shipping at an aggressive cadence — three product surface launches in the past six months, each tied to a specific utility-scale customer segment. Hiring signals (six open roles in forward-deployed engineering) suggest they're scaling delivery rather than core R&D, which is the classic posture of a company moving from design-partner mode to repeatable enterprise motion.",
    personContext:
      "Aria has the rare combination of a quantitative background (physics undergrad, two years in algorithmic trading) and a clear narrative voice — her LinkedIn posts read like short essays and routinely break 50K impressions. She joined Helios 14 months ago after a five-year run scaling growth at two climate-tech companies, both of which exited within 18 months of her arrival. Conferences: she keynoted at ClimateWeek NY and was on a private CMO roundtable hosted by a tier-one VC last spring.",
    uniqueAngles: [
      "Helios just published a 47-page index report — almost no one is referencing it in outbound, which makes it a perfect 'I actually read your work' opener.",
      "Aria's recent post about 'narrative-led category creation' had unusually high engagement from utility executives — a signal that her ICP is paying attention to her content, not her ads.",
      "Three of Helios's six open roles are in forward-deployed engineering — they are clearly preparing for an enterprise GTM scale-up, not a self-serve motion.",
    ],
    newsletterMd: newsletterTemplate({
      firstName: "Aria",
      org: "Helios Labs",
      angle:
        "Your index report is doing the heavy lifting in the background — utility leaders are quoting it in private channels we monitor.",
    }),
    pushedToInstantly: true,
  },
  {
    id: "ld_002",
    firstName: "Marcus",
    lastName: "Tan",
    title: "Head of Partnerships",
    organization: { name: "Northwind Robotics", website: "northwind.tech" },
    linkedin: "https://linkedin.com/in/marcustan",
    email: "marcus@northwind.tech",
    stage: "analyzing",
    websiteContext:
      "Northwind Robotics is positioning itself as the operating layer for warehouse autonomy — not the robots themselves, but the orchestration software that makes mixed-fleet deployments tractable. The site leans heavily into customer logos and ROI numbers, with a notable absence of pricing or product screenshots, which is consistent with a 6-7 figure ACV motion.\n\nTheir blog cadence picked up sharply in the last 90 days, and the topics shifted from technical deep-dives to executive-level pieces on supply chain resilience — a clear signal that marketing is now reporting into a GTM leader who wants to influence buyers higher up the org chart.",
    personContext:
      "Marcus spent eight years in enterprise sales at two industrial automation incumbents before pivoting into partnerships at Northwind 11 months ago. His public footprint is light — no podcast appearances, sparse LinkedIn — but his second-degree network is dense with VPs of Operations at Fortune 500 logistics companies. He's the kind of operator who gets things done quietly.",
    uniqueAngles: [
      "Northwind's marketing tone shifted from technical to executive in the last 90 days — your outreach should match the new altitude.",
      "Marcus's LinkedIn is quiet but his network is loud — referencing a mutual connection (even loosely) will dramatically lift reply rates.",
      "Their case studies all cite peak-season throughput as the headline metric — leading with anything else is a swing-and-miss.",
    ],
    newsletterMd: newsletterTemplate({
      firstName: "Marcus",
      org: "Northwind Robotics",
      angle:
        "Your case studies all anchor on peak-season throughput. Three of your closest competitors just shifted to anchoring on labor cost-per-unit instead.",
    }),
    pushedToInstantly: false,
  },
  {
    id: "ld_003",
    firstName: "Priya",
    lastName: "Raman",
    title: "Founder & CEO",
    organization: { name: "Lattice Health", website: "latticehealth.co" },
    linkedin: "https://linkedin.com/in/priyaraman",
    stage: "missing",
    websiteContext:
      "Lattice Health is a quiet, founder-led company building structured data infrastructure for outpatient clinics. The site is intentionally minimal — one page, no team photos, a single email capture. This is design-by-conviction, not lack of resources.\n\nEverything signals a deliberate, customer-led growth posture: long sales cycles, a small set of design partners, and a clear bias toward depth over breadth. Their one published case study is unusually rigorous and reads like an internal post-mortem, which is catnip for technical buyers.",
    personContext:
      "Priya is a physician-turned-founder with a Stanford MD/MBA and a previous exit to a public payer. She writes a low-frequency, high-signal Substack that's quietly read by health-system CIOs. She does not respond to generic outbound — the only inbound she engages with cites specific Substack posts by title.",
    uniqueAngles: [
      "Priya only engages with outbound that quotes her Substack — generic personalization will be filtered as noise.",
      "Lattice's single case study is structured like a clinical post-mortem — leading with that framing signals you actually understand the buyer.",
      "No team page, no pricing, one email — every outreach choice should mirror that minimalism. Three sentences max.",
    ],
    newsletterMd: newsletterTemplate({
      firstName: "Priya",
      org: "Lattice Health",
      angle:
        "Your essay on 'structured ambiguity' last month is the clearest articulation we've seen of why outpatient data stays broken.",
    }),
    pushedToInstantly: false,
  },
  {
    id: "ld_004",
    firstName: "Devon",
    lastName: "Reyes",
    title: "Director of Demand Gen",
    organization: { name: "Quantic SaaS", website: "quantic.app" },
    linkedin: "https://linkedin.com/in/devonreyes",
    email: "devon@quantic.app",
    stage: "scraping",
    websiteContext: "",
    personContext: "",
    uniqueAngles: [],
    newsletterMd: "",
    pushedToInstantly: false,
  },
  {
    id: "ld_005",
    firstName: "Sana",
    lastName: "Okafor",
    title: "Chief Revenue Officer",
    organization: { name: "Vantage Cloud", website: "vantagecloud.io" },
    linkedin: "https://linkedin.com/in/sanaokafor",
    email: "sana@vantagecloud.io",
    stage: "generating",
    websiteContext:
      "Vantage Cloud is a mid-stage infrastructure company pivoting from a developer-led motion to enterprise. The site still carries vestiges of the old positioning — pricing calculator, free tier — but the homepage hero now leads with 'platform' language and Fortune 1000 logos.\n\nThe tension between the two motions is visible in the docs: pristine API references sit next to half-finished enterprise security pages. That tension is the wedge — anything that helps them move enterprise buyers faster will get attention.",
    personContext:
      "Sana joined Vantage 7 months ago from a public infra company where she ran the enterprise segment. Known internally as a 'ruthlessly prioritized' operator. Her public content is sparse but she shows up consistently at three specific conferences and is active in a private Slack of 200 RevOps leaders.",
    uniqueAngles: [
      "Vantage is mid-pivot from PLG to enterprise — anything that accelerates the enterprise motion will land; anything PLG-flavored will be ignored.",
      "Sana's three conference appearances are the same every year — referencing her panel from the last one signals real homework.",
      "The half-finished enterprise security pages on the site are a tell: SOC2 / compliance-related angles are top-of-mind right now.",
    ],
    newsletterMd: newsletterTemplate({
      firstName: "Sana",
      org: "Vantage Cloud",
      angle:
        "The gap between your developer docs and your enterprise security pages is widening — and it's the exact gap your buyers stall in.",
    }),
    pushedToInstantly: false,
  },
];
