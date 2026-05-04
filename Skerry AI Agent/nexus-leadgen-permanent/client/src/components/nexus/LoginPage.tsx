import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Zap, Lock, Mail, Code2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function LoginPage() {
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devHint, setDevHint] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (!result.success) {
      setError(result.error ?? "Login failed.");
    } else {
      toast.success("Welcome back to Skerry");
    }
  };

  const fillDev = () => {
    setEmail("dev@skerry.io");
    setPassword("skerry-dev-2024");
    setDevHint(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#050505] px-4">
      {/* Background grid */}
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-30" />
      {/* Glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-cyan-500/15 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo / Brand */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-400 shadow-[0_0_40px_-8px_oklch(0.78_0.18_220_/_0.7)]">
            <Zap className="h-7 w-7 text-[#03101a]" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Skerry
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-200">
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="pl-9 bg-white/5 border-white/10 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 pr-10 bg-white/5 border-white/10 focus:border-cyan-500/50 focus:ring-cyan-500/20"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-xs text-red-400"
              >
                {error}
              </motion.p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-semibold shadow-[0_0_30px_-8px_oklch(0.78_0.18_220_/_0.6)] transition-all"
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…</>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 border-t border-white/5 pt-5">
            <p className="mb-3 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
              Demo Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Solo", email: "solo@skerry.io", password: "solo123", color: "text-slate-300" },
                { label: "Team", email: "team@skerry.io", password: "team123", color: "text-blue-300" },
                { label: "Agency", email: "agency@skerry.io", password: "agency123", color: "text-cyan-300" },
              ].map((acc) => (
                <button
                  key={acc.label}
                  type="button"
                  onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-center text-[11px] font-medium transition hover:bg-white/10"
                >
                  <span className={acc.color}>{acc.label}</span>
                  <span className="block text-[10px] text-muted-foreground mt-0.5">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Developer Mode hint */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setDevHint(!devHint)}
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition"
          >
            <Code2 className="h-3 w-3" />
            Developer Mode
          </button>
          {devHint && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 text-xs text-cyan-400"
            >
              <p className="font-mono">dev@skerry.io / skerry-dev-2024</p>
              <button
                type="button"
                onClick={fillDev}
                className="mt-1.5 text-[11px] underline underline-offset-2 hover:text-cyan-300"
              >
                Fill credentials
              </button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
