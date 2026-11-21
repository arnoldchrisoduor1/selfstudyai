import type { ReactNode } from "react";

import { cn } from "./cn";

export interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "primary" | "accent" | "warning";
  className?: string;
  "data-testid"?: string;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  className,
  ...props
}: StatCardProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-11 flex-col gap-xs overflow-hidden rounded-lg border border-primary/30 bg-card p-md",
        "transition-[border-color,box-shadow] duration-200 hover:border-primary/60 hover:shadow-sm",
        className,
      )}
      data-testid={props["data-testid"]}
    >
      <div className="flex items-start justify-between gap-sm pl-sm">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon ? (
          <span
            aria-hidden="true"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-primary [&_svg]:h-4 [&_svg]:w-4"
          >
            {icon}
          </span>
        ) : null}
      </div>
      <span className="font-heading pl-sm text-2xl font-semibold tracking-tight text-foreground tabular-nums">
        {value}
      </span>
      {hint ? <span className="pl-sm text-sm text-muted-foreground">{hint}</span> : null}
    </div>
  );
}
