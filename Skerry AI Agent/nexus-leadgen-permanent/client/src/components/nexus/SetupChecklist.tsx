/**
 * Operator setup checklist from GET /api/setup/status (no secrets exposed).
 * Dependencies: skerryApi. Env: VITE_API_BASE.
 */

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { setupStatus, type SetupStatusResponse } from "@/lib/skerryApi";
import { isSupabaseConfigured } from "@/lib/supabaseBrowser";

const ROWS: { key: keyof NonNullable<SetupStatusResponse["services"]>; label: string; hint: string }[] = [
  { key: "supabase", label: "Supabase (DB + Auth)", hint: "SUPABASE_URL + service role on server; anon + URL in Vite." },
  { key: "openai", label: "OpenAI", hint: "OPENAI_API_KEY on API server for leads + email." },
  { key: "apifyLeadsEnabled", label: "Apify lead discovery (flag)", hint: "FEATURE_APIFY_LEADS=true + APIFY_*." },
  { key: "apify", label: "Apify actor configured", hint: "APIFY_API_KEY + APIFY_LEADS_ACTOR_ID." },
  { key: "resend", label: "Resend email send", hint: "RESEND_API_KEY + SKERRY_FROM_EMAIL." },
  { key: "neverbounce", label: "NeverBounce (optional)", hint: "NEVERBOUNCE_API_KEY for verify." },
  { key: "stripe", label: "Stripe billing", hint: "STRIPE_SECRET_KEY + webhook + price IDs." },
];

export function SetupChecklist() {
  const [data, setData] = useState<SetupStatusResponse | null>(null);

  useEffect(() => {
    void setupStatus().then(setData);
  }, []);

  if (!data?.services) return null;

  const done =
    data.services.supabase &&
    data.services.openai &&
    data.services.resend &&
    isSupabaseConfigured;

  if (done) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-xs">
      <div className="mb-2 font-semibold text-amber-200">Setup checklist</div>
      <ul className="space-y-1.5 text-foreground/80">
        {ROWS.map((row) => {
          const ok = Boolean(data.services[row.key]);
          return (
            <li key={row.key} className="flex items-start gap-2">
              {ok ? (
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
              ) : (
                <Circle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span>
                <span className={ok ? "text-muted-foreground" : "text-foreground"}>{row.label}</span>
                {!ok && <span className="ml-1 text-muted-foreground">— {row.hint}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <a
        href="https://supabase.com/docs"
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
      >
        Supabase docs <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}
