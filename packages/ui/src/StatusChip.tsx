import { cn } from "./cn";

export interface StatusChipProps {
  label: string;
  tone?: "neutral" | "accent" | "danger";
  className?: string;
  "data-testid"?: string;
}

const tones: Record<NonNullable<StatusChipProps["tone"]>, string> = {
  neutral: "bg-muted text-foreground",
  accent: "bg-accent text-accent-foreground",
  danger: "bg-destructive text-destructive-foreground",
};

export function StatusChip({ label, tone = "neutral", className, ...props }: StatusChipProps) {
  return (
    <span
      data-testid={props["data-testid"]}
      className={cn(
        "inline-flex min-h-11 items-center rounded-md px-md text-base font-semibold",
        tones[tone],
        className,
      )}
    >
      {label}
    </span>
  );
}
