import { cn } from "./cn";

export interface BadgeProps {
  label: string;
  tone?: "neutral" | "accent" | "danger";
  className?: string;
  "data-testid"?: string;
}

const tones: Record<NonNullable<BadgeProps["tone"]>, string> = {
  neutral: "bg-muted text-foreground",
  accent: "bg-accent text-accent-foreground",
  danger: "bg-destructive text-destructive-foreground",
};

export function Badge({ label, tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      data-testid={props["data-testid"]}
      className={cn(
        "inline-flex items-center rounded-md px-sm py-1 text-sm font-semibold",
        tones[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
