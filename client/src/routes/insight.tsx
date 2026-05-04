import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Globe, User, Target, Linkedin, Mail, Building2,
  AlertTriangle, ChevronRight, Search,
} from "lucide-react";
import { useLeadStore, type Lead } from "@/store/leadStore";
import { useT, type TranslationKey } from "@/lib/i18n";

export const Route = createFileRoute("/insight")({
  validateSearch: (s: Record<string, unknown>) => ({
    id: typeof s.id === "string" ? s.id : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Insight — Skerry" },
      { name: "description", content: "AI-extracted intelligence per lead." },
    ],
  }),
  component: InsightPage,
});

const tabs: { id: "site" | "bio" | "strategy"; labelKey: TranslationKey; icon: typeof Globe }[] = [
  { id: "site",     labelKey: "insight.tab.site",     icon: Globe },
  { id: "bio",      labelKey: "insight.tab.bio",      icon: User },
  { id: "strategy", labelKey: "insight.tab.strategy", icon: Target },
];
type TabId = (typeof tabs)[number]["id"];

function InsightPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const leads = useLeadStore((s) => s.leads);
  const enriched = leads.filter((l) => l.extraction.websiteContext.length > 0 || l.extraction.uniqueAngles.length > 0);
  const initial = enriched.find((l) => l.id === id) ?? enriched[0];
  const [selectedId, setSelectedId] = useState<string>(initial?.id ?? "");
  const [tab, setTab] = useState<TabId>("site");
  const t = useT();

  useEffect(() => {
    if (initial && selectedId !== initial.id && !enriched.find((l) => l.id === selectedId)) {
      setSelectedId(initial.id);
    }
  }, [initial, selectedId, enriched]);

  if (enriched.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/20">
          <Search className="h-6 w-6 text-cyan-300" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">No insights yet</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Run <span className="font-medium text-foreground">&ldquo;Find New Leads&rdquo;</span> first — once research completes, deep AI intelligence per lead lands here.
        </p>
        <Link
          to="/workspace"
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-xs font-medium text-foreground ring-1 ring-white/10 transition hover:bg-white/10"
        >
          Open workspace
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  const lead: Lead = enriched.find((l) => l.id === selectedId) ?? enriched[0]!;

  return (
    <div className="space-y-8">
      <div>
        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{t("insight.eyebrow")}</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {t("insight.titleA")} <span className="text-gradient-cyber">{t("insight.titleB")}</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("insight.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-xl glass p-3">
          <div className="px-2 pb-2 pt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
            {t("insight.enriched")}
          </div>
          <ul className="space-y-1">
            {enriched.map((l) => {
              const active = l.id === selectedId;
              return (
                <li key={l.id}>
                  <button
                    onClick={() => {
                      setSelectedId(l.id);
                      navigate({ to: "/insight", search: { id: l.id } });
                    }}
                    className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                      active ? "bg-white/5 ring-1 ring-cyan-300/30" : "hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 to-cyan-300/10 text-[11px] font-semibold text-cyan-200 ring-1 ring-white/10">
                      {l.personal.firstName[0]}{l.personal.lastName[0] ?? ""}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{l.personal.firstName} {l.personal.lastName}</div>
                      <div className="truncate text-[11px] text-muted-foreground">{l.organization.name}</div>
                    </div>
                    <ChevronRight className={`h-3.5 w-3.5 transition ${active ? "text-cyan-300" : "text-muted-foreground/40"}`} />
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-xl glass-strong p-6">
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/40 to-cyan-300/20 text-base font-semibold text-cyan-100 ring-1 ring-cyan-300/30">
                    {lead.personal.firstName[0]}{lead.personal.lastName[0] ?? ""}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#0a0a0c]" />
                </div>
                <div>
                  <div className="text-xl font-semibold tracking-tight">{lead.personal.firstName} {lead.personal.lastName}</div>
                  <div className="mt-0.5 text-sm text-muted-foreground">
                    {lead.personal.title} · <span className="text-foreground/80">{lead.organization.name}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {lead.personal.linkedin && (
                  <a href={lead.personal.linkedin} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-xs ring-1 ring-white/10 hover:bg-white/10">
                    <Linkedin className="h-3.5 w-3.5 text-cyan-300" /> LinkedIn
                  </a>
                )}
                {lead.organization.website && (
                  <a href={lead.organization.website.startsWith("http") ? lead.organization.website : `https://${lead.organization.website}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-xs ring-1 ring-white/10 hover:bg-white/10">
                    <Building2 className="h-3.5 w-3.5 text-cyan-300" /> {lead.organization.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
                {lead.personal.email ? (
                  <a href={`mailto:${lead.personal.email}`} className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 ring-1 ring-emerald-500/30 hover:bg-emerald-500/20">
                    <Mail className="h-3.5 w-3.5" /> {lead.personal.email}
                  </a>
                ) : (
                  <span className="flex items-center gap-2 rounded-md bg-amber-300/10 px-3 py-2 text-xs text-amber-200 ring-1 ring-amber-300/30">
                    <AlertTriangle className="h-3.5 w-3.5" /> {t("insight.missingContact")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl glass p-2">
            <div className="flex gap-1">
              {tabs.map((tabDef) => {
                const Icon = tabDef.icon;
                const active = tab === tabDef.id;
                return (
                  <button
                    key={tabDef.id}
                    onClick={() => setTab(tabDef.id)}
                    className={`relative flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm transition ${
                      active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t(tabDef.labelKey)}
                    {active && (
                      <motion.span
                        layoutId="tab-pill"
                        className="absolute inset-0 -z-10 rounded-lg bg-white/5 ring-1 ring-cyan-300/30"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl glass p-6 min-h-[280px]">
            <AnimatePresence mode="wait">
              {tab === "site" && (
                <motion.div key="site" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="space-y-4 text-[15px] leading-relaxed text-foreground/85">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">websiteContext</div>
                  {lead.extraction.websiteContext.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
                </motion.div>
              )}
              {tab === "bio" && (
                <motion.div key="bio" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="space-y-4 text-[15px] leading-relaxed text-foreground/85">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">personContext</div>
                  <p>{lead.extraction.personContext}</p>
                </motion.div>
              )}
              {tab === "strategy" && (
                <motion.div key="strategy" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }} className="space-y-4">
                  <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">uniqueAngles</div>
                  <div className="grid gap-3 md:grid-cols-3">
                    {lead.extraction.uniqueAngles.map((a, i) => (
                      <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                        className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.02] p-5 ring-1 ring-white/10 transition hover:ring-cyan-300/30">
                        <div className="relative flex items-center gap-2">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-300/15 text-[10px] font-semibold text-cyan-200 ring-1 ring-cyan-300/30">
                            0{i + 1}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("insight.angle")}</span>
                        </div>
                        <p className="relative mt-3 text-sm leading-relaxed text-foreground/90">{a}</p>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
