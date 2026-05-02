import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Mail,
  Linkedin,
  Building2,
  Globe,
  ShieldCheck,
  AlertTriangle,
  User,
  Target,
  Send,
  Loader2,
  CheckCircle2,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { useLeadStore } from "@/store/leadStore";
import { StepProgress } from "@/components/nexus/StepProgress";
import { useT, type TranslationKey } from "@/lib/i18n";

export const Route = createFileRoute("/workspace")({
  head: () => ({
    meta: [
      { title: "Leads — Skerry" },
      { name: "description", content: "Lead workspace: profile, GPT-4 intelligence, and newsletter forge in one view." },
      { property: "og:title", content: "Leads — Skerry" },
      { property: "og:description", content: "Unified lead workspace." },
    ],
  }),
  component: WorkspacePage,
});

const tabs: { id: "site" | "bio" | "strategy"; labelKey: TranslationKey; icon: typeof Globe }[] = [
  { id: "site",     labelKey: "workspace.tab.site",     icon: Globe },
  { id: "bio",      labelKey: "workspace.tab.bio",      icon: User },
  { id: "strategy", labelKey: "workspace.tab.strategy", icon: Target },
];
type TabId = (typeof tabs)[number]["id"];

function WorkspacePage() {
  const { leads, selectedId, select, pushToInstantly } = useLeadStore();
  const lead = leads.find((l) => l.id === selectedId) ?? leads[0];
  const t = useT();

  if (!lead) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-6">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-cyan-500/10 ring-1 ring-cyan-500/20">
          <Sparkles className="h-6 w-6 text-cyan-300" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">No leads in your workspace yet</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Click <span className="font-medium text-foreground">&ldquo;Find New Leads&rdquo;</span> in the header.
          Your AI-discovered prospects will appear here with full intelligence and an editable email draft.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{t("workspace.eyebrow")}</span>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold tracking-tight">
            <span className="text-gradient-cyber">{t("workspace.titleAccent")}</span>{" "}
            <span className="text-foreground/90">{lead.personal.firstName} {lead.personal.lastName}</span>
          </h1>
          <div className="flex flex-wrap gap-2">
            {leads.map((l) => {
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
          <NewsletterForge lead={lead} onPush={() => {
            pushToInstantly(lead.id);
            toast.success(t("workspace.toast.pushed"), {
              description: `${lead.personal.firstName} ${lead.personal.lastName} → Instantly.ai`,
            });
          }} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* --------------------------------- LeadCard --------------------------------- */

function LeadCard({ lead }: { lead: ReturnType<typeof useLeadStore.getState>["leads"][number] }) {
  const hasEmail = !!lead.personal.email;
  const t = useT();
  return (
    <motion.div
      layout
      className="col-span-12 lg:col-span-4 relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
    >
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />

      <div className="relative flex items-center gap-4">
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/40 to-cyan-300/20 text-base font-semibold text-cyan-100 ring-1 ring-cyan-300/30">
            {lead.personal.firstName[0]}{lead.personal.lastName[0]}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#0a0a0c]" />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-semibold tracking-tight">
            {lead.personal.firstName} {lead.personal.lastName}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{lead.personal.title}</div>
        </div>
      </div>

      <div className="relative mt-6 space-y-2.5">
        <Row icon={Building2} label={t("workspace.org")} value={lead.organization.name} />
        <Row icon={Globe} label={t("workspace.website")} value={lead.organization.website.replace(/^https?:\/\//, "")} href={lead.organization.website} />
        <Row icon={Linkedin} label={t("workspace.linkedin")} value={t("workspace.linkedinView")} href={lead.personal.linkedin} />
        <Row icon={Mail} label={t("workspace.email")} value={lead.personal.email ?? t("workspace.emailMissing")} muted={!hasEmail} href={hasEmail ? `mailto:${lead.personal.email}` : undefined} />
      </div>

      <div className="relative mt-5">
        {hasEmail ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-300/10 px-2.5 py-1 text-[10px] font-medium text-emerald-200 ring-1 ring-emerald-300/20">
            <ShieldCheck className="h-3 w-3" /> {t("workspace.verifiedEmail")}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/10 px-2.5 py-1 text-[10px] font-medium text-amber-200 ring-1 ring-amber-300/20">
            <AlertTriangle className="h-3 w-3" /> {t("workspace.missingContact")}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function Row({
  icon: Icon, label, value, href, muted,
}: { icon: typeof Mail; label: string; value: string; href?: string; muted?: boolean }) {
  const content = (
    <>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10">
        <Icon className="h-3.5 w-3.5 text-cyan-300" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={`truncate text-sm ${muted ? "text-amber-300" : "text-foreground/90"}`}>{value}</div>
      </div>
    </>
  );
  return href ? (
    <a href={href} className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-white/[0.04]">{content}</a>
  ) : (
    <div className="flex items-center gap-3 p-2">{content}</div>
  );
}

/* ----------------------------- IntelligenceCenter ---------------------------- */

function IntelligenceCenter({ lead }: { lead: ReturnType<typeof useLeadStore.getState>["leads"][number] }) {
  const [tab, setTab] = useState<TabId>("site");
  const t = useT();
  return (
    <motion.div
      layout
      className="col-span-12 lg:col-span-4 relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{t("workspace.intel.eyebrow")}</div>
          <div className="mt-1 text-sm font-semibold">{t("workspace.intel.title")}</div>
        </div>
        <Sparkles className="h-4 w-4 text-cyan-300" />
      </div>

      <div className="mt-4 flex gap-1 rounded-lg bg-black/20 p-1 ring-1 ring-white/5">
        {tabs.map((tabDef) => {
          const Icon = tabDef.icon;
          const active = tab === tabDef.id;
          return (
            <button
              key={tabDef.id}
              onClick={() => setTab(tabDef.id)}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] transition ${
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
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
            <motion.div key="site" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
              className="space-y-3 text-sm leading-relaxed text-foreground/85">
              {lead.extraction.websiteContext.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
            </motion.div>
          )}
          {tab === "bio" && (
            <motion.div key="bio" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
              className="text-sm leading-relaxed text-foreground/85">
              <p>{lead.extraction.personContext}</p>
            </motion.div>
          )}
          {tab === "strategy" && (
            <motion.div key="strategy" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}
              className="space-y-2.5">
              {lead.extraction.uniqueAngles.map((a, i) => (
                <div key={i} className="group flex items-start gap-3 rounded-lg bg-white/[0.03] p-3 ring-1 ring-white/5 transition hover:ring-cyan-300/30 hover:shadow-[0_0_24px_-10px_oklch(0.78_0.18_220_/_0.5)]">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-300/15 text-[10px] font-semibold text-cyan-200 ring-1 ring-cyan-300/30">
                    0{i + 1}
                  </span>
                  <div className="text-sm font-medium text-foreground/90">{a}</div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ------------------------------ NewsletterForge ----------------------------- */

function NewsletterForge({
  lead,
  onPush,
}: {
  lead: ReturnType<typeof useLeadStore.getState>["leads"][number];
  onPush: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    lead.pushedToInstantly ? "sent" : "idle"
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(lead.newsletter.body);
  const t = useT();

  const handlePush = async () => {
    if (!lead.personal.email) {
      setStatus("error");
      toast.error(t("workspace.forge.cannotPush"), { description: t("workspace.forge.cannotPushDesc") });
      return;
    }
    setStatus("sending");
    await new Promise((r) => setTimeout(r, 1400));
    setStatus("sent");
    onPush();
  };

  return (
    <motion.div
      layout
      className="col-span-12 lg:col-span-4 relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">{t("workspace.forge.eyebrow")}</div>
          <div className="mt-0.5 text-sm font-semibold">{lead.newsletter.title}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition"
          >
            {isEditing ? "Done" : "Edit"}
          </button>
          <button
            onClick={handlePush}
            disabled={status === "sending"}
            className="group inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-blue-500 to-cyan-400 px-3 py-1.5 text-[11px] font-semibold text-[#03101a] shadow-[0_0_24px_-8px_oklch(0.78_0.18_220_/_0.7)] transition hover:scale-[1.03] disabled:opacity-60 disabled:hover:scale-100"
          >
            <AnimatePresence mode="wait" initial={false}>
              {status === "idle" && (
                <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                  <Send className="h-3 w-3" /> {t("workspace.forge.sync")}
                </motion.span>
              )}
              {status === "sending" && (
                <motion.span key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" /> {t("workspace.forge.pushing")}
                </motion.span>
              )}
              {status === "sent" && (
                <motion.span key="d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3 w-3" /> {t("workspace.forge.synced")}
                </motion.span>
              )}
              {status === "error" && (
                <motion.span key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5">
                  <AlertTriangle className="h-3 w-3" /> {t("workspace.forge.missingEmail")}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 text-xs text-muted-foreground">{lead.newsletter.subheading}</div>

      {isEditing ? (
        <textarea
          value={editedBody}
          onChange={(e) => setEditedBody(e.target.value)}
          className="w-full px-5 py-4 pb-6 max-h-[460px] overflow-y-auto bg-white/5 border-none text-sm text-foreground/85 focus:outline-none focus:ring-0 resize-none"
        />
      ) : (
        <article className="prose prose-invert max-w-none px-5 pb-6 pt-2 max-h-[460px] overflow-y-auto prose-headings:tracking-tight prose-h1:text-2xl prose-h1:font-semibold prose-h1:bg-gradient-to-r prose-h1:from-blue-300 prose-h1:to-cyan-200 prose-h1:bg-clip-text prose-h1:text-transparent prose-h2:text-xs prose-h2:uppercase prose-h2:tracking-[0.18em] prose-h2:text-cyan-200/90 prose-p:text-sm prose-p:text-foreground/85 prose-strong:text-cyan-200 prose-blockquote:border-l-cyan-300/40 prose-blockquote:text-foreground/70 prose-blockquote:text-sm prose-hr:border-white/5">
          <ReactMarkdown>{editedBody}</ReactMarkdown>
        </article>
      )}
    </motion.div>
  );
}
