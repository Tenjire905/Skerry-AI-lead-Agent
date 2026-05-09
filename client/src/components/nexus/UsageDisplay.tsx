import { Progress } from "@/components/ui/progress";

export interface UsageDisplayProps {
  runsUsed: number;
  monthlyLimit: number;
  estimatedSpendUsd?: number;
  /** Pct over which a warning copy appears. Defaults to 80. */
  warnAtPct?: number;
  /** Optional label override for the headline ("Monthly Usage"). */
  label?: string;
  className?: string;
}

/**
 * Shared monthly-runs / spend display. Used both in the lead-research modal
 * and on the dashboard so the user sees a consistent surface.
 *
 * Pure presentation — no store reads, all state is passed in.
 */
export function UsageDisplay({
  runsUsed,
  monthlyLimit,
  estimatedSpendUsd,
  warnAtPct = 80,
  label = "Monthly Usage",
  className,
}: UsageDisplayProps) {
  const safeLimit = monthlyLimit > 0 ? monthlyLimit : 1;
  const pct = Math.min(100, Math.round((runsUsed / safeLimit) * 100));
  const overWarn = pct >= warnAtPct;

  return (
    <div data-testid="usage-display" className={className}>
      <div className="mb-1.5 flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground">{label}</span>
        <span data-testid="usage-display-runs" className="text-foreground">
          {runsUsed} / {monthlyLimit} runs
        </span>
      </div>
      <Progress
        value={pct}
        className="h-1.5"
        data-testid="usage-display-progress"
      />
      {overWarn && (
        <p
          data-testid="usage-display-warning"
          role="status"
          className="mt-1 text-[11px] text-amber-400"
        >
          ⚠ Approaching monthly limit. Consider upgrading.
        </p>
      )}
      {typeof estimatedSpendUsd === "number" && (
        <p
          data-testid="usage-display-spend"
          className="mt-1 text-[11px] text-muted-foreground"
        >
          Estimated spend this month: ${estimatedSpendUsd.toFixed(2)}
        </p>
      )}
    </div>
  );
}
