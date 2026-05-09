import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, Loader2, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import type { Lead } from "@/store/leadStore";
import { useLeadStore } from "@/store/leadStore";
import { useT } from "@/lib/i18n";

interface ForgeEmailEditorProps {
  lead: Lead;
  onPush: () => void;
  /** Override push behavior for tests; defaults to a 1.4s simulated send. */
  pushDelayMs?: number;
}

export function ForgeEmailEditor({
  lead,
  onPush,
  pushDelayMs = 1400,
}: ForgeEmailEditorProps) {
  const updateLeadEmail = useLeadStore(s => s.updateLeadEmail);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    lead.pushedToInstantly ? "sent" : "idle"
  );
  const [isEditing, setIsEditing] = useState(false);
  const [editedBody, setEditedBody] = useState(lead.newsletter.body);
  const t = useT();

  // Reset local state when the selected lead changes.
  useEffect(() => {
    setEditedBody(lead.newsletter.body);
    setStatus(lead.pushedToInstantly ? "sent" : "idle");
    setIsEditing(false);
  }, [lead.id, lead.newsletter.body, lead.pushedToInstantly]);

  const handleToggleEdit = () => {
    if (isEditing) {
      // Persist the edit to the store on Done.
      if (editedBody !== lead.newsletter.body) {
        updateLeadEmail(lead.id, editedBody);
      }
    }
    setIsEditing(prev => !prev);
  };

  const handlePush = async () => {
    if (!lead.personal.email) {
      setStatus("error");
      toast.error(t("workspace.forge.cannotPush"), {
        description: t("workspace.forge.cannotPushDesc"),
      });
      return;
    }
    setStatus("sending");
    if (pushDelayMs > 0) {
      await new Promise(r => setTimeout(r, pushDelayMs));
    }
    setStatus("sent");
    onPush();
  };

  return (
    <motion.div
      layout
      data-testid="forge-email-editor"
      className="col-span-12 lg:col-span-4 relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
    >
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            {t("workspace.forge.eyebrow")}
          </div>
          <div className="mt-0.5 text-sm font-semibold">
            {lead.newsletter.title}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleEdit}
            data-testid="forge-edit-toggle"
            className="inline-flex items-center gap-1.5 rounded-md bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/10 transition"
          >
            {isEditing ? "Done" : "Edit"}
          </button>
          <button
            onClick={handlePush}
            disabled={status === "sending"}
            data-testid="forge-push-button"
            className="group inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-blue-500 to-cyan-400 px-3 py-1.5 text-[11px] font-semibold text-[#03101a] shadow-[0_0_24px_-8px_oklch(0.78_0.18_220_/_0.7)] transition hover:scale-[1.03] disabled:opacity-60 disabled:hover:scale-100"
          >
            <AnimatePresence mode="wait" initial={false}>
              {status === "idle" && (
                <motion.span
                  key="i"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Send className="h-3 w-3" /> {t("workspace.forge.sync")}
                </motion.span>
              )}
              {status === "sending" && (
                <motion.span
                  key="s"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <Loader2 className="h-3 w-3 animate-spin" />{" "}
                  {t("workspace.forge.pushing")}
                </motion.span>
              )}
              {status === "sent" && (
                <motion.span
                  key="d"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <CheckCircle2 className="h-3 w-3" />{" "}
                  {t("workspace.forge.synced")}
                </motion.span>
              )}
              {status === "error" && (
                <motion.span
                  key="e"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5"
                >
                  <AlertTriangle className="h-3 w-3" />{" "}
                  {t("workspace.forge.missingEmail")}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 text-xs text-muted-foreground">
        {lead.newsletter.subheading}
      </div>

      {isEditing ? (
        <textarea
          data-testid="forge-email-textarea"
          value={editedBody}
          onChange={e => setEditedBody(e.target.value)}
          className="w-full px-5 py-4 pb-6 max-h-[460px] overflow-y-auto bg-white/5 border-none text-sm text-foreground/85 focus:outline-none focus:ring-0 resize-none"
        />
      ) : (
        <article
          data-testid="forge-email-preview"
          className="prose prose-invert max-w-none px-5 pb-6 pt-2 max-h-[460px] overflow-y-auto prose-headings:tracking-tight prose-h1:text-2xl prose-h1:font-semibold prose-h1:bg-gradient-to-r prose-h1:from-blue-300 prose-h1:to-cyan-200 prose-h1:bg-clip-text prose-h1:text-transparent prose-h2:text-xs prose-h2:uppercase prose-h2:tracking-[0.18em] prose-h2:text-cyan-200/90 prose-p:text-sm prose-p:text-foreground/85 prose-strong:text-cyan-200 prose-blockquote:border-l-cyan-300/40 prose-blockquote:text-foreground/70 prose-blockquote:text-sm prose-hr:border-white/5"
        >
          <ReactMarkdown>{editedBody}</ReactMarkdown>
        </article>
      )}
    </motion.div>
  );
}
