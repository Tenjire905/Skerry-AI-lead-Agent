/**
 * Auth: Supabase session when configured, otherwise local demo users (dev only).
 * Dependencies: zustand, ../lib/supabaseBrowser. Env: VITE_SUPABASE_*, VITE_DEVELOPER_EMAILS.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseBrowser } from "@/lib/supabaseBrowser";
import { useWorkspaceStore } from "@/store/workspaceStore";

export type UserRole = "user" | "developer";
export type AuthMode = "supabase" | "demo";

interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
  tier: "solo" | "team" | "agency";
}

const devEmails = (): Set<string> => {
  const raw = (import.meta.env.VITE_DEVELOPER_EMAILS as string | undefined) ?? "dev@skerry.io";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
};

function mapSupabaseUser(u: SupabaseUser): AuthUser {
  const email = u.email ?? "";
  const tierMeta = (u.user_metadata?.tier as AuthUser["tier"] | undefined) ?? "solo";
  return {
    name: (u.user_metadata?.full_name as string) || email.split("@")[0] || "User",
    email,
    role: devEmails().has(email.toLowerCase()) ? "developer" : "user",
    tier: tierMeta,
  };
}

const DEVELOPER_CREDENTIALS = {
  email: "dev@skerry.io",
  password: "skerry-dev-2024",
};

const DEMO_USERS: Record<string, { password: string; user: AuthUser }> = {
  "solo@skerry.io": {
    password: "solo123",
    user: { name: "Solo User", email: "solo@skerry.io", role: "user", tier: "solo" },
  },
  "team@skerry.io": {
    password: "team123",
    user: { name: "Team User", email: "team@skerry.io", role: "user", tier: "team" },
  },
  "agency@skerry.io": {
    password: "agency123",
    user: { name: "Agency User", email: "agency@skerry.io", role: "user", tier: "agency" },
  },
};

interface AuthStore {
  authMode: AuthMode | null;
  isAuthenticated: boolean;
  user: AuthUser | null;
  hydrated: boolean;
  hydrateFromSession: () => Promise<void>;
  onSupabaseAuthChange: (session: { user: SupabaseUser } | null) => void;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      authMode: null,
      isAuthenticated: false,
      user: null,
      hydrated: false,

      hydrateFromSession: async () => {
        if (isSupabaseConfigured && supabaseBrowser) {
          const { data } = await supabaseBrowser.auth.getSession();
          if (data.session?.user) {
            set({
              authMode: "supabase",
              isAuthenticated: true,
              user: mapSupabaseUser(data.session.user),
              hydrated: true,
            });
            return;
          }
        }
        set({ hydrated: true });
      },

      onSupabaseAuthChange: (session) => {
        if (session?.user) {
          set({
            authMode: "supabase",
            isAuthenticated: true,
            user: mapSupabaseUser(session.user),
          });
          return;
        }
        if (get().authMode === "supabase") {
          set({ isAuthenticated: false, user: null, authMode: null });
        }
      },

      login: async (email, password) => {
        await new Promise((r) => setTimeout(r, 200));

        if (isSupabaseConfigured && supabaseBrowser) {
          const { data, error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
          if (error) {
            return { success: false, error: error.message };
          }
          if (data.user) {
            set({
              authMode: "supabase",
              isAuthenticated: true,
              user: mapSupabaseUser(data.user),
            });
            return { success: true };
          }
          return { success: false, error: "Login failed." };
        }

        if (email === DEVELOPER_CREDENTIALS.email && password === DEVELOPER_CREDENTIALS.password) {
          set({
            authMode: "demo",
            isAuthenticated: true,
            user: {
              name: "Developer",
              email: DEVELOPER_CREDENTIALS.email,
              role: "developer",
              tier: "agency",
            },
          });
          return { success: true };
        }

        const match = DEMO_USERS[email];
        if (match && match.password === password) {
          set({ authMode: "demo", isAuthenticated: true, user: match.user });
          return { success: true };
        }

        return { success: false, error: "Invalid email or password." };
      },

      logout: async () => {
        if (supabaseBrowser) {
          await supabaseBrowser.auth.signOut();
        }
        useWorkspaceStore.getState().reset();
        set({ isAuthenticated: false, user: null, authMode: null });
      },

      getAccessToken: async () => {
        const mode = get().authMode;
        if (mode === "demo") {
          return "demo";
        }
        if (supabaseBrowser) {
          const { data } = await supabaseBrowser.auth.getSession();
          return data.session?.access_token ?? null;
        }
        return null;
      },
    }),
    {
      name: "skerry-auth",
      partialize: (s) => ({
        isAuthenticated: s.isAuthenticated,
        user: s.user,
        authMode: s.authMode,
      }),
    },
  ),
);
