import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  authLogin,
  authLogout,
  authSession,
  type AuthUser,
} from "@/lib/skerryApi";

export type UserRole = "user" | "developer";

interface AuthStore {
  isAuthenticated: boolean;
  isHydrating: boolean;
  user: AuthUser | null;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  hydrateSession: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    set => ({
      isAuthenticated: false,
      isHydrating: true,
      user: null,
      login: async (email, password) => {
        const response = await authLogin(email, password);
        if (!response.ok || !response.user) {
          return { success: false, error: response.error ?? "Login failed." };
        }
        set({ isAuthenticated: true, user: response.user });
        return { success: true };
      },
      logout: () => {
        void authLogout();
        set({ isAuthenticated: false, user: null });
      },
      hydrateSession: async () => {
        set({ isHydrating: true });
        const response = await authSession();
        if (response.ok && response.user) {
          set({
            isAuthenticated: true,
            user: response.user,
            isHydrating: false,
          });
          return;
        }
        set({ isAuthenticated: false, user: null, isHydrating: false });
      },
    }),
    {
      name: "skerry-auth",
      partialize: s => ({
        isAuthenticated: s.isAuthenticated,
        user: s.user,
      }),
    }
  )
);
