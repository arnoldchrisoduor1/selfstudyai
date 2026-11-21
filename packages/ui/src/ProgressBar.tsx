import { cn } from "./cn";

export interface ProgressBarProps {
  value: number;
  label?: string;
  className?: string;
  "data-testid"?: string;
}

export function ProgressBar({ value, label, className, ...props }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("flex flex-col gap-sm", className)} data-testid={props["data-testid"]}>
      {label ? <span className="text-base text-foreground">{label}</span> : null}
      <div
        className="h-2 w-full overflow-hidden rounded-md bg-muted"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
      >
        <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
