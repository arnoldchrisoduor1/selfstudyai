import type { ReactNode } from "react";

import { cn } from "@self-study/ui/cn";

export interface RevealProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  "data-testid"?: string;
}

/** Mount fade + rise. Honors prefers-reduced-motion via globals. */
export function Reveal({ children, className, delayMs = 0, ...props }: RevealProps) {
  return (
    <div
      className={cn(
        "motion-safe:animate-[reveal-up_420ms_cubic-bezier(0.16,1,0.3,1)_both]",
        className,
      )}
      style={{ animationDelay: `${delayMs}ms` }}
      data-testid={props["data-testid"]}
    >
      {children}
    </div>
  );
}
