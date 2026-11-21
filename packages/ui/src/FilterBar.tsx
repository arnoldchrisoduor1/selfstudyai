import type { ReactNode } from "react";

import { cn } from "./cn";

export interface FilterBarProps {
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}

export function FilterBar({ children, className, ...props }: FilterBarProps) {
  return (
    <div
      data-testid={props["data-testid"]}
      className={cn("flex flex-wrap items-end gap-md", className)}
    >
      {children}
    </div>
  );
}
