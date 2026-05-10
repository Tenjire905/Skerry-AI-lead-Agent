import { useState } from "react";

interface Props {
  defaultEmail?: string;
}

export default function FoundingDepositCTA({ defaultEmail = "" }: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setError(null);
    try {
      const resp = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = (await resp.json()) as { ok: boolean; url?: string; message?: string };
      if (!resp.ok || !json.ok || !json.url) {
        setStatus("error");
        setError(json.message ?? "Checkout unavailable. Try again in a minute.");
        return;
      }
      window.location.href = json.url;
    } catch {
      setStatus("error");
      setError("Network error. Try again?");
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={status === "loading"}
        className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none focus:border-brand-400/50 focus:ring-2 focus:ring-brand-400/30"
        aria-label="Email for founding spot"
      />
      <button
        type="submit"
        className="btn-primary"
        disabled={status === "loading"}
      >
        {status === "loading" ? "Redirecting…" : "Lock founding spot — €19"}
      </button>
      <p className="text-xs text-slate-400">
        Refundable any time before launch. Charged once via Stripe. Locks 50% off
        lifetime.
      </p>
      {error && (
        <p role="alert" className="text-xs text-amber-300">
          {error}
        </p>
      )}
    </form>
  );
}
