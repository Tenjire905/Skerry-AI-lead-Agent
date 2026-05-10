import { motion } from "framer-motion";
import {
  Mail,
  Linkedin,
  Building2,
  Globe,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import type { Lead } from "@/store/leadStore";
import { useT } from "@/lib/i18n";

interface LeadCardProps {
  lead: Lead;
  onSelect?: (id: string) => void;
}

export function LeadCard({ lead, onSelect }: LeadCardProps) {
  const hasEmail = !!lead.personal.email;
  const t = useT();

  const Wrapper: React.ElementType = onSelect ? "button" : "div";
  const wrapperProps = onSelect
    ? {
        onClick: () => onSelect(lead.id),
        type: "button" as const,
        "data-testid": "lead-card",
      }
    : { "data-testid": "lead-card" };

  return (
    <motion.div
      layout
      className="col-span-12 lg:col-span-4 relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl"
    >
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-violet-400/15 blur-3xl" />

      <Wrapper
        className="relative flex w-full items-center gap-4 text-left"
        {...wrapperProps}
      >
        <div className="relative">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/40 to-violet-300/20 text-base font-semibold text-violet-100 ring-1 ring-violet-300/30">
            {lead.personal.firstName[0]}
            {lead.personal.lastName[0]}
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#0a0a0c]" />
        </div>
        <div className="min-w-0">
          <div className="text-lg font-semibold tracking-tight">
            {lead.personal.firstName} {lead.personal.lastName}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {lead.personal.title}
          </div>
        </div>
      </Wrapper>

      <div className="relative mt-6 space-y-2.5">
        <Row
          icon={Building2}
          label={t("workspace.org")}
          value={lead.organization.name}
        />
        <Row
          icon={Globe}
          label={t("workspace.website")}
          value={lead.organization.website.replace(/^https?:\/\//, "")}
          href={lead.organization.website}
        />
        <Row
          icon={Linkedin}
          label={t("workspace.linkedin")}
          value={t("workspace.linkedinView")}
          href={lead.personal.linkedin}
        />
        <Row
          icon={Mail}
          label={t("workspace.email")}
          value={lead.personal.email ?? t("workspace.emailMissing")}
          muted={!hasEmail}
          href={hasEmail ? `mailto:${lead.personal.email}` : undefined}
        />
      </div>

      <div className="relative mt-5">
        {hasEmail ? (
          <span
            data-testid="lead-card-verified"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-300/10 px-2.5 py-1 text-[10px] font-medium text-emerald-200 ring-1 ring-emerald-300/20"
          >
            <ShieldCheck className="h-3 w-3" /> {t("workspace.verifiedEmail")}
          </span>
        ) : (
          <span
            data-testid="lead-card-missing-contact"
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-300/10 px-2.5 py-1 text-[10px] font-medium text-amber-200 ring-1 ring-amber-300/20"
          >
            <AlertTriangle className="h-3 w-3" />{" "}
            {t("workspace.missingContact")}
          </span>
        )}
      </div>
    </motion.div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  href,
  muted,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  href?: string;
  muted?: boolean;
}) {
  const content = (
    <>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5 ring-1 ring-white/10">
        <Icon className="h-3.5 w-3.5 text-violet-300" />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div
          className={`truncate text-sm ${muted ? "text-amber-300" : "text-foreground/90"}`}
        >
          {value}
        </div>
      </div>
    </>
  );
  return href ? (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-white/[0.04]"
    >
      {content}
    </a>
  ) : (
    <div className="flex items-center gap-3 p-2">{content}</div>
  );
}
