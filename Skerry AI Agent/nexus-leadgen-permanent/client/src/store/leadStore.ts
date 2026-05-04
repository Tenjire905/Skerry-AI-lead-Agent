import { create } from "zustand";

export type PipelineStage = "source" | "analyze" | "draft" | "send";

export interface Lead {
  id: string;
  personal: {
    firstName: string;
    lastName: string;
    email?: string;
    title: string;
    linkedin: string;
  };
  organization: { name: string; website: string };
  extraction: {
    websiteContext: string;
    personContext: string;
    uniqueAngles: string[];
  };
  newsletter: { title: string; subheading: string; body: string };
  stage: PipelineStage;
  pushedToInstantly?: boolean;
}

const md = (l: { firstName: string; org: string; angle: string }) => `# The Future of ${l.org}

**Brief for ${l.firstName}** — a one-page read on what's quietly compounding in your category.

---

## The Signal

${l.angle}

This isn't speculation. Three peers in your space made nearly identical moves before posting outsized growth in the next two quarters.

## The Asset

We've put together a tear-down of how the top 5% of ${l.org}'s category are converting this exact signal into pipeline. No fluff. No ask.

> "The best outbound feels like a tip from a friend who happens to know your industry cold."

## The Open Loop

If any of the above lands, just reply with a single word — *send* — and the brief is in your inbox in under 60 seconds.

— Skerry
`;

export const mockLeads: Lead[] = [
  {
    id: "7",
    personal: {
      firstName: "Zac",
      lastName: "Doe",
      email: "zac@techcorp.ai",
      title: "Founder & CEO",
      linkedin: "https://linkedin.com/in/zacdoe",
    },
    organization: { name: "TechCorp", website: "https://techcorp.ai" },
    extraction: {
      websiteContext:
        "TechCorp is an AI-first infrastructure company positioning itself as the orchestration layer for enterprise model deployment. Their public copy reads like a strategy memo — long-form essays, a quarterly index report, and a partner network spanning three continents. The tone is decidedly senior; nothing on the homepage is targeted below the VP level.\n\nUnder the surface the engineering team has been shipping aggressively — three product surfaces in six months, each tied to a specific Fortune 500 design partner. Hiring signals (six forward-deployed engineering roles) suggest they're scaling delivery rather than core R&D, which is the classic posture of a company moving from design-partner mode to repeatable enterprise motion.",
      personContext:
        "Zac is a second-time founder with a quantitative background (physics undergrad, two years in algorithmic trading) and a clear narrative voice — his LinkedIn essays routinely break 50K impressions. He joined TechCorp's predecessor 14 months ago after a five-year run scaling two AI infra companies, both of which exited within 18 months of his arrival. He keynoted at AI Summit NY and was on a private CTO roundtable hosted by a tier-one VC last spring.",
      uniqueAngles: ["AI-First Pivot", "Legacy System Replacement", "Strategic Scalability"],
    },
    newsletter: {
      title: "The Future of AI",
      subheading: "How TechCorp leads the way",
      body: md({ firstName: "Zac", org: "TechCorp", angle: "Your AI-first pivot is doing the heavy lifting in the background — Fortune 500 buyers are quoting your index report in private channels we monitor." }),
    },
    stage: "send",
    pushedToInstantly: false,
  },
  {
    id: "8",
    personal: {
      firstName: "Aria",
      lastName: "Voss",
      email: "aria@helioslabs.io",
      title: "VP of Growth",
      linkedin: "https://linkedin.com/in/ariavoss",
    },
    organization: { name: "Helios Labs", website: "https://helioslabs.io" },
    extraction: {
      websiteContext:
        "Helios Labs operates at the intersection of applied AI and renewable infrastructure analytics. Their positioning centers on 'predictive grid intelligence' — a category they appear to be actively defining through long-form essays and a quarterly index report.\n\nUnder the surface the engineering team is shipping at an aggressive cadence and hiring forward-deployed engineers, signaling a move from design-partner mode to repeatable enterprise motion.",
      personContext:
        "Aria has a rare combination of quantitative depth and a clear narrative voice. She joined Helios 14 months ago after scaling growth at two climate-tech companies, both of which exited within 18 months. Recently keynoted at ClimateWeek NY.",
      uniqueAngles: ["Index Report Authority", "Narrative-Led Category Creation", "Enterprise GTM Scale-Up"],
    },
    newsletter: {
      title: "The Future of Grid Intelligence",
      subheading: "Why utilities are quoting your index report",
      body: md({ firstName: "Aria", org: "Helios Labs", angle: "Your index report is doing the heavy lifting — utility leaders are quoting it in private channels we monitor." }),
    },
    stage: "draft",
    pushedToInstantly: false,
  },
  {
    id: "9",
    personal: {
      firstName: "Priya",
      lastName: "Raman",
      title: "Founder & CEO",
      linkedin: "https://linkedin.com/in/priyaraman",
    },
    organization: { name: "Lattice Health", website: "https://latticehealth.co" },
    extraction: {
      websiteContext:
        "Lattice Health is a quiet, founder-led company building structured data infrastructure for outpatient clinics. The site is intentionally minimal — one page, no team photos, a single email capture. Design-by-conviction, not lack of resources.\n\nEverything signals a deliberate, customer-led growth posture: long sales cycles, a small set of design partners, and a clear bias toward depth over breadth.",
      personContext:
        "Priya is a physician-turned-founder with a Stanford MD/MBA and a previous exit. She writes a low-frequency, high-signal Substack quietly read by health-system CIOs. She does not respond to generic outbound.",
      uniqueAngles: ["Substack-First Engagement", "Clinical Post-Mortem Framing", "Minimalist Buyer Match"],
    },
    newsletter: {
      title: "Structured Ambiguity",
      subheading: "Why outpatient data stays broken",
      body: md({ firstName: "Priya", org: "Lattice Health", angle: "Your essay on 'structured ambiguity' is the clearest articulation we've seen of why outpatient data stays broken." }),
    },
    stage: "analyze",
    pushedToInstantly: false,
  },
];

