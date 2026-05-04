import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hexagon, ArrowRight, Check, Users, Rocket, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    businessDescription: "",
    idealCustomer: "",
    problemSolved: "",
    accountTier: "solo" as "solo" | "team" | "agency",
  });

  const handleNext = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      localStorage.setItem("skerry-onboarding-profile", JSON.stringify(profile));
      localStorage.setItem("skerry-account-tier", profile.accountTier);
      onComplete();
    }
  };

  const tiers = [
    { id: "solo", name: "Solo", icon: Rocket, desc: "Single user, up to 50 leads/run" },
    { id: "team", name: "Startup Team", icon: Users, desc: "Multi-user, up to 500 leads/run" },
    { id: "agency", name: "Agency / Enterprise", icon: Building2, desc: "Client workspaces, unlimited leads" },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050505]">
      <div className="fixed inset-0 grid-bg opacity-40 pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-2xl px-6"
      >
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/30 to-cyan-300/10 ring-1 ring-cyan-300/30">
            <Hexagon className="h-8 w-8 text-cyan-300" strokeWidth={2} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Welcome to <span className="text-gradient-cyber">Skerry</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Let's set up your autopilot for lead generation.
          </p>
        </div>

        <div className="glass-strong rounded-3xl p-8 shadow-2xl">
          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="business" className="text-sm font-medium text-foreground/90">What does your business do?</Label>
                    <Textarea 
                      id="business"
                      placeholder="e.g. We provide AI-driven marketing automation for e-commerce brands."
                      className="min-h-[100px] bg-white/5 border-white/10 focus:border-cyan-300/50 transition-all"
                      value={profile.businessDescription}
                      onChange={(e) => setProfile({ ...profile, businessDescription: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer" className="text-sm font-medium text-foreground/90">Who is your ideal customer?</Label>
                    <Textarea 
                      id="customer"
                      placeholder="e.g. SaaS founders in the US with 10–50 employees."
                      className="min-h-[100px] bg-white/5 border-white/10 focus:border-cyan-300/50 transition-all"
                      value={profile.idealCustomer}
                      onChange={(e) => setProfile({ ...profile, idealCustomer: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="problem" className="text-sm font-medium text-foreground/90">What problem do you solve for them?</Label>
                    <Textarea 
                      id="problem"
                      placeholder="e.g. We help them reduce customer acquisition costs by 40% using automated outreach."
                      className="min-h-[100px] bg-white/5 border-white/10 focus:border-cyan-300/50 transition-all"
                      value={profile.problemSolved}
                      onChange={(e) => setProfile({ ...profile, problemSolved: e.target.value })}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleNext}
                  disabled={!profile.businessDescription || !profile.idealCustomer || !profile.problemSolved}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
                >
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-foreground/90 text-center block">Select your account type</Label>
                  <div className="grid grid-cols-1 gap-4">
                    {tiers.map((tier) => {
                      const Icon = tier.icon;
                      const active = profile.accountTier === tier.id;
                      return (
                        <button
                          key={tier.id}
                          onClick={() => setProfile({ ...profile, accountTier: tier.id as any })}
                          className={`relative flex items-center gap-4 rounded-2xl p-4 text-left transition-all ring-1 ${
                            active 
                              ? "bg-cyan-500/10 ring-cyan-300/50 shadow-[0_0_20px_-5px_oklch(0.78_0.18_220_/_0.3)]" 
                              : "bg-white/5 ring-white/10 hover:bg-white/10"
                          }`}
                        >
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${active ? "bg-cyan-500/20 text-cyan-300" : "bg-white/5 text-muted-foreground"}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-white">{tier.name}</div>
                            <div className="text-xs text-muted-foreground">{tier.desc}</div>
                          </div>
                          {active && (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500 text-[#03101a]">
                              <Check className="h-4 w-4 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Button 
                  onClick={handleNext}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
                >
                  Start Finding Leads <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="mt-8 flex justify-center gap-2">
          {[1, 2].map((i) => (
            <div 
              key={i} 
              className={`h-1.5 rounded-full transition-all duration-300 ${step === i ? "w-8 bg-cyan-400" : "w-1.5 bg-white/10"}`} 
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
