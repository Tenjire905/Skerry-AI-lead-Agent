import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Send, Loader2, CheckCircle2, AlertTriangle, Variable, Copy, Sparkles } from "lucide-react";
import { useLeadStore, type Lead } from "@/store/leadStore";
import { useAuthStore } from "@/store/authStore";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { generateEmailApi, sendEmail } from "@/lib/skerryApi";
import { useT } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/forge")({
  head: () => ({
    meta: [
      { title: "Forge — Skerry" },
      { name: "description", content: "Email forge: variables, preview, and Instantly.ai dispatch." },
      { property: "og:title", content: "Forge — Skerry" },
      { property: "og:description", content: "Compose and dispatch personalized emails." },
    ],
  }),
  component: ForgePage,
});

function buildVars(lead: Lead | undefined) {
  if (!lead) return [];
  return [
    { key: "{{first_name}}", value: lead.personal.firstName },
    { key: "{{last_name}}", value: lead.personal.lastName },
    { key: "{{title}}", value: lead.personal.title },
    { key: "{{org_name}}", value: lead.organization.name },
    { key: "{{org_website}}", value: lead.organization.website },
    { key: "{{linkedin_url}}", value: lead.personal.linkedin },
    { key: "{{email}}", value: lead.personal.email ?? "" },
    { key: "{{unique_angle_1}}", value: lead.extraction.uniqueAngles[0] ?? "" },
  ];
}

type Status = "idle" | "sending" | "sent" | "error";

