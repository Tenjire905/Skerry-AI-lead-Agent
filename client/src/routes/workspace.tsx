import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Globe, User, Target, Sparkles, ChevronRight } from "lucide-react";
import { useLeadStore } from "@/store/leadStore";
import { StepProgress } from "@/components/nexus/StepProgress";
import { LeadCard } from "@/components/nexus/LeadCard";
import { ForgeEmailEditor } from "@/components/nexus/ForgeEmailEditor";
import { useT, type TranslationKey } from "@/lib/i18n";

export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [
      { title: "Leads — Skerry" },
      {
        name: "description",
        content:
          "Lead workspace: profile, GPT-4 intelligence, and newsletter forge in one view.",
      },
      { property: "og:title", content: "Leads — Skerry" },
      { property: "og:description", content: "Unified lead workspace." },
    ],
  }),
  component: WorkspacePage,
});

const tabs: {
  id: "site" | "bio" | "strategy";
  labelKey: TranslationKey;
  icon: typeof Globe;
}[] = [
  { id: "site", labelKey: "workspace.tab.site", icon: Globe },
  { id: "bio", labelKey: "workspace.tab.bio", icon: User },
  { id: "strategy", labelKey: "workspace.tab.strategy", icon: Target },
];
type TabId = (typeof tabs)[number]["id"];

function WorkspacePage() {
  const { leads, selectedId, select, pushToInstantly } = useLeadStore();
  const lead = leads.find(l => l.id === selectedId) ?? leads[0];
  const t = useT();

  if (!lead) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/20">
          <Sparkles className="h-6 w-6 text-cyan-300" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">
          No leads in your workspace yet
        </h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Click{" "}
          <span className="font-medium text-foreground">
            &ldquo;Find New Leads&rdquo;
          </span>{" "}
          in the header. Your AI-discovered prospects will appear here with full
          intelligence and an editable email draft.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {t("workspace.eyebrow")}
        </span>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="text-gradient-cyber">
              {t("workspace.titleAccent")}
            </span>{" "}
            <span className="text-foreground/90">
              {lead.personal.firstName} {lead.personal.lastName}
            </span>
          </h1>
          <div className="flex flex-wrap gap-2">
            {leads.map(l => {
              const active = l.id === selectedId;
              return (
                <button
                  key={l.id}
                  onClick={() => select(l.id)}
                  className={`group flex items-center gap-2 rounded-md px-3 py-1.5 text-xs ring-1 transition ${
                    active
                      ? "bg-white/10 text-foreground ring-cyan-300/40"
                      : "bg-white/5 text-muted-foreground ring-white/10 hover:text-foreground"
                  }`}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-300/10 text-[10px] font-semibold text-cyan-100 ring-1 ring-white/10">
                    {l.personal.firstName[0]}
                  </span>
                  {l.personal.firstName} · {l.organization.name}
                  {active && <ChevronRight className="h-3 w-3 text-cyan-300" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <StepProgress stage={lead.stage} />

      <AnimatePresence mode="wait">
        <motion.div
          key={lead.id}
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="grid grid-cols-12 gap-6"
        >
          {/* LEAD CARD — cols 1-4 */}
          <LeadCard lead={lead} />

          {/* INTELLIGENCE — cols 5-8 */}
          <IntelligenceCenter lead={lead} />

          {/* NEWSLETTER FORGE — cols 9-12 */}
          <ForgeEmailEditor
            lead={lead}
            onPush={() => {
              pushToInstantly(lead.id);
              toast.success(t("workspace.toast.pushed"), {
                description: `${lead.personal.firstName} ${lead.personal.lastName} → Instantly.ai`,
              });
            }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
/* ----------------------------- IntelligenceCenter ---------------------------- */

function IntelligenceCenter({
  lead,
}: {
  lead: ReturnType<typeof useLeadStore.getState>["leads"][number];
}) {
  const [tab, setTab] = useState<TabId>("site");
  const t = useT();
  return (
    <motion.div
      layout
      className="col-span-12 lg:col-span-4 relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {t("workspace.intel.eyebrow")}
          </div>
          <div className="mt-1 text-sm font-semibold">
            {t("workspace.intel.title")}
          </div>
        </div>
        <Sparkles className="h-4 w-4 text-cyan-300" />
      </div>

      <div className="mt-4 flex gap-1 rounded-lg bg-black/20 p-1 ring-1 ring-white/5">
        {tabs.map(tabDef => {
          const Icon = tabDef.icon;
          const active = tab === tabDef.id;
          return (
            <button
              key={tabDef.id}
              onClick={() => setTab(tabDef.id)}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] transition ${
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3 w-3" />
              {t(tabDef.labelKey)}
              {active && (
                <motion.span
                  layoutId="intel-pill"
                  className="absolute inset-0 -z-10 rounded-md bg-white/8 ring-1 ring-cyan-300/30"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="relative mt-4 max-h-[420px] min-h-[280px] overflow-y-auto pr-1">
        <AnimatePresence mode="wait">
          {tab === "site" && (
            <motion.div
              key="site"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-3 text-sm leading-relaxed text-foreground/85"
            >
              {lead.extraction.websiteContext.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </motion.div>
          )}
          {tab === "bio" && (
            <motion.div
              key="bio"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="text-sm leading-relaxed text-foreground/85"
            >
              <p>{lead.extraction.personContext}</p>
            </motion.div>
          )}
          {tab === "strategy" && (
            <motion.div
              key="strategy"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-2.5"
            >
              {lead.extraction.uniqueAngles.map((a, i) => (
                <div
                  key={i}
                  className="group flex items-start gap-3 rounded-lg bg-white/[0.03] p-3 ring-1 ring-white/5 transition hover:ring-cyan-300/30 hover:shadow-[0_0_24px_-10px_oklch(0.78_0.18_220_/_0.5)]"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-300/15 text-[10px] font-semibold text-cyan-200 ring-1 ring-cyan-300/30">
                    0{i + 1}
                  </span>
                  <div className="text-sm font-medium text-foreground/90">
                    {a}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
