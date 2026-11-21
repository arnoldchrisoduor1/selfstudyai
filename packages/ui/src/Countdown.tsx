import { useEffect, useState } from "react";

import { cn } from "./cn";

export interface CountdownProps {
  /** Seconds remaining (advisory, from server). */
  secondsRemaining: number;
  className?: string;
  "data-testid"?: string;
}

function format(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Countdown({ secondsRemaining, className, ...props }: CountdownProps) {
  const [remaining, setRemaining] = useState(secondsRemaining);

  useEffect(() => {
    setRemaining(secondsRemaining);
  }, [secondsRemaining]);

  useEffect(() => {
    if (remaining <= 0) return;
    const id = window.setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(id);
  }, [remaining]);

  const urgent = remaining > 0 && remaining < 60;

  return (
    <p
      role="timer"
      aria-live="polite"
      className={cn(
        "font-mono text-xl font-semibold tabular-nums",
        urgent ? "text-destructive" : "text-foreground",
        className,
      )}
      data-testid={props["data-testid"]}
    >
      {format(remaining)}
    </p>
  );
}