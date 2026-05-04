import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AccountTier } from "./accountTierStore";
import { TIER_CONFIGS } from "./researchStore";

interface TierUsage {
  runsUsed: number;
  leadsGenerated: number;
  estimatedSpendUsd: number;
}

interface UsageStore {
  usageMonth: string;
  usageByTier: Record<AccountTier, TierUsage>;
  ensureCurrentMonth: () => void;
  getTierUsage: (tier: AccountTier) => TierUsage;
  setRunsUsedFromServer: (tier: AccountTier, runsUsed: number) => void;
  canStartRun: (tier: AccountTier) => {
    allowed: boolean;
    reason?: string;
    runsRemaining: number;
  };
  estimateRunCostUsd: (
    tier: AccountTier,
    requestedLeads: number,
    aiEnabled: boolean
  ) => number;
  recordResearchRun: (params: {
    tier: AccountTier;
    generatedLeads: number;
    requestedLeads: number;
    usedAi: boolean;
  }) => void;
  resetAllUsage: () => void;
}

const ZERO_USAGE: TierUsage = {
  runsUsed: 0,
  leadsGenerated: 0,
  estimatedSpendUsd: 0,
};

const currentMonthKey = () => {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
};

const createEmptyUsageByTier = (): Record<AccountTier, TierUsage> => ({
  solo: { ...ZERO_USAGE },
  team: { ...ZERO_USAGE },
  agency: { ...ZERO_USAGE },
});

// Conservative cost model for rough margin tracking in-app.
const TIER_BASE_COST_USD: Record<AccountTier, number> = {
  solo: 0.015,
  team: 0.03,
  agency: 0.05,
};

const COST_PER_LEAD_USD: Record<AccountTier, number> = {
  solo: 0.003,
  team: 0.004,
  agency: 0.006,
};

export const useUsageStore = create<UsageStore>()(
  persist(
    (set, get) => ({
      usageMonth: currentMonthKey(),
      usageByTier: createEmptyUsageByTier(),

      ensureCurrentMonth: () => {
        const month = currentMonthKey();
        const state = get();
        if (state.usageMonth === month) return;
        set({ usageMonth: month, usageByTier: createEmptyUsageByTier() });
      },

      getTierUsage: tier => {
        get().ensureCurrentMonth();
        return get().usageByTier[tier];
      },

      setRunsUsedFromServer: (tier, runsUsed) => {
        get().ensureCurrentMonth();
        set(state => ({
          usageByTier: {
            ...state.usageByTier,
            [tier]: {
              ...state.usageByTier[tier],
              runsUsed: Math.max(0, runsUsed),
            },
          },
        }));
      },

      canStartRun: tier => {
        get().ensureCurrentMonth();
        const runsUsed = get().usageByTier[tier].runsUsed;
        const runsRemaining = Math.max(
          TIER_CONFIGS[tier].monthlyLimit - runsUsed,
          0
        );
        if (runsRemaining <= 0) {
          return {
            allowed: false,
            reason: `Monthly run limit reached for ${tier}. Upgrade plan or wait for next month.`,
            runsRemaining,
          };
        }
        return { allowed: true, runsRemaining };
      },

      estimateRunCostUsd: (tier, requestedLeads, aiEnabled) => {
        if (!aiEnabled) return 0;
        const boundedCount = Math.max(requestedLeads, 1);
        return Number(
          (
            TIER_BASE_COST_USD[tier] +
            boundedCount * COST_PER_LEAD_USD[tier]
          ).toFixed(4)
        );
      },

      recordResearchRun: ({ tier, generatedLeads, requestedLeads, usedAi }) => {
        get().ensureCurrentMonth();
        set(state => {
          const prev = state.usageByTier[tier];
          const estimatedRunCost = usedAi
            ? get().estimateRunCostUsd(tier, requestedLeads, true)
            : 0;
          return {
            usageByTier: {
              ...state.usageByTier,
              [tier]: {
                runsUsed: prev.runsUsed,
                leadsGenerated:
                  prev.leadsGenerated + Math.max(generatedLeads, 0),
                estimatedSpendUsd: Number(
                  (prev.estimatedSpendUsd + estimatedRunCost).toFixed(4)
                ),
              },
            },
          };
        });
      },

      resetAllUsage: () => {
        set({
          usageMonth: currentMonthKey(),
          usageByTier: createEmptyUsageByTier(),
        });
      },
    }),
    {
      name: "skerry-usage",
      partialize: s => ({
        usageMonth: s.usageMonth,
        usageByTier: s.usageByTier,
      }),
    }
  )
);
