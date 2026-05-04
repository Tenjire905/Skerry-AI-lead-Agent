import { Database, BrainCircuit, FileText, Send, Check } from "lucide-react";
import { motion } from "framer-motion";
import type { PipelineStage } from "@/store/leadStore";
import { useT, type TranslationKey } from "@/lib/i18n";

const steps: {
  id: PipelineStage;
  labelKey: TranslationKey;
  subKey: TranslationKey;
  Icon: typeof Database;
}[] = [
  {
    id: "source",
    labelKey: "step.source.label",
    subKey: "step.source.sub",
    Icon: Database,
  },
  {
    id: "analyze",
    labelKey: "step.analyze.label",
    subKey: "step.analyze.sub",
    Icon: BrainCircuit,
  },
  {
    id: "draft",
    labelKey: "step.draft.label",
    subKey: "step.draft.sub",
    Icon: FileText,
  },
  {
    id: "send",
    labelKey: "step.send.label",
    subKey: "step.send.sub",
    Icon: Send,
  },
];

const order: PipelineStage[] = ["source", "analyze", "draft", "send"];

export function StepProgress({ stage }: { stage: PipelineStage }) {
  const currentIdx = order.indexOf(stage);
  const t = useT();
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <div className="flex items-center">
        {steps.map((s, i) => {
          const done = i < currentIdx;
          const active = i === currentIdx;
          const Icon = s.Icon;
          return (
            <div key={s.id} className="flex flex-1 items-center">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <motion.div
                    initial={false}
                    animate={{
                      backgroundColor:
                        done || active
                          ? "oklch(0.78 0.18 220 / 0.18)"
                          : "oklch(1 0 0 / 0.04)",
                      borderColor:
                        done || active
                          ? "oklch(0.78 0.18 220 / 0.5)"
                          : "oklch(1 0 0 / 0.1)",
                    }}
                    className="flex h-9 w-9 items-center justify-center rounded-full border"
                  >
                    {done ? (
                      <Check className="h-4 w-4 text-cyan-300" />
                    ) : (
                      <Icon
                        className={`h-4 w-4 ${active ? "text-cyan-300" : "text-muted-foreground"}`}
                      />
                    )}
                  </motion.div>
                  {active && (
                    <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-cyan-300/30" />
                  )}
                </div>
                <div className="hidden flex-col leading-none sm:flex">
                  <span
                    className={`text-xs font-medium ${done || active ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {t(s.labelKey)}
                  </span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t(s.subKey)}
                  </span>
                </div>
              </div>

              {i < steps.length - 1 && (
                <div className="relative mx-4 h-px flex-1 overflow-hidden bg-white/5">
                  <motion.div
                    initial={false}
                    animate={{
                      width:
                        i < currentIdx
                          ? "100%"
                          : i === currentIdx
                            ? "55%"
                            : "0%",
                    }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-400 to-cyan-300"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
