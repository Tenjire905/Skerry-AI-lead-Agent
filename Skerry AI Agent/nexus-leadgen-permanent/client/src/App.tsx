import { useEffect } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useAuthStore } from "@/store/authStore";

const router = getRouter();

function App() {
  useEffect(() => {
    void useAuthStore.getState().hydrateFromSession();
    if (!supabaseBrowser) return;
    const { data } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      useAuthStore.getState().onSupabaseAuthChange(session?.user ? { user: session.user } : null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <RouterProvider router={router} />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
