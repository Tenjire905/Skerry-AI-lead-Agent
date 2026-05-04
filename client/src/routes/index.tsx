import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Telescope,
  BrainCircuit,
  FileText,
  Send,
  ArrowUpRight,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Search,
} from "lucide-react";
import { useLeadStore, type Lead, type PipelineStage } from "@/store/leadStore";
import { useT, type TranslationKey } from "@/lib/i18n";
import { useAccountTierStore } from "@/store/accountTierStore";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pulse — Skerry" },
      {
        name: "description",
        content:
          "Live operational dashboard for the Asset-Based Cold Outreach System.",
      },
      { property: "og:title", content: "Pulse — Skerry" },
      { property: "og:description", content: "Live operational dashboard." },
    ],
  }),
  component: PulseDashboard,
});

const stageMeta: Record<
  PipelineStage,
  { labelKey: TranslationKey; tone: string; Icon: typeof Loader2 }
> = {
  source: {
    labelKey: "pulse.stage.scraping",
    tone: "text-cyan-300",
    Icon: Loader2,
  },
  analyze: {
    labelKey: "pulse.stage.analyzing",
    tone: "text-blue-300",
    Icon: BrainCircuit,
  },
  draft: {
    labelKey: "pulse.stage.generating",
    tone: "text-sky-300",
    Icon: Sparkles,
  },
  send: {
    labelKey: "pulse.stage.done",
    tone: "text-emerald-300",
    Icon: CheckCircle2,
  },
};

