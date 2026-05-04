import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/billing')({
  component: BillingPage,
})

function BillingPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-6">Billing & Plans</h1>
      <p className="text-white/70 mb-8">
        Hier kommt später das komplette Billing-Dashboard mit aktuellen Preisen, 
        Nutzungsstatistiken und Stripe Checkout.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="text-xl font-semibold">Solo</h3>
          <p className="text-5xl font-bold my-4">$29</p>
          <p className="text-white/60 text-sm">pro Monat</p>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 relative">
          <div className="absolute -top-3 right-6 bg-emerald-500 text-black text-xs px-4 py-1 rounded-full font-bold">
            POPULÄR
          </div>
          <h3 className="text-xl font-semibold">Team</h3>
          <p className="text-5xl font-bold my-4">$79</p>
          <p className="text-white/60 text-sm">pro Monat</p>
        </div>
        
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="text-xl font-semibold">Agency</h3>
          <p className="text-5xl font-bold my-4">$199</p>
          <p className="text-white/60 text-sm">pro Monat</p>
        </div>
      </div>
    </div>
  )
}