export interface LeadStats {
  total: number;
  insightsGenerated: number;
  emailsReady: number;
  sent: number;
  withVerifiedEmail: number;
}

interface LeadStore {
  leads: Lead[];
  selectedId: string;
  select: (id: string) => void;
  pushToInstantly: (id: string) => void;
  selected: () => Lead | undefined;
  addLeads: (newLeads: Partial<Lead>[]) => void;
  /** Append server-shaped leads (e.g. from /api/leads/discover) without resynthesizing. */
  pushLeadsFromApi: (rows: Lead[]) => void;
  replaceAllLeads: (rows: Lead[]) => void;
  updateLeadEmail: (id: string, emailBody: string) => void;
  clearAll: () => void;
  stats: () => LeadStats;
}

export const useLeadStore = create<LeadStore>((set, get) => ({
  // Invariant: fresh user starts with zero leads.
  // mockLeads stays exported above for dev/seed reference but is NOT loaded by default.
  leads: [],
  selectedId: "",
  select: (id) => set({ selectedId: id }),
  pushToInstantly: (id) =>
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === id ? { ...l, pushedToInstantly: true, stage: "send" } : l,
      ),
    })),
  selected: () => {
    const s = get();
    return s.leads.find((l) => l.id === s.selectedId) ?? s.leads[0];
  },
  clearAll: () => set({ leads: [], selectedId: "" }),
  pushLeadsFromApi: (rows) =>
    set((s) => {
      const next = [...s.leads, ...rows];
      return {
        leads: next,
        selectedId: s.selectedId || rows[0]?.id || "",
      };
    }),
  replaceAllLeads: (rows) =>
    set({
      leads: rows,
      selectedId: rows[0]?.id ?? "",
    }),
  stats: () => {
    const { leads } = get();
    const total = leads.length;
    const insightsGenerated = leads.filter(
      (l) => l.extraction.websiteContext.length > 0 || l.extraction.uniqueAngles.length > 0
    ).length;
    const emailsReady = leads.filter((l) => (l.newsletter.body ?? "").length > 0).length;
    const sent = leads.filter((l) => l.pushedToInstantly).length;
    const withVerifiedEmail = leads.filter(
      (l) => !!l.personal.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.personal.email)
    ).length;
    return { total, insightsGenerated, emailsReady, sent, withVerifiedEmail };
  },
  addLeads: (newLeads) => {
    set((s) => {
      const nextId = s.leads.length + 1;
      const mapped: Lead[] = newLeads.map((l, i) => {
        const raw = l as Record<string, unknown> & {
          firstName?: string;
          lastName?: string;
          email?: string;
          title?: string;
          linkedin?: string;
          organization?: { name: string; website: string };
          websiteContext?: string;
          personContext?: string;
          uniqueAngles?: string[];
          newsletter?: Lead["newsletter"];
        };
        return {
          id: String(nextId + i),
          personal: {
            firstName: raw.firstName ?? "Unknown",
            lastName: raw.lastName ?? "",
            email: raw.email ?? undefined,
            title: raw.title ?? "Executive",
            linkedin: raw.linkedin ?? "",
          },
          organization: raw.organization ?? { name: "Unknown", website: "" },
          extraction: {
            websiteContext: raw.websiteContext ?? "",
            personContext: raw.personContext ?? "",
            uniqueAngles: raw.uniqueAngles ?? [],
          },
          newsletter: raw.newsletter ?? {
            title: "AI-Generated Outreach",
            subheading: "Personalized for you",
            body: md({
              firstName: raw.firstName ?? "there",
              org: raw.organization?.name ?? "your company",
              angle: raw.uniqueAngles?.[0] ?? "your unique position",
            }),
          },
          stage: "source" as PipelineStage,
          pushedToInstantly: false,
        };
      });
      const updatedLeads = [...s.leads, ...mapped];
      return {
        leads: updatedLeads,
        selectedId: s.selectedId || mapped[0]?.id || "",
      };
    });
  },
  updateLeadEmail: (id, emailBody) => {
    set((s) => ({
      leads: s.leads.map((l) =>
        l.id === id
          ? { ...l, newsletter: { ...l.newsletter, body: emailBody } }
          : l
      ),
    }));
  },
}));
