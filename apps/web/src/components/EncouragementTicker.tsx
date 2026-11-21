import { useEffect, useState } from "react";

import { cn } from "@self-study/ui/cn";

/** Phrases from design-system TopBar.md — do not invent new copy here. */
export const ENCOURAGEMENT_PHRASES = [
  "Small steps compound.",
  "One card at a time.",
  "Consistency beats intensity.",
  "Due cards wait for you.",
  "Keep the streak alive.",
  "Show up today.",
] as const;

export interface EncouragementTickerProps {
  className?: string;
  intervalMs?: number;
}

export function EncouragementTicker({ className, intervalMs = 5000 }: EncouragementTickerProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const id = window.setInterval(() => {
      setVisible(false);
      window.setTimeout(() => {
        setIndex((i) => (i + 1) % ENCOURAGEMENT_PHRASES.length);
        setVisible(true);
      }, 220);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs]);

  return (
    <p
      aria-live="polite"
      className={cn(
        "truncate text-center text-sm font-medium text-muted-foreground transition-all duration-200",
        visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
        className,
      )}
    >
      {ENCOURAGEMENT_PHRASES[index]}
    </p>
  );
}
