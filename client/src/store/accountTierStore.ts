import { create } from "zustand";

export type AccountTier = "solo" | "team" | "agency";

interface AccountTierStore {
  tier: AccountTier;
  setTier: (tier: AccountTier) => void;
  initializeFromLocalStorage: () => void;
}

export const useAccountTierStore = create<AccountTierStore>(set => ({
  tier: "solo",
  setTier: tier => {
    set({ tier });
    localStorage.setItem("skerry-account-tier", tier);
  },
  initializeFromLocalStorage: () => {
    const saved = localStorage.getItem("skerry-account-tier");
    if (saved && ["solo", "team", "agency"].includes(saved)) {
      set({ tier: saved as AccountTier });
    }
  },
}));
