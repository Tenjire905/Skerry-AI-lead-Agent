/**
 * ICP Builder — edits `icp_profiles` (Supabase) + mirrors to onboarding localStorage for demo.
 * Dependencies: supabaseBrowser, workspace store, UI. Env: VITE_SUPABASE_*.
 */

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Target, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { toast } from "sonner";

export const Route = createFileRoute("/icp")({
  head: () => ({
    meta: [
      { title: "ICP — Skerry" },
      { name: "description", content: "Define your ideal customer profile." },
    ],
  }),
  component: IcpPage,
});

function IcpPage() {
  const currentId = useWorkspaceStore((s) => s.currentId);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessDescription, setBusinessDescription] = useState("");
  const [idealCustomer, setIdealCustomer] = useState("");
  const [problemSolved, setProblemSolved] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (supabaseBrowser && currentId) {
        const { data, error } = await supabaseBrowser
          .from("icp_profiles")
          .select("business_description, ideal_customer, problem_solved")
          .eq("workspace_id", currentId)
          .maybeSingle();
        if (!cancelled && !error && data) {
          setBusinessDescription(data.business_description ?? "");
          setIdealCustomer(data.ideal_customer ?? "");
          setProblemSolved(data.problem_solved ?? "");
          setLoading(false);
          return;
        }
      }
      try {
        const raw = localStorage.getItem("skerry-onboarding-profile");
        if (raw) {
          const p = JSON.parse(raw) as {
            businessDescription?: string;
            idealCustomer?: string;
            problemSolved?: string;
          };
          if (!cancelled) {
            setBusinessDescription(p.businessDescription ?? "");
            setIdealCustomer(p.idealCustomer ?? "");
            setProblemSolved(p.problemSolved ?? "");
          }
        }
      } catch {
        /* ignore */
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentId]);

  const save = async () => {
    setSaving(true);
    try {
      const localProfile = {
        businessDescription,
        idealCustomer,
        problemSolved,
        accountTier: (() => {
          try {
            return JSON.parse(localStorage.getItem("skerry-onboarding-profile") || "{}").accountTier ?? "solo";
          } catch {
            return "solo";
          }
        })(),
      };
      localStorage.setItem("skerry-onboarding-profile", JSON.stringify(localProfile));

      if (supabaseBrowser && currentId) {
        const { error } = await supabaseBrowser
          .from("icp_profiles")
          .update({
            business_description: businessDescription,
            ideal_customer: idealCustomer,
            problem_solved: problemSolved,
          })
          .eq("workspace_id", currentId);
        if (error) throw error;
      }
      toast.success("ICP saved");
    } catch (e) {
      toast.error("Save failed", { description: String(e) });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading ICP…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <span className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Targeting</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Ideal Customer <span className="text-gradient-cyber">Profile</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This context powers lead discovery and email generation. With Supabase enabled, it is stored per workspace.
        </p>
      </div>

      <div className="space-y-6 rounded-2xl glass p-6">
        <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
          <Target className="h-4 w-4" /> Core positioning
        </div>
        <div className="space-y-2">
          <Label>What does your business do?</Label>
          <Textarea
            className="min-h-[100px] bg-white/5 border-white/10"
            value={businessDescription}
            onChange={(e) => setBusinessDescription(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Who is your ideal customer?</Label>
          <Textarea
            className="min-h-[100px] bg-white/5 border-white/10"
            value={idealCustomer}
            onChange={(e) => setIdealCustomer(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>What problem do you solve for them?</Label>
          <Textarea
            className="min-h-[100px] bg-white/5 border-white/10"
            value={problemSolved}
            onChange={(e) => setProblemSolved(e.target.value)}
          />
        </div>
        <Button
          onClick={() => void save()}
          disabled={saving || !businessDescription.trim() || !idealCustomer.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white"
        >
          {saving ? "Saving…" : "Save ICP"}
        </Button>
      </div>
    </div>
  );
}
