import { cn } from "./cn";

export interface BadgeProps {
  label: string;
  tone?: "neutral" | "accent" | "danger" | "strong" | "stable" | "review" | "weak";
  className?: string;
  "data-testid"?: string;
}

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "border border-border bg-surface text-secondary",
  accent: "border border-status-strong-border bg-status-strong-bg text-status-strong",
  danger: "border border-status-weak-border bg-status-weak-bg text-status-weak",
  strong: "border border-status-strong-border bg-status-strong-bg text-status-strong",
  stable: "border border-status-stable-border bg-status-stable-bg text-status-stable",
  review: "border border-status-review-border bg-status-review-bg text-status-review",
  weak: "border border-status-weak-border bg-status-weak-bg text-status-weak",
};

export function Badge({ label, tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      data-testid={props["data-testid"]}
      className={cn(
        "inline-flex items-center rounded-full px-sm py-xs text-label-sm font-semibold",
        tones[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
