import { create } from "zustand";
import { AccountTier } from "./accountTierStore";

export type ResearchDepth = "basic" | "standard" | "deep";
export type ResearchStatus = "idle" | "running" | "complete" | "error";

export interface ResearchStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "skipped";
  detail?: string;
}

export interface TierConfig {
  depth: ResearchDepth;
  label: string;
  monthlyLimit: number;
  usedThisMonth: number;
  maxLeadsPerRun: number;
  steps: string[];
  description: string;
}

export const TIER_CONFIGS: Record<AccountTier, TierConfig> = {
  solo: {
    depth: "basic",
    label: "Basic Search",
    monthlyLimit: 50,
    usedThisMonth: 0,
    maxLeadsPerRun: 5,
    steps: ["Keyword Search", "Profile Extraction", "Email Validation"],
    description: "Surface-level discovery via keyword matching.",
  },
  team: {
    depth: "standard",
    label: "Standard Research",
    monthlyLimit: 250,
    usedThisMonth: 0,
    maxLeadsPerRun: 20,
    steps: [
      "Keyword Search",
      "Profile Extraction",
      "Website Analysis",
      "LinkedIn Enrichment",
      "Email Validation",
    ],
    description: "Multi-source enrichment with website context.",
  },
  agency: {
    depth: "deep",
    label: "Deep Research",
    monthlyLimit: 1000,
    usedThisMonth: 0,
    maxLeadsPerRun: 50,
    steps: [
      "Keyword Search",
      "Profile Extraction",
      "Website Deep-Crawl",
      "LinkedIn Enrichment",
      "News & Signal Monitoring",
      "AI Intent Scoring",
      "Email Validation",
      "CRM Deduplication",
    ],
    description: "Full-spectrum intelligence with AI intent scoring.",
  },
};

interface ResearchStore {
  status: ResearchStatus;
  steps: ResearchStep[];
  currentStepIndex: number;
  lastRunAt: string | null;
  leadsFoundCount: number;
  errorMessage: string | null;
  startResearch: (tier: AccountTier, businessContext: string) => Promise<void>;
  reset: () => void;
  setLeadsFoundCount: (count: number) => void;
}

export const useResearchStore = create<ResearchStore>((set, get) => ({
  status: "idle",
  steps: [],
  currentStepIndex: 0,
  lastRunAt: null,
  leadsFoundCount: 0,
  errorMessage: null,

  startResearch: async (tier, _businessContext) => {
    const config = TIER_CONFIGS[tier];
    const initialSteps: ResearchStep[] = config.steps.map((label, i) => ({
      id: String(i),
      label,
      status: "pending",
    }));

    set({
      status: "running",
      steps: initialSteps,
      currentStepIndex: 0,
      errorMessage: null,
      leadsFoundCount: 0,
    });

    for (let i = 0; i < initialSteps.length; i++) {
      // Mark current step as running
      set(s => ({
        steps: s.steps.map((step, idx) =>
          idx === i ? { ...step, status: "running" } : step
        ),
        currentStepIndex: i,
      }));

      // Simulate step duration based on depth
      const baseDuration = tier === "solo" ? 600 : tier === "team" ? 800 : 1000;
      await new Promise(r => setTimeout(r, baseDuration + Math.random() * 400));

      // Mark step as done with a detail
      const details: Record<string, string> = {
        "Keyword Search": `Found ${Math.floor(Math.random() * 80 + 40)} candidates`,
        "Profile Extraction": `Extracted ${Math.floor(Math.random() * 30 + 10)} profiles`,
        "Website Analysis": `Analyzed ${Math.floor(Math.random() * 20 + 5)} websites`,
        "Website Deep-Crawl": `Deep-crawled ${Math.floor(Math.random() * 30 + 10)} domains`,
        "LinkedIn Enrichment": `Enriched ${Math.floor(Math.random() * 20 + 5)} profiles`,
        "News & Signal Monitoring": `Detected ${Math.floor(Math.random() * 15 + 3)} intent signals`,
        "AI Intent Scoring": `Scored & ranked all leads by fit`,
        "Email Validation": `Validated ${Math.floor(Math.random() * 15 + 3)} emails`,
        "CRM Deduplication": `Removed ${Math.floor(Math.random() * 5 + 1)} duplicates`,
      };

      set(s => ({
        steps: s.steps.map((step, idx) =>
          idx === i
            ? { ...step, status: "done", detail: details[step.label] ?? "Done" }
            : step
        ),
      }));
    }

    // Caller (FindLeadsModal) sets leadsFoundCount via setLeadsFoundCount
    // after its own async lead-generation work completes.
    set({
      status: "complete",
      lastRunAt: new Date().toISOString(),
    });
  },

  reset: () => {
    set({
      status: "idle",
      steps: [],
      currentStepIndex: 0,
      errorMessage: null,
      leadsFoundCount: 0,
    });
  },
  setLeadsFoundCount: (count: number) => set({ leadsFoundCount: count }),
}));
