import { useEffect, useState } from "react";

import { cn } from "./cn";

export interface ProgressRingProps {
  value: number;
  label?: string;
  size?: number;
  className?: string;
  "data-testid"?: string;
}

export function ProgressRing({ value, label, size = 112, className, ...props }: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (clamped / 100) * circumference;
  const [offset, setOffset] = useState(circumference);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setOffset(targetOffset);
      return;
    }
    const id = window.requestAnimationFrame(() => setOffset(targetOffset));
    return () => window.cancelAnimationFrame(id);
  }, [targetOffset]);

  return (
    <div
      className={cn("inline-flex flex-col items-center gap-sm", className)}
      data-testid={props["data-testid"]}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? "Progress"}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-accent motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 motion-safe:ease-out"
          />
        </svg>
        <span className="font-heading absolute inset-0 flex items-center justify-center text-xl font-semibold tabular-nums text-foreground">
          {clamped}%
        </span>
      </div>
      {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
    </div>
  );
}
