import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Zap, CheckCircle2, Loader2, ChevronRight,
  Users, Building2, TrendingUp, Lock
} from "lucide-react";
import { useResearchStore, TIER_CONFIGS } from "@/store/researchStore";
import { useAccountTierStore, AccountTier } from "@/store/accountTierStore";
import { useLeadStore } from "@/store/leadStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { discoverLeadsApi } from "@/lib/skerryApi";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

interface FindLeadsModalProps {
  open: boolean;
  onClose: () => void;
}

export function FindLeadsModal({ open, onClose }: FindLeadsModalProps) {
  const navigate = useNavigate();
  const tier = useAccountTierStore((s) => s.tier);
  const { status, steps, leadsFoundCount, startResearch, reset, setLeadsFoundCount } = useResearchStore();
  const pushLeadsFromApi = useLeadStore((s) => s.pushLeadsFromApi);
  const currentWorkspaceId = useWorkspaceStore((s) => s.currentId);
  const config = TIER_CONFIGS[tier];

  const [phase, setPhase] = useState<"confirm" | "running" | "done">("confirm");

  // Get onboarding profile for context
  const profile = (() => {
    try {
      const raw = localStorage.getItem("skerry-onboarding-profile");
      if (!raw) return null;
      return JSON.parse(raw) as {
        businessDescription?: string;
        idealCustomer?: string;
        problemSolved?: string;
        accountTier?: string;
      };
    } catch {
      return null;
    }
  })();

  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        reset();
        setPhase("confirm");
      }, 300);
    }
  }, [open, reset]);

  useEffect(() => {
    if (status === "complete") setPhase("done");
  }, [status]);

  const handleStart = async () => {
    setPhase("running");
    const businessDescription =
      profile?.businessDescription?.trim() || "B2B SaaS — describe your business in onboarding.";
    const targetAudience =
      profile?.idealCustomer?.trim() || "Define your ICP in onboarding or the ICP Builder.";
    const targetCount = Math.min(config.maxLeadsPerRun, 50);

    const researchPromise = startResearch(tier, `${businessDescription} ${targetAudience}`);

    const result = await discoverLeadsApi({
      workspaceId: currentWorkspaceId ?? undefined,
      tier,
      count: targetCount,
      businessDescription,
      targetAudience,
      enrichWithOpenAI: tier === "agency",
    });

    await researchPromise;

    if (!result.ok || !result.leads?.length) {
      toast.error("Lead discovery failed", {
        description:
          result.message ??
          result.error ??
          "Configure server OPENAI_API_KEY and/or Apify (FEATURE_APIFY_LEADS). Demo API needs SKERRY_ALLOW_DEMO_AUTH=true and Bearer demo.",
      });
      useResearchStore.setState({ status: "error", errorMessage: result.code ?? result.error ?? "failed" });
      setLeadsFoundCount(0);
      setPhase("confirm");
      return;
    }

    pushLeadsFromApi(result.leads);
    setLeadsFoundCount(result.leads.length);
  };

  const handleDone = () => {
    if (leadsFoundCount > 0) {
      toast.success(`${leadsFoundCount} new leads added to your pipeline!`);
      onClose();
      // Navigate so the user immediately sees the leads they just generated.
      navigate({ to: "/workspace" });
      return;
    }
    onClose();
  };

  const completedSteps = steps.filter((s) => s.status === "done").length;
  const progressPct = steps.length > 0 ? (completedSteps / steps.length) * 100 : 0;

  const tierColors: Record<AccountTier, string> = {
    solo: "from-slate-500 to-slate-400",
    team: "from-blue-600 to-blue-400",
    agency: "from-blue-600 to-cyan-400",
  };

  const tierBadgeColors: Record<AccountTier, string> = {
    solo: "border-slate-500/30 text-slate-400 bg-slate-500/5",
    team: "border-blue-500/30 text-blue-400 bg-blue-500/5",
    agency: "border-cyan-500/30 text-cyan-400 bg-cyan-500/5",
  };

  const usagePct = Math.round((config.usedThisMonth / config.monthlyLimit) * 100);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={phase !== "running" ? onClose : undefined}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#080f1a] shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br ${tierColors[tier]}`}>
                    <Zap className="h-4 w-4 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Find New Leads</h2>
                    <p className="text-[11px] text-muted-foreground">{config.label}</p>
                  </div>
                </div>
                {phase !== "running" && (
                  <button
                    onClick={onClose}
                    className="rounded-md p-1.5 text-muted-foreground hover:bg-white/5 hover:text-foreground transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="p-6">
                {/* PHASE: Confirm */}
                {phase === "confirm" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                    {/* Tier info */}
                    <div className={`rounded-xl border px-4 py-3 ${tierBadgeColors[tier]}`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider">{tier} Plan — {config.label}</span>
                        <span className="text-[11px]">{config.maxLeadsPerRun} leads/run</span>
                      </div>
                      <p className="mt-1 text-[11px] opacity-80">{config.description}</p>
                    </div>

                    {/* Research steps preview */}
                    <div>
                      <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Research Pipeline</p>
                      <div className="space-y-1.5">
                        {config.steps.map((step, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <ChevronRight className="h-3 w-3 text-cyan-500/50" />
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Monthly usage */}
                    <div>
                      <div className="mb-1.5 flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Monthly Usage</span>
                        <span className="text-foreground">{config.usedThisMonth} / {config.monthlyLimit} runs</span>
                      </div>
                      <Progress value={usagePct} className="h-1.5" />
                      {usagePct > 80 && (
                        <p className="mt-1 text-[11px] text-amber-400">
                          ⚠ Approaching monthly limit. Consider upgrading.
                        </p>
                      )}
                    </div>

                    {/* Business context */}
                    {profile && (
                      <div className="rounded-lg bg-white/5 px-3 py-2.5 text-xs">
                        <p className="text-muted-foreground mb-1">Using your business context:</p>
                        <p className="text-foreground line-clamp-2">{profile.businessDescription ?? "Not set"}</p>
                      </div>
                    )}

                    {/* API key warning */}
                    {!currentWorkspaceId && (
                      <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5 text-xs text-amber-400">
                        <Lock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                        <span>
                          No workspace selected — leads will run in demo mode (not saved to the cloud). Sign in with
                          Supabase or open Setup to finish configuration.
                        </span>
                      </div>
                    )}

                    <Button
                      onClick={handleStart}
                      className={`w-full h-11 bg-gradient-to-r ${tierColors[tier]} text-white font-semibold shadow-lg transition-all hover:scale-[1.01]`}
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      Start Research ({config.maxLeadsPerRun} leads max)
                    </Button>
                  </motion.div>
                )}

                {/* PHASE: Running */}
                {phase === "running" && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
                      <div>
                        <p className="text-sm font-medium text-foreground">Research in progress…</p>
                        <p className="text-[11px] text-muted-foreground">
                          {completedSteps} of {steps.length} steps complete
                        </p>
                      </div>
                    </div>

                    <Progress value={progressPct} className="h-1.5" />

                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {steps.map((step) => (
                        <motion.div
                          key={step.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className={`flex items-start gap-3 rounded-lg px-3 py-2.5 text-xs transition ${
                            step.status === "running"
                              ? "bg-cyan-500/10 border border-cyan-500/20"
                              : step.status === "done"
                                ? "bg-white/5"
                                : "opacity-40"
                          }`}
                        >
                          <div className="mt-0.5 flex-shrink-0">
                            {step.status === "done" ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                            ) : step.status === "running" ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />
                            ) : (
                              <div className="h-3.5 w-3.5 rounded-full border border-white/20" />
                            )}
                          </div>
                          <div className="flex-1">
                            <span className={step.status === "running" ? "text-cyan-300" : "text-foreground/80"}>
                              {step.label}
                            </span>
                            {step.detail && (
                              <span className="ml-2 text-muted-foreground">{step.detail}</span>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* PHASE: Done */}
                {phase === "done" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-5 text-center"
                  >
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">Research Complete</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {leadsFoundCount} new leads added to your pipeline
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: Users, label: "Leads Found", value: String(leadsFoundCount) },
                        { icon: Building2, label: "Companies", value: String(leadsFoundCount) },
                        { icon: TrendingUp, label: "Avg. Fit Score", value: tier === "agency" ? "87%" : tier === "team" ? "74%" : "61%" },
                      ].map((stat) => (
                        <div key={stat.label} className="rounded-lg bg-white/5 px-3 py-3">
                          <stat.icon className="mx-auto mb-1 h-4 w-4 text-cyan-400" />
                          <p className="text-base font-bold text-foreground">{stat.value}</p>
                          <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                        </div>
                      ))}
                    </div>

                    <Button
                      onClick={handleDone}
                      className="w-full h-11 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold"
                    >
                      View Leads
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