function PulseDashboard() {
  const t = useT();
  const tier = useAccountTierStore(s => s.tier);
  const leads = useLeadStore(s => s.leads);
  const stats = useLeadStore(s => s.stats)();

  const isEmpty = leads.length === 0;

  const cards: {
    labelKey: TranslationKey;
    value: number;
    metric: string;
    icon: typeof Telescope;
    accent: string;
  }[] = [
    {
      labelKey: "pulse.stat.scanned",
      value: stats.total,
      metric:
        stats.withVerifiedEmail > 0
          ? `${stats.withVerifiedEmail} with email`
          : "no leads yet",
      icon: Telescope,
      accent: "from-blue-400/30 to-cyan-300/10",
    },
    {
      labelKey: "pulse.stat.insights",
      value: stats.insightsGenerated,
      metric: stats.insightsGenerated > 0 ? "AI-extracted" : "—",
      icon: BrainCircuit,
      accent: "from-cyan-400/30 to-blue-300/10",
    },
    {
      labelKey: "pulse.stat.newsletters",
      value: stats.emailsReady,
      metric: stats.emailsReady > 0 ? "ready to send" : "—",
      icon: FileText,
      accent: "from-sky-400/30 to-cyan-300/10",
    },
    {
      labelKey: "pulse.stat.pushed",
      value: stats.sent,
      metric: stats.sent > 0 ? "dispatched" : "—",
      icon: Send,
      accent: "from-emerald-400/30 to-cyan-300/10",
    },
  ];

  const liveFeed: Lead[] = leads.slice(-8).reverse();

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl glass-strong p-8">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-300/10 blur-3xl" />
        <div className="relative flex flex-col gap-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-1 w-1 rounded-full bg-cyan-300" />
            {t("pulse.eyebrow")}
          </span>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            <span className="text-gradient-cyber">
              {t("pulse.titleAccent")}
            </span>{" "}
            <span className="text-foreground/90">{t("pulse.titleRest")}</span>
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t("pulse.subtitle")}
          </p>
        </div>
      </section>

      {/* Stats — always rendered, default to 0 */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c, i) => {
          const Icon = c.icon;
          const label = t(c.labelKey);
          return (
            <motion.div
              key={c.labelKey}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.4, ease: "easeOut" }}
              whileHover={{ y: -2 }}
              className="group relative overflow-hidden rounded-xl glass p-5 transition hover:shadow-[0_0_40px_-12px_oklch(0.78_0.18_220_/_0.5)]"
            >
              <div
                className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${c.accent} blur-2xl opacity-70`}
              />
              <div className="relative flex items-center justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                  <Icon className="h-4 w-4 text-cyan-300" />
                </div>
              </div>
              <div className="relative mt-6">
                <div className="text-3xl font-semibold tracking-tight">
                  {c.value.toLocaleString()}
                </div>
                <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                  {label}
                </div>
                <div className="mt-2 text-xs text-cyan-300/80">{c.metric}</div>
              </div>
            </motion.div>
          );
        })}
      </section>

      {/* Live feed + side panel */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl glass p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">
                {t("pulse.feed.title")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("pulse.feed.subtitle")}
              </p>
            </div>
            {!isEmpty && (
              <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-300 opacity-70" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-cyan-300" />
                </span>
                {t("pulse.feed.streaming")}
              </span>
            )}
          </div>

          {isEmpty ? (
            <EmptyFeed />
          ) : (
            <ol className="relative mt-6 space-y-2 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-gradient-to-b before:from-cyan-300/40 before:via-white/10 before:to-transparent">
              {liveFeed.map((lead, i) => {
                const meta = stageMeta[lead.stage];
                const Icon = meta.Icon;
                const animate = lead.stage !== "send";
                return (
                  <motion.li
                    key={lead.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i, duration: 0.35 }}
                    className="group relative flex items-start gap-4 rounded-lg px-3 py-3 transition hover:bg-white/[0.03]"
                  >
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0a0a0c] ring-1 ring-white/10">
                      <Icon
                        className={`h-3.5 w-3.5 ${meta.tone} ${animate ? "animate-spin [animation-duration:3s]" : ""}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="text-sm font-medium text-foreground">
                          {lead.personal.firstName} {lead.personal.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {lead.personal.title} · {lead.organization.name}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[11px]">
                        <span className={meta.tone}>{t(meta.labelKey)}</span>
                        <span className="text-muted-foreground/60">·</span>
                        <span className="text-muted-foreground/70 truncate">
                          {lead.organization.website}
                        </span>
                        {lead.personal.email && (
                          <>
                            <span className="text-muted-foreground/60">·</span>
                            <span className="text-emerald-300/80 truncate">
                              {lead.personal.email}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Link
                      to="/workspace"
                      className="opacity-0 transition group-hover:opacity-100 hover:opacity-100 text-cyan-300 hover:text-cyan-200"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </motion.li>
                );
              })}
            </ol>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-xl glass p-6">
            <h3 className="text-sm font-semibold">
              {t("pulse.integrity.title")}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("pulse.integrity.subtitle")}
            </p>
            <div className="mt-5 space-y-3">
              {(
                [
                  { labelKey: "pulse.integrity.apify", pct: isEmpty ? 0 : 98 },
                  {
                    labelKey: "pulse.integrity.scraping",
                    pct: isEmpty ? 0 : 92,
                  },
                  { labelKey: "pulse.integrity.gpt", pct: isEmpty ? 0 : 96 },
                  {
                    labelKey: "pulse.integrity.instantly",
                    pct: isEmpty ? 0 : 88,
                  },
                ] as const
              ).map(b => (
                <div key={b.labelKey}>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">
                      {t(b.labelKey)}
                    </span>
                    <span className="text-foreground">{b.pct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-400 to-cyan-300 transition-all"
                      style={{ width: `${b.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl glass p-6">
            <div className="absolute -bottom-12 -right-10 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl" />
            <h3 className="text-sm font-semibold">{t("pulse.focus.title")}</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {isEmpty
                ? "No leads yet. Click “Find New Leads” in the header to start."
                : `${stats.emailsReady} email${stats.emailsReady === 1 ? "" : "s"} ready, ${stats.sent} sent.`}
            </p>
            <Link
              to={isEmpty ? "/" : "/workspace"}
              className="mt-5 inline-flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-xs font-medium text-foreground ring-1 ring-white/10 transition hover:bg-white/10"
            >
              {isEmpty ? "Open the workspace" : t("pulse.focus.cta")}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {tier === "team" && !isEmpty && (
            <div className="relative overflow-hidden rounded-xl glass p-6">
              <div className="absolute -bottom-12 -right-10 h-40 w-40 rounded-full bg-blue-400/20 blur-3xl" />
              <h3 className="text-sm font-semibold">Team Activity</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Shared pipeline with team members
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Team members</span>
                  <span className="text-foreground">3 active</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Leads shared</span>
                  <span className="text-foreground">{stats.total}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function EmptyFeed() {
  return (
    <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-12 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/20">
        <Search className="h-5 w-5 text-cyan-300" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">No leads yet</h3>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">
        Click{" "}
        <span className="font-medium text-foreground">
          &ldquo;Find New Leads&rdquo;
        </span>{" "}
        in the header to start a research run. AI will discover, enrich, and
        surface verified prospects here in real time.
      </p>
      <div className="mt-3 flex items-center gap-2 text-[11px] text-muted-foreground">
        <AlertTriangle className="h-3 w-3 text-amber-300" />
        <span>All counters above stay at 0 until your first run.</span>
      </div>
    </div>
  );
}