function ForgePage() {
  const { leads, pushToInstantly, updateLeadEmail } = useLeadStore();
  const user = useAuthStore((s) => s.user);
  const workspaceId = useWorkspaceStore((s) => s.currentId);

  const [localSelectedId, setLocalSelectedId] = useState(leads[0]?.id ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [isEditing, setIsEditing] = useState(false);
  const [editedMd, setEditedMd] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const lead = leads.find((l) => l.id === localSelectedId) ?? leads[0];
  const vars = useMemo(() => buildVars(lead), [lead]);
  const t = useT();

  const currentMd = editedMd || lead?.newsletter?.body || "";

  const handleSelectLead = (id: string) => {
    setLocalSelectedId(id);
    setIsEditing(false);
    setEditedMd("");
  };

  const push = async () => {
    if (!lead || !lead.personal.email) {
      setStatus("error");
      return;
    }
    setStatus("sending");
    const finalMarkdown = editedMd || currentMd;
    if (editedMd) updateLeadEmail(lead.id, editedMd);

    const result = await sendEmail({
      to: lead.personal.email,
      bodyMarkdown: finalMarkdown,
    });

    if (!result.ok) {
      setStatus("error");
      toast.error("Send failed", {
        description: result.error ?? "Server unreachable. Is the API on :3001?",
      });
      setTimeout(() => setStatus("idle"), 3000);
      return;
    }

    pushToInstantly(lead.id);
    setStatus("sent");
    toast.success(
      result.dryRun
        ? `Dry-run sent to ${lead.personal.firstName} (no RESEND_API_KEY in server env)`
        : `Email delivered to ${lead.personal.firstName} ${lead.personal.lastName}`,
      { description: result.id ? `id ${result.id}` : undefined }
    );
    setTimeout(() => setStatus("idle"), 2400);
  };

  const handleGenerateWithAI = async () => {
    if (!lead) return;
    setIsGenerating(true);
    try {
      const profile = (() => {
        try {
          const raw = localStorage.getItem("skerry-onboarding-profile");
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();
      const res = await generateEmailApi({
        workspaceId: workspaceId ?? undefined,
        lead: {
          firstName: lead.personal.firstName,
          lastName: lead.personal.lastName,
          title: lead.personal.title,
          organization: lead.organization,
          websiteContext: lead.extraction.websiteContext,
          personContext: lead.extraction.personContext,
          uniqueAngles: lead.extraction.uniqueAngles,
        },
        businessDescription: profile?.businessDescription ?? "B2B SaaS company",
        senderName: user?.name ?? "Skerry",
      });
      if (!res.ok || !res.markdown) {
        toast.error("AI generation failed", { description: res.error ?? "Server misconfigured?" });
        return;
      }
      setEditedMd(res.markdown);
      setIsEditing(false);
      updateLeadEmail(lead.id, res.markdown);
      toast.success("AI-generated email ready!");
    } catch (err) {
      toast.error("AI generation failed.");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No leads available. Use "Find New Leads" to get started.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{t("forge.eyebrow")}</span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {t("forge.titleA")} <span className="text-gradient-cyber">{t("forge.titleB")}</span>
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("forge.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {leads.slice(0, 8).map((l) => {
            const active = l.id === localSelectedId;
            return (
              <button
                key={l.id}
                onClick={() => handleSelectLead(l.id)}
                className={"rounded-md px-3 py-1.5 text-xs ring-1 transition " + (active ? "bg-white/10 text-foreground ring-cyan-300/40" : "bg-white/5 text-muted-foreground ring-white/10 hover:text-foreground")}
              >
                {l.personal.firstName} · {l.organization.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-xl glass p-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Variable className="h-4 w-4 text-cyan-300" /> {t("forge.variables")}
          </div>
          <ul className="mt-4 space-y-2">
            {vars.map((v) => (
              <li key={v.key} className="group flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2.5 ring-1 ring-white/5">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="truncate font-mono text-[10px] text-cyan-300/80">{v.key}</div>
                  <div className="mt-0.5 truncate text-[11px] text-foreground/70">
                    {v.value ? v.value : <span className="italic text-muted-foreground/50">empty</span>}
                  </div>
                </div>
                <button
                  onClick={() => navigator.clipboard?.writeText(v.key)}
                  className="opacity-0 transition group-hover:opacity-100 text-muted-foreground hover:text-cyan-300"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
          <button
            onClick={handleGenerateWithAI}
            disabled={isGenerating}
            className="mt-5 w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600/20 to-cyan-500/20 border border-cyan-500/20 px-3 py-2.5 text-xs font-medium text-cyan-300 hover:from-blue-600/30 hover:to-cyan-500/30 transition disabled:opacity-50"
          >
            {isGenerating ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5" /> Generate with AI</>
            )}
          </button>
          {!lead.personal.email && (
            <div className="mt-5 flex items-start gap-3 rounded-lg bg-amber-300/10 p-3 ring-1 ring-amber-300/20">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              <div className="text-xs text-amber-100/90">
                <div className="font-medium">{t("forge.missingContact")}</div>
                <div className="mt-0.5 text-amber-100/70">{t("forge.missingContactDesc")}</div>
              </div>
            </div>
          )}
        </aside>

        <div className="rounded-xl glass-strong p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-5 py-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-300" />
              {t("forge.previewLabel")}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setIsEditing(!isEditing); if (!isEditing && !editedMd) setEditedMd(currentMd); }}
                className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition"
              >
                {isEditing ? "Preview" : "Edit"}
              </button>
              <button
                onClick={push}
                disabled={status === "sending" || !lead.personal.email}
                className="group relative inline-flex items-center gap-2 overflow-hidden rounded-md bg-gradient-to-r from-blue-500 to-cyan-400 px-4 py-2 text-xs font-semibold text-[#03101a] shadow-[0_0_30px_-8px_oklch(0.78_0.18_220_/_0.7)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {status === "idle" && (
                    <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <Send className="h-3.5 w-3.5" /> {t("forge.push")}
                    </motion.span>
                  )}
                  {status === "sending" && (
                    <motion.span key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("forge.pushing")}
                    </motion.span>
                  )}
                  {status === "sent" && (
                    <motion.span key="d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {t("forge.injected")}
                    </motion.span>
                  )}
                  {status === "error" && (
                    <motion.span key="e" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5" /> {t("forge.missingEmail")}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            </div>
          </div>
          {isEditing ? (
            <textarea
              value={editedMd || currentMd}
              onChange={(e) => setEditedMd(e.target.value)}
              className="w-full p-8 min-h-[400px] max-h-[600px] overflow-y-auto bg-white/5 border-none text-sm text-foreground/85 focus:outline-none focus:ring-0 resize-none font-mono"
            />
          ) : (
            <article className="prose prose-invert max-w-none p-8 prose-headings:tracking-tight prose-h1:text-3xl prose-h1:font-semibold prose-h1:bg-gradient-to-r prose-h1:from-blue-300 prose-h1:to-cyan-200 prose-h1:bg-clip-text prose-h1:text-transparent prose-h2:text-base prose-h2:uppercase prose-h2:tracking-[0.18em] prose-h2:text-cyan-200/90 prose-p:text-foreground/85 prose-strong:text-cyan-200 prose-blockquote:border-l-cyan-300/40 prose-blockquote:text-foreground/70 prose-hr:border-white/5">
              <ReactMarkdown>{currentMd}</ReactMarkdown>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
