import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/billing")({
  component: BillingPage,
});

function BillingPage() {
  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="mb-6 text-4xl font-bold">Billing &amp; Plans</h1>
      <p className="mb-8 text-white/70">
        Hier kommt spaeter das komplette Billing-Dashboard mit aktuellen
        Preisen, Nutzungsstatistiken und Stripe Checkout.
      </p>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-xl font-semibold">Solo</h3>
          <p className="my-4 text-5xl font-bold">$29</p>
          <p className="text-sm text-white/60">pro Monat</p>
        </div>

        <div className="relative rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="absolute -top-3 right-6 rounded-full bg-emerald-500 px-4 py-1 text-xs font-bold text-black">
            POPULAER
          </div>
          <h3 className="text-xl font-semibold">Team</h3>
          <p className="my-4 text-5xl font-bold">$79</p>
          <p className="text-sm text-white/60">pro Monat</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-xl font-semibold">Agency</h3>
          <p className="my-4 text-5xl font-bold">$199</p>
          <p className="text-sm text-white/60">pro Monat</p>
        </div>
      </div>
    </div>
  );
}
