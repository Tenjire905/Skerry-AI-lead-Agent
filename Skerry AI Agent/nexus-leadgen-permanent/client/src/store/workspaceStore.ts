/**
 * Current workspace + list (from GET /api/workspaces when using Supabase auth).
 * Dependencies: none (fetch). Env: VITE_API_BASE.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface WorkspaceSummary {
  id: string;
  name: string;
  slug: string;
  plan_tier: string;
}

interface WorkspaceStore {
  workspaces: WorkspaceSummary[];
  currentId: string | null;
  setWorkspaces: (list: WorkspaceSummary[]) => void;
  setCurrentId: (id: string | null) => void;
  reset: () => void;
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set) => ({
      workspaces: [],
      currentId: null,
      setWorkspaces: (list) =>
        set((s) => ({
          workspaces: list,
          currentId: s.currentId && list.some((w) => w.id === s.currentId) ? s.currentId : list[0]?.id ?? null,
        })),
      setCurrentId: (id) => set({ currentId: id }),
      reset: () => set({ workspaces: [], currentId: null }),
    }),
    { name: "skerry-workspace" },
  ),
);
