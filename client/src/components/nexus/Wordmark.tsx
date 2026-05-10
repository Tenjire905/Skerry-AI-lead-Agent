import { cn } from "@/lib/utils";

interface WordmarkProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /**
   * Hide the "LeadGen" middle word at narrow widths so the wordmark
   * stays readable in tight nav rails. Result on mobile: "Skerry ⬡S".
   */
  collapseOnMobile?: boolean;
}

const SIZE_TO_TEXT = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-2xl",
  xl: "text-4xl sm:text-5xl",
} as const;

/**
 * Skerry brand wordmark — "Skerry LeadGen ⬡S".
 *
 * The hexagon logo replaces the "O" in "OS" so the product name reads as
 * one cohesive shape rather than icon-plus-text. The icon scales with
 * the parent font-size via 1em sizing.
 */
export function Wordmark({
  size = "md",
  className,
  collapseOnMobile = false,
}: WordmarkProps) {
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-x-1.5 font-semibold tracking-tight text-foreground",
        SIZE_TO_TEXT[size],
        className
      )}
    >
      <span>Skerry</span>
      <span className={cn(collapseOnMobile && "hidden sm:inline")}>
        LeadGen
      </span>
      <span className="inline-flex items-baseline">
        <img
          src="/logo.png"
          alt=""
          aria-hidden="true"
          className="h-[1em] w-[1em] translate-y-[0.18em] select-none"
          width={32}
          height={32}
        />
        <span>S</span>
      </span>
    </span>
  );
}
