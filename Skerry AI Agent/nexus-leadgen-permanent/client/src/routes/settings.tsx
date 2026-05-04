import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Languages,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Code2,
  CreditCard,
} from "lucide-react";
import { useT, useLanguageStore, type Language } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { useAccountTierStore } from "@/store/accountTierStore";
import { TIER_CONFIGS } from "@/store/researchStore";
import { Progress } from "@/components/ui/progress";
import { apiConfig, hasApiKey } from "@/lib/apiConfig";
import { setupStatus, createCheckoutSession, type SetupStatusResponse } from "@/lib/skerryApi";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Skerry" },
      { name: "description", content: "Manage account, plan, and preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const t = useT();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);
  const tier = useAccountTierStore((s) => s.tier);
  const setTier = useAccountTierStore((s) => s.setTier);
  const config = TIER_CONFIGS[tier];
  const user = useAuthStore((s) => s.user);
  const isDeveloper = user?.role === "developer";
  const workspaceId = useWorkspaceStore((s) => s.currentId);
  const [serverSetup, setServerSetup] = useState<SetupStatusResponse | null>(null);

  useEffect(() => {
    void setupStatus().then(setServerSetup);
  }, []);

  const handleResetOnboarding = () => {
    localStorage.removeItem("skerry-onboarding-profile");
    localStorage.removeItem("skerry-account-tier");
    window.location.reload();
  };

  const usagePct = Math.round((config.usedThisMonth / config.monthlyLimit) * 100);

  const services: Array<{
    name: string;
    service: "openai" | "apify" | "instantly" | "neverbounce" | "resend";
    description: string;
    customerLabel: string;
    serverKey?: keyof NonNullable<SetupStatusResponse["services"]>;
  }> = [
    {
      name: "AI Generation",
      service: "openai",
      description: "Lead intelligence + email writing",
      customerLabel: "AI engine",
      serverKey: "openai",
    },
    {
      name: "Web Scraping",
      service: "apify",
      description: "LinkedIn + company website discovery (Apify actor)",
      customerLabel: "Data sourcing",
      serverKey: "apify",
    },
    {
      name: "Email Verification",
      service: "neverbounce",
      description: "Verify email deliverability before send",
      customerLabel: "Email verification",
      serverKey: "neverbounce",
    },
    {
      name: "Email Sending",
      service: "resend",
      description: "Outbound email delivery",
      customerLabel: "Email delivery",
      serverKey: "resend",
    },
    {
      name: "Cadence",
      service: "instantly",
      description: "Cold-email sequence orchestration",
      customerLabel: "Sequence engine",
    },
  ];

  const checkout = async (plan: "solo" | "team" | "agency") => {
    if (!workspaceId) {
      toast.error("Select a workspace first.");
      return;
    }
    const res = await createCheckoutSession({ workspaceId, plan });
    if (!res.ok || !res.url) {
      toast.error("Checkout unavailable", { description: res.error });
      return;
    }
    window.location.href = res.url;
  };

  return (
    <div className="space-y-10 max-w-4xl">
      <div>
        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {t("settings.eyebrow.integrations")}
        </span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          AI <span className="text-gradient-cyber">Services</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {isDeveloper
            ? "Provider-paid services. Keys live in .env at the project root. Customers never see this surface."
            : "Skerry runs every external service for you. Your subscription covers AI, scraping, verification, and delivery."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {services.map((s) => {
          const serverOk =
            s.serverKey && serverSetup?.services ? Boolean(serverSetup.services[s.serverKey]) : null;
          const ok = serverOk !== null ? serverOk : hasApiKey(s.service);
          return (
            <div key={s.service} className="flex items-center gap-4 rounded-xl glass p-4">
              <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${ok ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
                {ok ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {isDeveloper ? s.name : s.customerLabel}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${ok ? "bg-emerald-500/10 text-emerald-300" : "bg-amber-500/10 text-amber-300"}`}>
                    {ok ? "Connected" : "Not configured"}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{s.description}</p>
                {isDeveloper && s.service !== "instantly" && (
                  <div className="mt-2 inline-flex items-center gap-2 rounded-md bg-black/30 px-2.5 py-1 ring-1 ring-white/5">
                    <KeyRound className="h-3 w-3 text-muted-foreground" />
                    <code className="font-mono text-[11px] text-foreground/70">
                      {hasApiKey(s.service)
                        ? `${apiConfig[s.service].slice(0, 8)}…${apiConfig[s.service].slice(-4)}`
                        : serverOk !== null
                          ? serverOk
                            ? "server OK"
                            : "server missing"
                          : "(empty)"}
                    </code>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!isDeveloper && (
        <div className="flex items-start gap-3 rounded-xl glass p-4 ring-1 ring-cyan-500/15">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-300" />
          <div className="text-xs text-foreground/80">
            <div className="font-semibold text-foreground">All AI services are managed by Skerry.</div>
            <div className="mt-0.5 text-muted-foreground">
              Your subscription covers OpenAI, web scraping, email verification, and delivery. No keys to manage, no rate-limit surprises.
            </div>
          </div>
        </div>
      )}

      {isDeveloper && (
        <div className="flex items-start gap-3 rounded-xl glass p-4 ring-1 ring-purple-500/20">
          <Code2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-300" />
          <div className="text-xs text-foreground/80">
            <div className="font-semibold text-foreground">Developer view</div>
            <div className="mt-0.5 text-muted-foreground">
              Production keys must live on the API server (no <code className="font-mono">VITE_*</code> for OpenAI).
              See <code className="font-mono">.env.example</code>. Legacy VITE keys are for local UI debugging only.
            </div>
          </div>
        </div>
      )}

      <div className="pt-4 border-t border-white/5">
        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Billing</span>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Stripe Checkout</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Opens a hosted checkout session for the selected plan. Requires server{" "}
          <code className="font-mono">STRIPE_SECRET_KEY</code> and price IDs.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["solo", "team", "agency"] as const).map((p) => (
            <Button
              key={p}
              type="button"
              onClick={() => void checkout(p)}
              className="inline-flex items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-xs font-medium ring-1 ring-white/10 hover:bg-white/10"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Subscribe {p}
            </Button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-white/5">
        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Account</span>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Plan & Usage</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Your current plan determines research depth and monthly lead limits.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {(["solo", "team", "agency"] as const).map((planTier) => {
            const cfg = TIER_CONFIGS[planTier];
            const active = tier === planTier;
            const borderColors = {
              solo: active ? "border-slate-400/40 bg-slate-500/10" : "border-white/10 bg-white/5",
              team: active ? "border-blue-400/40 bg-blue-500/10" : "border-white/10 bg-white/5",
              agency: active ? "border-cyan-400/40 bg-cyan-500/10" : "border-white/10 bg-white/5",
            };
            const labelColors = { solo: "text-slate-300", team: "text-blue-300", agency: "text-cyan-300" };
            return (
              <button
                key={planTier}
                onClick={() => setTier(planTier)}
                className={`rounded-xl border p-4 text-left transition ${borderColors[planTier]}`}
              >
                <div className={`text-sm font-semibold capitalize ${labelColors[planTier]}`}>{planTier}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{cfg.label}</div>
                <div className="mt-2 text-[11px] text-foreground/60">{cfg.monthlyLimit} leads/mo</div>
                {active && (
                  <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" /> Active
                  </div>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-4 rounded-xl glass p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Monthly Usage ({config.label})</span>
            <span className="text-foreground">{config.usedThisMonth} / {config.monthlyLimit} runs</span>
          </div>
          <Progress value={usagePct} className="h-1.5" />
          <p className="mt-2 text-[11px] text-muted-foreground">{config.description}</p>
        </div>
      </div>

      <div className="pt-2 border-t border-white/5">
        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {t("settings.eyebrow.preferences")}
        </span>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{t("settings.title.language")}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("settings.language.subtitle")}</p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-xl glass p-2">
          <Languages className="ml-2 h-4 w-4 text-cyan-300" />
          {(["en", "de"] as const).map((lang) => {
            const active = language === lang;
            return (
              <button
                key={lang}
                type="button"
                onClick={() => setLanguage(lang as Language)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${active ? "bg-cyan-300/15 text-cyan-100 ring-1 ring-cyan-300/30" : "text-muted-foreground hover:text-foreground"}`}
              >
                {lang === "en" ? t("settings.language.en") : t("settings.language.de")}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-2 border-t border-white/5">
        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">System</span>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Onboarding</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Reset your business profile and account tier selection.
        </p>
        <Button
          onClick={handleResetOnboarding}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition ring-1 ring-white/10"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Onboarding
        </Button>
      </div>
    </div>
  );
}

// Unused import kept for visual consistency in case Sparkles is used in section icons later
void Sparkles;
