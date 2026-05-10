import { useState } from "react";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2, Lock, Mail, Code2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wordmark } from "@/components/nexus/Wordmark";
import { toast } from "sonner";

export function LoginPage() {
  const login = useAuthStore(s => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isDev = import.meta.env.DEV;

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

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[#050505] px-4">
      {/* Background grid */}
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-30" />
      {/* Glow blobs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-600/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-violet-500/15 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo / Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <img
            src="/logo.png"
            alt="Skerry"
            width={56}
            height={56}
            className="mb-4 h-14 w-14 drop-shadow-[0_0_28px_oklch(0.7_0.22_295_/_0.55)]"
          />
          <Wordmark size="lg" />
          <p className="mt-2 text-sm font-medium text-slate-200">
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 shadow-2xl backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="pl-9 bg-white/5 border-white/10 focus:border-violet-500/50 focus:ring-violet-500/20"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
              >
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-9 pr-10 bg-white/5 border-white/10 focus:border-violet-500/50 focus:ring-violet-500/20"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
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
              className="w-full h-11 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white font-semibold shadow-[0_0_30px_-8px_oklch(0.7_0.22_295_/_0.6)] transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {isDev && (
            <div className="mt-6 border-t border-white/5 pt-5">
              <p className="mb-3 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
                Dev Login Emails
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  {
                    label: "Solo",
                    email: "solo@skerry.io",
                    color: "text-slate-300",
                  },
                  {
                    label: "Team",
                    email: "team@skerry.io",
                    color: "text-violet-300",
                  },
                  {
                    label: "Agency",
                    email: "agency@skerry.io",
                    color: "text-violet-300",
                  },
                ].map(acc => (
                  <button
                    key={acc.label}
                    type="button"
                    onClick={() => setEmail(acc.email)}
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-center text-[11px] font-medium transition hover:bg-white/10"
                  >
                    <span className={acc.color}>{acc.label}</span>
                    <span className="block text-[10px] text-muted-foreground mt-0.5">
                      {acc.email}
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                Passwords are intentionally never displayed in UI.
              </p>
            </div>
          )}
        </div>

        {isDev && (
          <div className="mt-4 text-center">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
              <Code2 className="h-3 w-3" />
              Development mode enabled
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
