import { create } from "zustand";
import { persist } from "zustand/middleware";

export type UserRole = "user" | "developer";

interface AuthUser {
  name: string;
  email: string;
  role: UserRole;
  tier: "solo" | "team" | "agency";
}

interface AuthStore {
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

// Developer credentials (in production these would be server-side)
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

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      login: async (email, password) => {
        await new Promise((r) => setTimeout(r, 600));

        if (
          email === DEVELOPER_CREDENTIALS.email &&
          password === DEVELOPER_CREDENTIALS.password
        ) {
          set({
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
          set({ isAuthenticated: true, user: match.user });
          return { success: true };
        }

        return { success: false, error: "Invalid email or password." };
      },
      logout: () => {
        set({ isAuthenticated: false, user: null });
      },
    }),
    {
      name: "skerry-auth",
      partialize: (s) => ({
        isAuthenticated: s.isAuthenticated,
        user: s.user,
      }),
    }
  )
);
