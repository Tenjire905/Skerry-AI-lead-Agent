import { Outlet } from "@tanstack/react-router";
import { Activity, User, LogOut, Code2, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AppSidebar } from "./AppSidebar";
import { Onboarding } from "./Onboarding";
import { LoginPage } from "./LoginPage";
import { FindLeadsModal } from "./FindLeadsModal";
import { useT } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAccountTierStore } from "@/store/accountTierStore";
import { useAuthStore } from "@/store/authStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";

export function Shell() {
  const t = useT();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFindLeads, setShowFindLeads] = useState(false);
  const tier = useAccountTierStore(s => s.tier);
  const setTier = useAccountTierStore(s => s.setTier);
  const initializeTier = useAccountTierStore(s => s.initializeFromLocalStorage);
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isHydrating = useAuthStore(s => s.isHydrating);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const hydrateSession = useAuthStore(s => s.hydrateSession);

  useEffect(() => {
    void hydrateSession();
  }, [hydrateSession]);

  useEffect(() => {
    if (isAuthenticated) {
      const profile = localStorage.getItem("skerry-onboarding-profile");
      if (!profile) {
        setShowOnboarding(true);
      }
      initializeTier();
      if (user?.tier) {
        setTier(user.tier);
      }
    }
  }, [isAuthenticated, initializeTier, setTier, user?.tier]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    initializeTier();
  };

  if (isHydrating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Restoring secure session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  if (showOnboarding && user?.role !== "developer") {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const tierColors: Record<string, string> = {
    solo: "border-slate-500/30 text-slate-400 bg-slate-500/5",
    team: "border-blue-500/30 text-blue-400 bg-blue-500/5",
    agency: "border-cyan-500/30 text-cyan-400 bg-cyan-500/5",
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <SidebarProvider>
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-40 z-0" />
      <div className="relative z-10 flex min-h-screen w-full text-foreground">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-white/5 bg-[#050505]/70 px-5 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
              <div className="hidden h-6 w-px bg-white/10 md:block" />
              <div className="hidden flex-col leading-none md:flex">
                <span className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  {t("shell.eyebrow")}
                </span>
                <span className="text-xs font-medium text-foreground/90">
                  {t("shell.title")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-muted-foreground sm:flex">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                </span>
                {t("shell.systemNominal")}
              </div>

              <button
                onClick={() => setShowFindLeads(true)}
                className="flex items-center gap-2 rounded-md bg-gradient-to-r from-blue-500 to-cyan-400 px-3.5 py-1.5 text-xs font-semibold text-[#03101a] shadow-[0_0_30px_-8px_oklch(0.78_0.18_220_/_0.8)] transition hover:scale-[1.02] active:scale-[0.98]"
              >
                <Activity className="h-3.5 w-3.5" />
                Find New Leads
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 pl-2 border-l border-white/10 hover:opacity-80 transition">
                    <div className="hidden flex-col items-end leading-none sm:flex">
                      <span className="text-[10px] font-medium text-foreground">
                        {user?.name ?? "User"}
                      </span>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge
                          variant="outline"
                          className={`h-4 px-1 text-[8px] uppercase tracking-wider ${tierColors[tier] ?? tierColors.solo}`}
                        >
                          {tier}
                        </Badge>
                        {user?.role === "developer" && (
                          <Badge
                            variant="outline"
                            className="h-4 px-1 text-[8px] uppercase tracking-wider border-purple-500/30 text-purple-400 bg-purple-500/5"
                          >
                            dev
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Avatar className="h-8 w-8 border border-white/10 ring-1 ring-white/5">
                      <AvatarFallback className="bg-gradient-to-br from-blue-600/30 to-cyan-400/20 text-[10px] font-semibold text-cyan-300">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 bg-[#0a1628] border-white/10"
                >
                  <div className="px-2 py-1.5">
                    <p className="text-xs font-medium text-foreground">
                      {user?.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                  <DropdownMenuSeparator className="bg-white/5" />
                  {user?.role === "developer" && (
                    <DropdownMenuItem
                      onClick={() => {
                        localStorage.removeItem("skerry-onboarding-profile");
                        window.location.reload();
                      }}
                      className="text-xs text-purple-400 hover:text-purple-300 cursor-pointer"
                    >
                      <Code2 className="mr-2 h-3.5 w-3.5" />
                      Reset Onboarding
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="text-xs cursor-pointer">
                      <Settings className="mr-2 h-3.5 w-3.5" />
                      Settings & API Keys
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-white/5" />
                  <DropdownMenuItem
                    onClick={logout}
                    className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-3.5 w-3.5" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main className="flex-1 px-6 py-8">
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster />
      <FindLeadsModal
        open={showFindLeads}
        onClose={() => setShowFindLeads(false)}
      />
    </SidebarProvider>
  );
}
