import { useState, useEffect } from "react";

interface Props {
  variant?: "primary" | "compact";
  ctaLabel?: string;
}

interface SubmitResult {
  ok: boolean;
  position?: number;
  alreadyOnList?: boolean;
  message?: string;
}

export default function WaitlistForm({
  variant = "primary",
  ctaLabel = "Join the waitlist",
}: Props) {
  const [email, setEmail] = useState("");
  const [hp, setHp] = useState(""); // honeypot
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle"
  );
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [utm, setUtm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const captured: Record<string, string> = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign"]) {
      const v = params.get(k);
      if (v) captured[k] = v;
    }
    setUtm(captured);
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setResult(null);
    try {
      const resp = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          company_website: hp,
          ...utm,
          referrer:
            typeof document !== "undefined" ? document.referrer : undefined,
        }),
      });
      const json = (await resp.json()) as SubmitResult;
      if (!resp.ok || !json.ok) {
        setStatus("error");
        setResult({ ok: false, message: json.message ?? "Something went wrong." });
        return;
      }
      setStatus("ok");
      setResult(json);
    } catch {
      setStatus("error");
      setResult({ ok: false, message: "Network error. Try again?" });
    }
  }

  if (status === "ok" && result?.ok) {
    return (
      <div className="panel p-6 text-center">
        <div className="eyebrow">You're in</div>
        <div className="mt-2 text-3xl font-semibold text-white">
          #{result.position}
        </div>
        <p className="mt-2 text-sm text-slate-300">
          {result.alreadyOnList
            ? "You were already on the list — good thing we double-check."
            : "Confirmation email on the way."}
        </p>
        <a
          href={`/founding?email=${encodeURIComponent(email)}`}
          className="btn-primary mt-5"
        >
          Skip the queue — €19 founding spot →
        </a>
        <p className="mt-3 text-xs text-slate-400">
          Refundable. 50% off lifetime when we open.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        variant === "primary"
          ? "panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:p-2"
          : "flex flex-col gap-2 sm:flex-row"
      }
      noValidate
    >
      <input
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === "loading"}
        className="flex-1 rounded-md bg-transparent px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:ring-2 focus:ring-brand-400/50"
        aria-label="Email address"
      />
      {/* Honeypot — visually hidden, real users never see/touch it. */}
      <input
        type="text"
        name="company_website"
        tabIndex={-1}
        autoComplete="off"
        value={hp}
        onChange={(e) => setHp(e.target.value)}
        className="absolute left-[-10000px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />
      <button
        type="submit"
        className="btn-primary whitespace-nowrap"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Joining…" : ctaLabel}
      </button>
      {status === "error" && (
        <div
          role="alert"
          className="text-xs text-amber-300 sm:absolute sm:-bottom-6 sm:left-3"
        >
          {result?.message ?? "Couldn't join — try again."}
        </div>
      )}
    </form>
  );
}
