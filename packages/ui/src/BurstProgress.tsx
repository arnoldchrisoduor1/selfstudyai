import { ProgressBar } from "./ProgressBar";
import { cn } from "./cn";

export interface BurstProgressProps {
  current: number;
  total: number;
  className?: string;
  "data-testid"?: string;
}

export function BurstProgress({ current, total, className, ...props }: BurstProgressProps) {
  const safeTotal = Math.max(total, 1);
  const value = Math.round((current / safeTotal) * 100);
  return (
    <div data-testid={props["data-testid"]} className={cn("flex flex-col gap-sm", className)}>
      <p className="text-sm text-muted-foreground">
        Burst progress {current}/{total}
      </p>
      <ProgressBar value={value} />
    </div>
  );
}
