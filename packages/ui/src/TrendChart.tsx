import { useEffect, useId, useMemo, useState } from "react";

import { cn } from "./cn";

export interface TrendPoint {
  date: string;
  value: number;
}

export interface TrendChartProps {
  label: string;
  points: TrendPoint[];
  tone?: "accent" | "primary";
  embedded?: boolean;
  className?: string;
  "data-testid"?: string;
}

function smoothPath(coords: { x: number; y: number }[]): string {
  if (!coords.length) return "";
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i];
    const p1 = coords[i + 1];
    const mx = (p0.x + p1.x) / 2;
    d += ` C ${mx} ${p0.y}, ${mx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export function TrendChart({
  label,
  points,
  tone = "accent",
  embedded = false,
  className,
  ...props
}: TrendChartProps) {
  const gradId = useId().replace(/:/g, "");
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDrawn(true);
      return;
    }
    const id = window.requestAnimationFrame(() => setDrawn(true));
    return () => window.cancelAnimationFrame(id);
  }, [points]);

  const geometry = useMemo(() => {
    const width = 640;
    const height = 220;
    const padX = 16;
    const padY = 18;
    const values = points.map((p) => p.value);
    const min = values.length ? Math.min(...values) : 0;
    const max = values.length ? Math.max(...values) : 1;
    const span = max - min || 1;
    const coords = points.map((point, index) => {
      const x = padX + (index / Math.max(points.length - 1, 1)) * (width - padX * 2);
      const y = height - padY - ((point.value - min) / span) * (height - padY * 2);
      return { x, y };
    });
    const line = smoothPath(coords);
    const area = coords.length
      ? `${line} L ${coords[coords.length - 1].x} ${height - padY} L ${coords[0].x} ${height - padY} Z`
      : "";
    const grid = [0, 0.25, 0.5, 0.75, 1].map((t) => padY + t * (height - padY * 2));
    return { width, height, padY, coords, line, area, grid, latest: points[points.length - 1]?.value ?? 0 };
  }, [points]);

  const stroke = tone === "primary" ? "text-primary" : "text-accent";

  if (!points.length) {
    return (
      <div
        className={cn(
          "text-base text-muted-foreground",
          !embedded && "rounded-xl border border-border bg-card p-md",
          className,
        )}
        data-testid={props["data-testid"]}
      >
        No trend data.
      </div>
    );
  }

  const summary = `${label}: latest ${geometry.latest}`;

  return (
    <div
      className={cn(
        "flex flex-col gap-sm",
        !embedded &&
          "rounded-xl border border-border bg-card p-md shadow-sm transition-[box-shadow] duration-200 hover:shadow-md",
        className,
      )}
      data-testid={props["data-testid"]}
    >
      <div className="flex items-baseline justify-between gap-sm">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        <span className="font-heading text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {Number.isInteger(geometry.latest) ? geometry.latest : geometry.latest.toFixed(1)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${geometry.width} ${geometry.height}`}
        className="h-52 w-full"
        role="img"
        aria-label={summary}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.35" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {geometry.grid.map((y) => (
          <line
            key={y}
            x1={16}
            x2={geometry.width - 16}
            y1={y}
            y2={y}
            className="stroke-border"
            strokeWidth={1}
          />
        ))}
        <path
          d={geometry.area}
          fill={`url(#${gradId})`}
          className={cn(stroke, "transition-opacity duration-700", drawn ? "opacity-100" : "opacity-0")}
        />
        <path
          d={geometry.line}
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          strokeDasharray={1}
          strokeDashoffset={drawn ? 0 : 1}
          className={cn(
            stroke,
            "motion-safe:transition-[stroke-dashoffset] motion-safe:duration-[900ms] motion-safe:ease-out",
          )}
        />
        {geometry.coords.map((point, index) => {
          const last = index === geometry.coords.length - 1;
          return (
            <g key={`${point.x}-${point.y}`}>
              {last ? (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={8}
                  className={cn(stroke, "fill-current opacity-25 motion-safe:animate-ping")}
                />
              ) : null}
              <circle
                cx={point.x}
                cy={point.y}
                r={last ? 4.5 : 3}
                className={cn(
                  "fill-card stroke-current transition-opacity duration-500",
                  stroke,
                  drawn ? "opacity-100" : "opacity-0",
                )}
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>
      <span className="sr-only">{summary}</span>
    </div>
  );
}
