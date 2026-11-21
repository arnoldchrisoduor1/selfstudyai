import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "./cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  interactive?: boolean;
}

export function Card({ children, interactive = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-md text-foreground",
        interactive && "transition-[border-color,box-shadow] duration-fast hover:shadow-md",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
